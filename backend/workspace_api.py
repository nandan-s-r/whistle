"""Evidence-first workspace API, additive to the existing application."""
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4
from hashlib import sha256
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from backend.auth import get_current_user
from backend.workspace_repository import get_repository
from backend.workspace_schema import Company, SearchFilters, ModelInput, calculate_model, EvidenceState, Disposition, now, Decision, ReviewAction, AIRun, Interaction, Source, Claim, Evidence
from backend.workspace_intake import CompanyIntake, SourceCapture, empty_assumptions, normalize_domain
from backend.workspace_demo import demo_companies
from backend.workspace_provider import generate_draft, provider_status
from backend.budgets import ProviderBudget
from backend.workspace_artifacts import memo_text, research_hash, review_pack
from backend.workspace_schema import DiligenceInput, DiligenceTask, MemoComment, RiskInput, Risk
from backend.workspace_workflows import MeetingInput, Meeting, ProfileInput, MemoReasoning, AssumptionNote, profile_plan
from database.db import get_db
from database.models import User
from database.workspace import WorkspaceCompany, WorkspaceSearch, WorkspaceAudit, WorkspaceIdentity
from backend.ecosystem_schema import SourceContext, ObservationInput, ConditionInput, AlertReviewInput, ViewpointInput, OpportunityInput, AffiliationInput
from backend.ecosystem_workflows import apply_ecosystem, condition_state
from backend.operating_model import OperatingInput, OperatingProjection, operating_rows, METHOD
from backend.stored_records import stored_company, authorized_partition

router = APIRouter(prefix="/api/workspace", tags=["Investment workspace"])


def writer(user):
    if not user.is_active or user.role not in ("analyst", "partner", "admin"):
        raise HTTPException(403, "Your role can review records but cannot change this workspace.")


def record(repo, user, slug):
    row = repo.find(slug)
    if not row:
        raise HTTPException(404, "Company not found in your workspace.")
    return row


def public_record(row):
    company = stored_company(row)
    return {**company.model_dump(mode="json"), "revision": row.revision, "research_hash": research_hash(company),
            "condition_states": {c.id:condition_state(company,c) for c in company.conditions},
            "fund_record":getattr(row,'fund_record',False), "can_write":getattr(row,'can_write',True)}


def citations(company, claim):
    return " ".join(f"[{e.source_id}]" for e in company.evidence if e.claim_id == claim.id) or "[No evidence]"


def screening(company):
    verified = [c for c in company.claims if c.state == EvidenceState.verified]
    open_claims = [c for c in company.claims if c.state != EvidenceState.verified]
    return "\n\n".join([
        f"SCREENING BRIEF · {company.name}\n{'Illustrative scenario. ' if company.illustrative else ''}Cited template for analyst review; no AI investment recommendation.",
        f"THESIS FIT\n{company.sector} · {company.geography} · {company.stage}. " + (f"{company.fit_score}/100 is an illustrative fit rubric, not probability of success." if company.fit_score is not None else "Not scored. Assess thesis fit using reviewed sources."),
        f"COMPANY\n{company.description or 'No company summary entered.'} [User-entered summary; verify against the claim register]",
        f"FOUNDER\n{company.people[0].name}, {company.people[0].role}; prior {company.people[0].previous_employer}. [User-entered identity; see reviewed founder claims below]",
        f"WHY NOW\n{company.why_now or 'No why-now thesis entered.'} [Analyst hypothesis — needs validation]",
        "STRONGEST EVIDENCE\n" + ("\n".join(f"• {c.statement} {citations(company,c)}" for c in verified) or "No verified material claims yet. Inspect sources before forming conviction."),
        "TRACTION, RED FLAGS AND MISSING INFORMATION\n" + ("\n".join(f"• {c.statement} — {c.state.value} {citations(company,c)}" for c in open_claims) or "No unresolved claims recorded. Check coverage; this does not mean diligence is complete.") + ("\nNo traction claim captured. Revenue, retention, runway and valuation have not been established." if not any(c.topic == "traction" for c in company.claims) and not company.illustrative else ""),
        "MARKET VIEW\n" + ("\n".join(f"• {c.statement} {citations(company,c)}" for c in verified if c.topic == "market") or "Bottom-up market sizing and comparable customer budgets remain missing. Do not substitute an unsupported TAM."),
        "WEAKEST EVIDENCE\n" + (f"{open_claims[0].statement} — {open_claims[0].state.value} {citations(company,open_claims[0])}" if open_claims else "Customer economics and repeatability require a specific claim and source. [No evidence]"),
        f"DISPOSITION\nCurrent analyst decision: {company.disposition}. No decision is automatically selected.",
        f"NEXT QUESTION\n{open_claims[0].question if open_claims else 'What evidence would reverse the case?'}\nOwner: {company.owner}",
    ])


@router.post("/companies")
def create_company(payload: CompanyIntake, user: User = Depends(get_current_user), repo = Depends(get_repository)):
    writer(user)
    existing = next((r for r in authorized_partition(repo)[0]
                     if normalize_domain(r.data["domain"]) == payload.domain), None)
    if existing:
        return {"company": public_record(existing), "created": False}
    at = now()
    slug = "company-" + sha256(payload.domain.encode()).hexdigest()[:16]
    company = Company(
        id=slug, name=payload.name, domain=payload.domain, sector=payload.sector, geography=payload.geography,
        stage=payload.stage, owner=user.full_name, description=payload.description, why_now=payload.why_now,
        next_action="Capture a primary source and review founder identity and company claims.",
        illustrative=payload.illustrative, disposition="Unreviewed", signal_at=at, founder_signal="Manual intake", fit_score=None,
        fit_dimensions={}, reason_codes=["Manually captured record", "Identity and thesis fit need source review"],
        people=[{"id":"P01", "name":payload.founder_name, "role":payload.founder_role,
                 "previous_employer":payload.previous_employer or "Not evidenced", "profile_url":payload.profile_url, "confidence":0}],
        sources=[], evidence=[], claims=[], assumptions=empty_assumptions(user.full_name,at),
        interactions=[{"id":uuid4().hex[:12],"kind":"Company intake","note":"User-entered metadata; no facts or investment score automatically verified.","actor":user.full_name,"at":at}],
    )
    row, created = repo.create(company)
    return {"company":public_record(row),"created":created}


@router.post("/demo")
def initialize(user: User = Depends(get_current_user), repo = Depends(get_repository)):
    writer(user)
    for company in demo_companies(user.full_name):
        repo.create(company)
    if not any(s["name"] == "India · B2B · ex-MBB founders" for s in repo.searches()):
        repo.save_search("India · B2B · ex-MBB founders", SearchFilters(query="India B2B SaaS founders", geography="India", sector="B2B SaaS", employer="MBB", min_evidence=2).model_dump())
    return {"message": "Illustrative scenario ready. Existing company records are unchanged."}



@router.get("")
def workspace(user: User = Depends(get_current_user), repo = Depends(get_repository)):
    rows, quarantined = authorized_partition(repo)
    return {"companies": [public_record(r) for r in rows], "quarantined_records": quarantined,
            "searches": repo.searches(),
            "provider": provider_status(), "role": user.role,"actor_id":str(user.id)}


@router.post("/search")
def search(filters: SearchFilters, user: User = Depends(get_current_user), repo = Depends(get_repository)):
    rows, quarantined = authorized_partition(repo)
    results, excluded = [], []
    query = filters.query.lower()
    from backend.workspace_search import query_constraints,person_matches
    constraints,terms,interpreted=query_constraints(query)
    # Recognized thesis words map to explicit filters; arbitrary company/person keywords are searched literally.
    for row in rows:
        c = stored_company(row)
        person = c.people[0]
        reasons = []
        for key in ("geography", "stage", "sector"):
            value = getattr(filters, key)
            if value != "All" and getattr(c, key) != value:
                reasons.append(f"{key} differs")
        candidates=[p for p in c.people if person_matches(p,filters,constraints)]
        if not candidates: reasons.append("no recorded person matches role / prior employer")
        for key in ('geography','sector','stage'):
            if key in constraints and getattr(c,key) not in constraints[key]: reasons.append(f"query {key} differs")
        if filters.signal != "All" and c.founder_signal != filters.signal:
            reasons.append("founder signal differs")
        if len(c.sources) < filters.min_evidence:
            reasons.append("insufficient sources")
        age = (datetime.now(timezone.utc)-datetime.fromisoformat(c.signal_at)).days
        if age > filters.recency_days:
            reasons.append("signal outside recency window")
        if "india" in query and c.geography != "India":
            reasons.append("query geography differs")
        if "b2b" in query and c.sector != "B2B SaaS":
            reasons.append("query sector differs")
        haystack=f"{c.name} {c.description} {c.sector} "+' '.join(f'{p.name} {p.role} {p.previous_employer}' for p in candidates)
        if any(t not in haystack.casefold() for t in terms): reasons.append("query text does not match")
        (excluded if reasons else results).append({"id": c.id, "reasons": reasons} if reasons else public_record(row))
    seen = set()
    deduped = []
    for result in sorted(results, key=lambda r: r["fit_score"] if r["fit_score"] is not None else -1, reverse=True):
        identity = result["domain"].strip().lower()
        if identity not in seen:
            seen.add(identity)
            deduped.append(result)
    return {"results": deduped, "excluded": excluded, "quarantined_records": quarantined, "interpreted": interpreted, "literal_terms": terms, "method": "Deterministic filtering of your valid workspace records. Records needing repair are listed separately. No external search or crawling."}


class SavedSearch(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    filters: SearchFilters


@router.post("/searches")
def save_search(payload: SavedSearch, user: User = Depends(get_current_user), repo = Depends(get_repository)):
    writer(user)
    repo.save_search(payload.name, payload.filters.model_dump())
    return {"message":"Search saved"}


@router.get("/companies/{slug}/history")
def history(slug: str, user: User = Depends(get_current_user), repo = Depends(get_repository)):
    row = record(repo,user,slug)
    return repo.history(row)


@router.get('/companies/{slug}/decisions/{decision_id}/changes')
def decision_changes(slug: str, decision_id: str, user: User = Depends(get_current_user), repo = Depends(get_repository)):
    from backend.investment_memory import premise_changes
    row = record(repo,user,slug)
    company = stored_company(row)
    decision = next((d for d in company.decisions if d.id == decision_id),None)
    if not decision: raise HTTPException(404,'Decision not found in this company.')
    baseline = repo.revision_snapshot(row, decision.evidence_revision) if decision.evidence_revision else None
    if not baseline:
        return {'available':False,'decision':decision.model_dump(mode='json'),'revision':row.revision,
                'message':'The original evidence snapshot is unavailable. Current information cannot establish what was known then.','changes':[]}
    return {'available':True,'decision':decision.model_dump(mode='json'),'baseline_revision':decision.evidence_revision,
            'revision':row.revision,'changes':premise_changes(baseline, company.model_dump(mode='json')),
            'message':'Compare recorded premises. Later success or failure does not establish that this original decision was wrong.'}


class Action(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(ge=1)
    action: Literal["pipeline", "watchlist", "screen", "decision", "review", "model", "memo", "draft", "review_draft", "note", "capture_source", "diligence_task", "memo_comment", "meeting", "profile_capture", "memo_reasoning", "risk", "source_context", "observation", "condition", "acknowledge_condition", "alert_review", "viewpoint", "opportunity", "affiliation", "operating_projection"]
    operating: OperatingInput | None = None
    operating_version: int | None = Field(default=None, ge=1)
    source_context: SourceContext | None = None
    observation: ObservationInput | None = None
    condition: ConditionInput | None = None
    condition_id: str | None = None
    alert_review: AlertReviewInput | None = None
    viewpoint: ViewpointInput | None = None
    opportunity: OpportunityInput | None = None
    affiliation: AffiliationInput | None = None
    risk: RiskInput | None = None
    meeting: MeetingInput | None = None
    profile: ProfileInput | None = None
    reasoning: MemoReasoning | None = None
    diligence: DiligenceInput | None = None
    memo_version: int | None = Field(default=None, ge=1)
    capture: SourceCapture | None = None
    rationale: str = Field(default="", max_length=4000)
    note_kind: Literal['Analyst note', 'Founder response', 'Outbound contact'] = 'Analyst note'
    note_at: datetime | None = None
    objections: str = Field(default="", max_length=4000)
    trigger: str = Field(default="", max_length=1000)
    disposition: Disposition | None = None
    claim_id: str | None = None
    statement: str | None = Field(default=None, min_length=1, max_length=2000)
    state: EvidenceState | None = None
    inputs: ModelInput | None = None
    assumption_notes: dict[str, AssumptionNote] = Field(default_factory=dict, max_length=8)
    run_id: str | None = None
    approved: bool | None = None
    task: Literal["Challenge this claim", "Find the weakest assumption", "Draft customer-reference questions", "Identify conflicting evidence", "Explain what changed"] = "Challenge this claim"


@router.post("/companies/{slug}/actions")
def act(slug: str, payload: Action, user: User = Depends(get_current_user), repo = Depends(get_repository)):
    writer(user)
    row = record(repo,user,slug)
    if getattr(row,'can_write',True) is False:
        raise HTTPException(403,'You have read-only access to this fund record.')
    if row.revision != payload.revision:
        raise HTTPException(409, "This record changed. Refresh before applying your action.")
    previous = row.data
    company = stored_company(row)
    at = now()
    uid = uuid4().hex[:12]
    if apply_ecosystem(company, payload, user, at, row.revision):
        pass
    elif payload.action == "meeting":
        meeting = payload.meeting
        if not meeting or any(cid not in {c.id for c in company.claims} for cid in meeting.claim_ids) or (meeting.memo_version is not None and not any(m['version'] == meeting.memo_version for m in company.memos)):
            raise HTTPException(422, "Link the review to this company's claims and frozen memo.")
        old = next((m for m in company.meetings if m.id == meeting.id), None)
        if meeting.id and not old:
            raise HTTPException(404, "Meeting not found in this company.")
        item = Meeting(**{**meeting.model_dump(), "id":old.id if old else 'M'+uid,
                          "owner":user.full_name,"updated_at":at,"sequence":old.sequence+1 if old else 0})
        company.meetings = [item if m.id == item.id else m for m in company.meetings] if old else [*company.meetings,item]
        company.interactions.append(Interaction(id=uid, kind="Meeting " + item.status.lower(), note=f"{item.title}: {item.outcome or item.agenda}", actor=user.full_name, at=at))
    elif payload.action == "profile_capture":
        p = payload.profile
        if not p:
            raise HTTPException(422, "Enter the profile fields and the notes you have reviewed.")
        if any(s.url == p.profile_url and s.excerpt == p.excerpt for s in company.sources):
            raise HTTPException(409, "These profile notes are already captured. Inspect their existing evidence.")
        from backend.workspace_schema import Person
        person = next((x for x in company.people if x.profile_url == p.profile_url), None)
        # An unresolved name match never silently changes the existing identity.
        if not person:
            person = Person(id='P'+uid,name=p.name,role=p.role,previous_employer=p.previous_employer,profile_url=p.profile_url,confidence=0)
            company.people.append(person)
        elif person.name.casefold() != p.name.casefold():
            raise HTTPException(409, "The profile is linked to a different name. Resolve identity before capturing notes.")
        sid,eid,cid='S'+uid,'E'+uid,'C'+uid
        company.sources.append(Source(id=sid,title=f"Profile notes: {p.name}",url=p.profile_url,captured_at=at,excerpt=p.excerpt,method="User-entered profile notes; no automated access; identity and employment need review",illustrative=company.illustrative))
        company.claims.append(Claim(id=cid,statement=f"Reported profile: {p.name}, {p.role}; prior employer {p.previous_employer}.",state=EvidenceState.missing,evidence_ids=[eid],owner=user.full_name,question=p.question,topic="founder"))
        company.evidence.append(Evidence(id=eid,source_id=sid,claim_id=cid,confidence=0))
        company.interactions.append(Interaction(id=uid,kind="Profile capture",note=f"{person.id}: user-entered profile and source {sid}; employment not verified.",actor=user.full_name,at=at))
    elif payload.action == "memo_reasoning":
        original=next((m for m in company.memos if m['version'] == payload.memo_version),None)
        reasoning=payload.reasoning
        if not original or not reasoning:
            raise HTTPException(422,"Select a frozen memo and enter your investment reasoning.")
        import copy,re
        allowed={s['id'] for s in original['sources']}
        text='\n\n'.join([f"ANALYST JUDGMENT / {user.full_name}\n{reasoning.change_note}",f"WHY THE COMPANY CAN WIN / ANALYST VIEW\n{reasoning.why_win}",f"COUNTER-CASE / ANALYST VIEW\n{reasoning.counter_case}",f"REVERSAL CONDITION / ANALYST VIEW\n{reasoning.reversal}","JUDGMENT REFERENCES\n"+(' '.join(f'[{s}]' for s in reasoning.source_ids) or 'No source references selected. This is analyst judgment, not a verified factual claim.')])
        if len(reasoning.source_ids)!=len(set(reasoning.source_ids)) or not set(reasoning.source_ids).issubset(allowed) or not set(re.findall(r'\[(S[A-Za-z0-9]+)\]',text)).issubset(set(reasoning.source_ids)):
            raise HTTPException(422,"Cite only selected sources from this frozen memo.")
        edited=copy.deepcopy(original)
        edited.update(version=len(company.memos)+1,at=at,owner=user.full_name,parent_version=original['version'],reasoning=reasoning.model_dump())
        # Replace a previous judgment appendix when revising the revision, preserving original text.
        edited['text']=original['text'].split('\n\nANALYST JUDGMENT / ')[0]+'\n\n'+text
        company.memos.append(edited)
    elif payload.action == "pipeline":
        company.in_pipeline = True
    elif payload.action == "capture_source":
        capture = payload.capture
        if not capture:
            raise HTTPException(422, "Enter a source, excerpt and claim before capturing evidence.")
        if any(s.url == capture.url and s.excerpt == capture.excerpt for s in company.sources):
            raise HTTPException(409, "This exact source excerpt is already captured. Open its existing evidence instead.")
        claim = next((c for c in company.claims if c.id == capture.claim_id), None) if capture.claim_id else None
        if capture.claim_id and not claim:
            raise HTTPException(422, "The selected claim is unavailable in this company.")
        sid, eid = "S" + uid, "E" + uid
        company.sources.append(Source(id=sid,title=capture.title,url=capture.url,captured_at=capture.captured_at,
                                     excerpt=capture.excerpt,method=capture.method,illustrative=company.illustrative))
        if not claim:
            claim = Claim(id="C"+uid,statement=capture.statement,state=capture.state,owner=user.full_name,
                          question=capture.question,topic=capture.topic,calculation=capture.calculation)
            company.claims.append(claim)
            if capture.reviewed:
                company.reviews.append(ReviewAction(id="R"+uid,claim_id=claim.id,previous=EvidenceState.missing,
                    current=claim.state,rationale=capture.rationale,previous_statement="",current_statement=claim.statement,
                    reviewer=user.full_name,at=at))
        elif capture.relationship == "contradicts":
            company.reviews.append(ReviewAction(id="R"+uid,claim_id=claim.id,previous=claim.state,current=EvidenceState.conflicted,
                rationale="New contradicting source captured. " + capture.rationale,previous_statement=claim.statement,
                current_statement=claim.statement,reviewer=user.full_name,at=at))
            claim.state = EvidenceState.conflicted
        claim.evidence_ids.append(eid)
        company.evidence.append(Evidence(id=eid,source_id=sid,claim_id=claim.id,confidence=capture.confidence,
            reviewer=user.full_name if capture.reviewed else None,last_reviewed_at=at if capture.reviewed else None))
        company.interactions.append(Interaction(id="I"+uid,kind="Source capture",note=f"{sid} â†’ {claim.id}: {capture.title} ({capture.relationship}). Captured manually; no external fetch or automatic verification.",actor=user.full_name,at=at))
    elif payload.action == "watchlist":
        company.watchlisted = not company.watchlisted
    elif payload.action == "screen":
        company.screening = screening(company)
        company.screening_created_at = at
    elif payload.action == "decision":
        if not payload.disposition or not payload.rationale.strip() or not payload.trigger.strip():
            raise HTTPException(422, "A decision needs disposition, rationale and a revisit trigger.")
        memo = next((m for m in company.memos if m['version'] == payload.memo_version), None)
        if payload.memo_version and not memo:
            raise HTTPException(422, "Select an existing memo version from this company.")
        company.disposition = payload.disposition
        company.next_action = payload.trigger
        company.decisions.append(Decision(**{"id": uid, "disposition": payload.disposition, "rationale": payload.rationale, "objections": payload.objections, "trigger": payload.trigger, "author": user.full_name, "at": at, "model_version": memo['model_version'] if memo else len(company.models) or None, "memo_version":payload.memo_version, "evidence_revision":row.revision}))
    elif payload.action == "risk":
        assessment = payload.risk
        if not assessment or not any(c.id == assessment.claim_id for c in company.claims):
            raise HTTPException(422, "Link the risk to an existing claim in this company.")
        if not set(assessment.source_ids).issubset({s.id for s in company.sources}):
            raise HTTPException(422, "Risk sources must belong to this company.")
        old = next((r for r in company.risks if r.id == assessment.id), None)
        if assessment.id and not old:
            raise HTTPException(404, "Risk not found in this company.")
        item = Risk(**{**assessment.model_dump(), "id":old.id if old else "R"+uid, "updated_at":at, "updated_by":user.full_name})
        company.risks = [item if r.id == item.id else r for r in company.risks] if old else [*company.risks,item]
        company.interactions.append(Interaction(id=uid,kind="Risk assessment",note=f"{item.id}: {item.status}; {item.severity}. {item.rationale}",actor=user.full_name,at=at))
    elif payload.action == "diligence_task":
        work = payload.diligence
        if not work or not any(c.id == work.claim_id for c in company.claims):
            raise HTTPException(422, "Link diligence work to an existing claim in this company.")
        if any(s not in {source.id for source in company.sources} for s in work.source_ids):
            raise HTTPException(422, "Outcome sources must belong to this company.")
        old = next((t for t in company.diligence_tasks if t.id == work.id), None)
        if work.id and not old:
            raise HTTPException(404, "Diligence task not found in this company.")
        task = DiligenceTask(**{**work.model_dump(), "id":old.id if old else "T"+uid, "updated_at":at,"updated_by":user.full_name,
            "completed_at":(old.completed_at if old and old.status == "Complete" else at) if work.status == "Complete" else None,
            "completed_by":(old.completed_by if old and old.status == "Complete" else user.full_name) if work.status == "Complete" else None})
        company.diligence_tasks = [task if t.id == task.id else t for t in company.diligence_tasks] if old else [*company.diligence_tasks,task]
    elif payload.action == "memo_comment":
        if not payload.rationale.strip() or not any(m['version'] == payload.memo_version for m in company.memos):
            raise HTTPException(422, "Choose a frozen memo and enter a review comment.")
        company.memo_comments.append(MemoComment(id=uid,memo_version=payload.memo_version,note=payload.rationale.strip(),author=user.full_name,at=at))
    elif payload.action == "review":
        claim = next((c for c in company.claims if c.id == payload.claim_id), None)
        if not claim or payload.state is None:
            raise HTTPException(422, "Select an existing claim and evidence state.")
        if payload.state == EvidenceState.verified and (not claim.evidence_ids or not payload.rationale.strip()):
            raise HTTPException(422, "Verification needs evidence and an explicit review rationale resolving any conflict.")
        if payload.state == EvidenceState.calculated and not claim.calculation:
            raise HTTPException(422, "Capture visible inputs and a formula before marking a claim Calculated.")
        prior_statement = claim.statement
        if payload.statement is not None:
            claim.statement = payload.statement
        company.reviews.append(ReviewAction(**{"id": uid, "claim_id": claim.id, "previous": claim.state, "current": payload.state, "rationale": payload.rationale, "previous_statement": prior_statement, "current_statement": claim.statement, "reviewer": user.full_name, "at": at}))
        claim.state = payload.state
        for evidence in company.evidence:
            if evidence.claim_id == claim.id:
                evidence.reviewer = user.full_name
                evidence.last_reviewed_at = at
    elif payload.action == 'operating_projection':
        p = payload.operating
        if not p or not set(p.source_ids).issubset({s.id for s in company.sources}) or len(set(p.source_ids)) != len(p.source_ids):
            raise HTTPException(422, 'Choose distinct supporting sources from this company for the forecast basis.')
        try:
            rows = operating_rows(p)
        except ValueError as error:
            raise HTTPException(422, str(error))
        company.operating_models.append(OperatingProjection(**p.model_dump(),version=len(company.operating_models)+1,at=at,owner=user.full_name,rows=rows,
            sources=[s.model_dump() for s in company.sources if s.id in p.source_ids],method=METHOD))
    elif payload.action == "model":
        if not payload.inputs:
            raise HTTPException(422, "Provide validated model assumptions.")
        if any(key not in {a.id for a in company.assumptions} for key in payload.assumption_notes):
            raise HTTPException(422, "Choose assumptions from this company.")
        if any(note.source_id and note.source_id not in {s.id for s in company.sources} for note in payload.assumption_notes.values()):
            raise HTTPException(422, "Link assumption rationale to a captured source in this company.")
        inputs = payload.inputs.model_dump()
        projection = next((p for p in company.operating_models if p.version == payload.operating_version), None)
        if payload.operating_version and (not projection or projection.currency != 'USD' or len(projection.rows) != inputs['years'] or abs(projection.rows[-1]['arr']-inputs['arr'])>max(0.01,inputs['arr']*1e-10)):
            raise HTTPException(422, 'Link a USD forecast with the same horizon and terminal ARR. Other currencies require a separate, supported FX assumption.')
        try:
            scenarios = {}
            for name,factor,multiple in [("Downside", .5, .7), ("Base",1,1), ("Upside",1.5,1.3)]:
                try:
                    scenarios[name] = calculate_model(ModelInput(**{**inputs, "arr": inputs["arr"]*factor, "multiple": inputs["multiple"]*multiple}))
                except ValueError as error:
                    raise ValueError(f"{name} scenario: {error}") from error
            sensitivity = [[calculate_model(ModelInput(**{**inputs,"arr":inputs["arr"]*a,"multiple":inputs["multiple"]*m}))["moic"] for m in (.7,1,1.3)] for a in (.5,1,1.5)]
        except ValueError as e:
            raise HTTPException(422, str(e))
        for assumption in company.assumptions:
            if assumption.id in inputs:
                if assumption.id == 'arr': assumption.label = f"Year {inputs['years']} ARR"
                if assumption.value != inputs[assumption.id]:
                    assumption.source_id = None
                assumption.value = inputs[assumption.id]
                assumption.modified_at = at
                assumption.owner = user.full_name
                assumption.rationale = payload.rationale or "Analyst scenario input; requires validation"
                if note := payload.assumption_notes.get(assumption.id):
                    assumption.source_id = note.source_id
                    assumption.rationale = note.rationale
        company.models.append({"version": len(company.models)+1, "at": at, "owner": user.full_name, "inputs": inputs, "scenarios": scenarios, "sensitivity": sensitivity, "assumptions": [a.model_dump() for a in company.assumptions], "sources": [s.model_dump() for s in company.sources], "method": "Simplified equity model: aggregate dilution, incremental follow-on ownership, follow-on at year 2; no preferences, debt, fees or taxes."})
        if projection:
            company.models[-1]['operating_projection'] = projection.model_dump()
    elif payload.action == "memo":
        if not company.models and not (company.disposition == "Pass" and company.decisions):
            raise HTTPException(422, "Freeze a model before creating an IC memo, or record a reasoned Pass decision for an evidence-only memo.")
        approved = [c for c in company.claims if c.state == EvidenceState.verified]
        text = memo_text(company, row.revision)
        company.memos.append({"version": len(company.memos)+1, "at":at,"owner":user.full_name,"model_version":len(company.models) or None,"company_revision":row.revision,"research_hash":research_hash(company),"text":text,"sources":[s.model_dump() for s in company.sources],"claims":[c.model_dump(mode="json") for c in approved],"diligence_tasks":[t.model_dump() for t in company.diligence_tasks],"risks":[r.model_dump() for r in company.risks],"observations":[o.model_dump() for o in company.observations],"conditions":[c.model_dump() for c in company.conditions],"viewpoints":[v.model_dump() for v in company.viewpoints],"opportunities":[o.model_dump() for o in company.opportunities]})
    elif payload.action == "draft":
        try:
            status, draft, source_ids = generate_draft(payload.task,company,ProviderBudget(user))
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(502, "The configured model could not produce a valid cited draft. Approved facts were not changed. Retry or check the provider configuration.")
        company.ai_runs.append(AIRun(**{"id":uid,"task":payload.task,"provider":status["provider"],"model":status["model"],"source_ids":source_ids,"steps":["Inspect scoped evidence","Compare claims and contradictions","Draft falsifying questions"],"draft":draft,"status":"Draft","created_at":at}))
    elif payload.action == "review_draft":
        run = next((r for r in company.ai_runs if r.id == payload.run_id), None)
        if not run or payload.approved is None or run.status != "Draft":
            raise HTTPException(422, "Select a pending draft and an approval decision.")
        run.status = "Approved" if payload.approved else "Rejected"
        run.reviewed_by = user.full_name
        # Approval archives the draft as a note; claims are only changed through explicit evidence review.
        if payload.approved:
            company.interactions.append(Interaction(**{"id":uid,"kind":"Approved draft","note":run.draft,"actor":user.full_name,"at":at}))
    elif payload.action == "note":
        if not payload.rationale.strip():
            raise HTTPException(422,"Enter a note before saving.")
        occurred = payload.note_at
        if occurred is not None and (occurred.tzinfo is None or occurred.utcoffset() is None or occurred > datetime.now(timezone.utc)):
            raise HTTPException(422, 'Use the actual activity time, with a timezone, at or before now.')
        company.interactions.append(Interaction(**{"id":uid,"kind":payload.note_kind,"note":payload.rationale,"actor":user.full_name,"at":occurred.astimezone(timezone.utc).isoformat() if occurred else at}))
    try:
        company = Company.model_validate(company.model_dump(mode="json"))
    except ValueError as error:
        raise HTTPException(422, str(error)) from error
    data = company.model_dump(mode="json")
    repo.save(row, data, payload.revision, payload.action)
    from types import SimpleNamespace
    return public_record(SimpleNamespace(data=data,revision=payload.revision+1,
        fund_record=getattr(row,'fund_record',False),can_write=getattr(row,'can_write',True)))


@router.get("/companies/{slug}/review-pack")
def export_review_pack(slug:str,revision:int,memo_version:int|None=None,user:User=Depends(get_current_user),repo=Depends(get_repository)):
    row=record(repo,user,slug)
    if row.revision != revision:
        raise HTTPException(409,"Research changed. Refresh before downloading the review pack.")
    company=stored_company(row)
    memo=next((m for m in company.memos if m['version']==memo_version),None) if memo_version else None
    if memo_version and not memo: raise HTTPException(404,"Memo version not found in this company.")
    from fastapi.responses import Response
    return Response(review_pack(company,revision,memo),media_type="application/zip",headers={"Content-Disposition":f'attachment; filename="whistle-review-r{revision}.zip"',"Cache-Control":"private, no-store"})


@router.post("/companies/{slug}/profile-preview")
def preview_profile(slug: str, payload: ProfileInput, user: User = Depends(get_current_user), repo=Depends(get_repository)):
    company=stored_company(record(repo,user,slug))
    return profile_plan(payload,company)


@router.get("/companies/{slug}/deliverable")
def deliverable(slug: str, revision: int, format: Literal['pdf','pptx','xlsx','slides'], memo_version: int | None = None, model_version: int | None = None,
                user: User = Depends(get_current_user), repo=Depends(get_repository)):
    row=record(repo,user,slug)
    if revision!=row.revision: raise HTTPException(409,"Research changed. Refresh before preparing the deliverable.")
    company=stored_company(row)
    memo=next((m for m in company.memos if m['version']==memo_version),None)
    if memo_version is not None and memo is None: raise HTTPException(404,"Memo version not found in this company.")
    from backend.workspace_exports import presentation_content,presentation_pptx,memo_pdf,model_xlsx,selected_model
    from fastapi.responses import Response
    if format=='xlsx':
        model=selected_model(company,memo,model_version)
        if not model: raise HTTPException(422,"Freeze a financial model before exporting a workbook. An evidence-only Pass has no model.")
        if memo and model_version is not None and model_version!=memo['model_version']: raise HTTPException(422,"The selected memo must retain its own frozen model.")
        data=model_xlsx(company,model,memo['sources'] if memo else None)
        media='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        version=f'model-v{model["version"]}'
    else:
        if memo is None: raise HTTPException(422,"Select a frozen memo before preparing its PDF or presentation.")
        slides=presentation_content(company,revision,memo)
        if format in ('slides','pptx') and len(slides)>500: raise HTTPException(422,"This memo exceeds the presentation size limit. Prepare a shorter memo version.")
        if format=='slides': return {"memo_version":memo['version'],"model_version":memo['model_version'],"slides":slides,"method":"Structured local export of the selected frozen memo; no AI inference or external publishing"}
        data=memo_pdf(company,memo) if format=='pdf' else presentation_pptx(slides)
        media='application/pdf' if format=='pdf' else 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        version=f'memo-v{memo["version"]}'
    return Response(data,media_type=media,headers={'Content-Disposition':f'attachment; filename="whistle-{version}.{format}"','Cache-Control':'private, no-store'})


@router.get("/companies/{slug}/calendar")
def export_calendar(slug: str, meeting_id: str, revision: int, user: User = Depends(get_current_user), repo=Depends(get_repository)):
    row=record(repo,user,slug)
    if revision!=row.revision: raise HTTPException(409,"The meeting record changed. Refresh before downloading it.")
    company=stored_company(row)
    meeting=next((m for m in company.meetings if m.id==meeting_id),None)
    if not meeting: raise HTTPException(404,"Meeting not found in this company.")
    from backend.workspace_exports import calendar_ics
    from fastapi.responses import Response
    return Response(calendar_ics(company,meeting),media_type='text/calendar',headers={'Content-Disposition':'attachment; filename="whistle-review.ics"','Cache-Control':'private, no-store'})
