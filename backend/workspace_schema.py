"""Validated investment records. No untyped AI output is written to approved facts."""
from datetime import datetime, timezone
from enum import Enum
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator
from backend.workspace_workflows import Meeting
from backend.ecosystem_schema import Observation, DecisionCondition, AlertReview, Viewpoint, Opportunity, Affiliation
from backend.operating_model import OperatingProjection


def now():
    return datetime.now(timezone.utc).isoformat()


class EvidenceState(str, Enum):
    unreviewed = "Unreviewed"
    verified = "Verified"
    reported = "Founder-reported"
    calculated = "Calculated"
    inferred = "AI-inferred"
    missing = "Missing"
    conflicted = "Conflicted"


class Object(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str


class Person(Object):
    name: str
    role: str
    previous_employer: str
    profile_url: str | None = None
    confidence: int = Field(ge=0, le=100)
    affiliations: list[Affiliation] = Field(default_factory=list)


class Source(Object):
    title: str
    url: str | None = None
    file: str | None = None
    captured_at: str
    excerpt: str
    method: str
    illustrative: bool = True
    published_on: str | None = None
    observed_on: str | None = None
    origin_source_id: str | None = None
    rights: str = 'Unknown'
    rights_note: str = ''
    availability: str = 'Available'

    @model_validator(mode="after")
    def location_required(self):
        if not self.url and not self.file:
            raise ValueError("A source requires a URL or a file reference")
        if self.url and not self.url.startswith(("https://", "http://")):
            raise ValueError("Source URL must use HTTP or HTTPS")
        return self


class Evidence(Object):
    source_id: str
    claim_id: str
    confidence: int = Field(ge=0, le=100)
    reviewer: str | None = None
    last_reviewed_at: str | None = None


class Claim(Object):
    statement: str
    state: EvidenceState
    evidence_ids: list[str] = Field(default_factory=list)
    owner: str
    question: str
    material: bool = True
    topic: Literal["company", "founder", "traction", "market", "other"] = "other"
    calculation: str | None = None


class Assumption(Object):
    label: str
    value: float | None
    unit: str
    source_id: str | None
    rationale: str
    owner: str
    modified_at: str


class Interaction(Object):
    kind: str
    note: str
    actor: str
    at: str


Disposition = Literal["Pass", "Watch", "Progress to diligence", "Progress to partner", "Invest"]


class Decision(Object):
    disposition: Disposition
    rationale: str
    objections: str
    trigger: str
    author: str
    at: str
    model_version: int | None = None
    memo_version: int | None = None
    evidence_revision: int | None = None


class Metric(Object):
    label: str
    definition: str
    period: str
    value: float
    expected: float | None
    unit: str
    state: EvidenceState
    source_id: str


class Trigger(Object):
    label: str
    metric_id: str
    operator: Literal["lt", "gt", "gte", "lte"]
    threshold: float
    owner: str


class ReviewAction(Object):
    claim_id: str
    previous: EvidenceState
    current: EvidenceState
    rationale: str = ""
    previous_statement: str = ""
    current_statement: str = ""
    reviewer: str
    at: str


class AIRun(Object):
    task: str
    provider: str
    model: str
    source_ids: list[str]
    steps: list[str]
    draft: str
    status: Literal["Draft", "Approved", "Rejected"] = "Draft"
    created_at: str
    reviewed_by: str | None = None


class Risk(Object):
    title: str
    severity: Literal["High", "Medium", "Low"]
    claim_id: str
    question: str
    owner: str
    due_date: str
    status: Literal["Open", "Mitigated"] = "Open"
    rationale: str = ""
    outcome: str = ""
    source_ids: list[str] = Field(default_factory=list)
    updated_at: str | None = None
    updated_by: str | None = None


class RiskInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    id: str | None = Field(default=None, max_length=100)
    title: str = Field(min_length=3, max_length=200)
    severity: Literal["High", "Medium", "Low"]
    claim_id: str = Field(min_length=1, max_length=100)
    question: str = Field(min_length=10, max_length=2000)
    owner: str = Field(min_length=1, max_length=120)
    due_date: str
    rationale: str = Field(min_length=20, max_length=4000)
    status: Literal["Open", "Mitigated"] = "Open"
    outcome: str = Field(default="", max_length=4000)
    source_ids: list[str] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def valid_assessment(self):
        from datetime import date
        if date.fromisoformat(self.due_date).isoformat() != self.due_date:
            raise ValueError("Use an ISO calendar date for risk review")
        if len(set(self.source_ids)) != len(self.source_ids):
            raise ValueError("Use each risk source once")
        if self.status == "Mitigated" and (len(self.outcome) < 20 or not self.source_ids):
            raise ValueError("Mitigation needs an explanation and at least one captured source")
        return self


class DiligenceInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    id: str | None = None
    claim_id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=200)
    question: str = Field(min_length=1, max_length=2000)
    owner: str = Field(min_length=1, max_length=120)
    due_date: str
    priority: Literal["High", "Medium", "Low"] = "Medium"
    status: Literal["Open", "Blocked", "Complete"] = "Open"
    outcome: str = Field(default="", max_length=4000)
    source_ids: list[str] = Field(default_factory=list, max_length=50)
    decision_impact: str = Field(default='', max_length=2000)
    effort_hours: float | None = Field(default=None, gt=0, le=1000, allow_inf_nan=False)
    changed_view: Literal['Not assessed', 'Strengthened', 'Weakened', 'Unchanged', 'Changed decision'] = 'Not assessed'
    impact_rationale: str = Field(default='', max_length=4000)

    @model_validator(mode="after")
    def valid_work(self):
        from datetime import date
        if date.fromisoformat(self.due_date).isoformat() != self.due_date:
            raise ValueError("Use an ISO calendar date for diligence work")
        if len(set(self.source_ids)) != len(self.source_ids):
            raise ValueError("Use each outcome source once")
        if self.status == "Complete" and (not self.outcome or not self.source_ids):
            raise ValueError("Complete work needs an outcome and at least one captured source; keep unsupported work Open or Blocked")
        if self.status == "Blocked" and not self.outcome:
            raise ValueError("Explain what is blocking this work")
        if self.changed_view != 'Not assessed' and (self.status != 'Complete' or len(self.impact_rationale) < 20):
            raise ValueError('Assess decision impact only after completion, with a rationale of at least 20 characters')
        return self


class DiligenceTask(DiligenceInput):
    id: str
    updated_at: str
    updated_by: str
    completed_at: str | None = None
    completed_by: str | None = None


class MemoComment(Object):
    memo_version: int = Field(ge=1)
    note: str = Field(min_length=1, max_length=4000)
    author: str
    at: str


class Company(Object):
    name: str
    domain: str
    sector: str
    geography: str
    stage: str
    owner: str
    description: str
    why_now: str
    next_action: str
    disposition: Disposition | Literal["Unreviewed"] = "Watch"
    in_pipeline: bool = False
    watchlisted: bool = False
    portfolio: bool = False
    illustrative: bool = True
    signal_at: str
    founder_signal: str
    fit_score: int | None = Field(default=None, ge=0, le=100)
    fit_dimensions: dict[str, int]
    reason_codes: list[str]
    people: list[Person]
    sources: list[Source]
    evidence: list[Evidence]
    claims: list[Claim]
    assumptions: list[Assumption]
    interactions: list[Interaction] = Field(default_factory=list)
    decisions: list[Decision] = Field(default_factory=list)
    metrics: list[Metric] = Field(default_factory=list)
    triggers: list[Trigger] = Field(default_factory=list)
    reviews: list[ReviewAction] = Field(default_factory=list)
    ai_runs: list[AIRun] = Field(default_factory=list)
    risks: list[Risk] = Field(default_factory=list)
    diligence_tasks: list[DiligenceTask] = Field(default_factory=list)
    memo_comments: list[MemoComment] = Field(default_factory=list)
    meetings: list[Meeting] = Field(default_factory=list)
    observations: list[Observation] = Field(default_factory=list)
    conditions: list[DecisionCondition] = Field(default_factory=list)
    alert_reviews: list[AlertReview] = Field(default_factory=list)
    viewpoints: list[Viewpoint] = Field(default_factory=list)
    opportunities: list[Opportunity] = Field(default_factory=list)
    operating_models: list[OperatingProjection] = Field(default_factory=list)
    screening: str | None = None
    screening_created_at: str | None = None
    models: list[dict] = Field(default_factory=list)
    memos: list[dict] = Field(default_factory=list)

    @model_validator(mode="after")
    def provenance(self):
        if not self.people:
            raise ValueError("Company requires at least one person")
        for collection in (self.people, self.sources, self.evidence, self.claims, self.metrics, self.assumptions):
            if len({x.id for x in collection}) != len(collection):
                raise ValueError("Duplicate object IDs")
        sources = {x.id for x in self.sources}
        claims = {x.id: x for x in self.claims}
        evidence = {x.id: x for x in self.evidence}
        for item in self.evidence:
            if item.source_id not in sources or item.claim_id not in claims:
                raise ValueError("Evidence must reference an existing source and claim")
            if item.id not in claims[item.claim_id].evidence_ids:
                raise ValueError("Claim-to-evidence link must be reciprocal")
        for claim in self.claims:
            if any(e not in evidence or evidence[e].claim_id != claim.id for e in claim.evidence_ids):
                raise ValueError("Claim references unrelated evidence")
            if claim.state == EvidenceState.verified and not claim.evidence_ids:
                raise ValueError("Verified claims require evidence")
        if any(m.source_id not in sources for m in self.metrics):
            raise ValueError("Metrics require an existing source")
        for source in self.sources:
            seen = {source.id}
            parent = source.origin_source_id
            while parent:
                if parent not in sources or parent in seen:
                    raise ValueError('Source origins must belong to this company and cannot form a cycle')
                seen.add(parent)
                parent = next(s.origin_source_id for s in self.sources if s.id == parent)
        for collection in (self.observations, self.conditions, self.alert_reviews, self.viewpoints, self.opportunities):
            if len({v.id for v in collection}) != len(collection):
                raise ValueError('Duplicate ecosystem record IDs')
        metrics = {m.id for m in self.metrics}
        decisions = {d.id for d in self.decisions}
        if any(o.metric_id not in metrics or o.source_id not in sources or (o.meeting_id and o.meeting_id not in {m.id for m in self.meetings}) for o in self.observations):
            raise ValueError('Observations require owned metrics, sources and meetings')
        if any(c.metric_id not in metrics or c.decision_id not in decisions or any(s not in sources for s in c.source_ids) for c in self.conditions):
            raise ValueError('Conditions require owned decisions, metrics and sources')
        if any(r.condition_id not in {c.id for c in self.conditions} or r.observation_id not in {o.id for o in self.observations} for r in self.alert_reviews):
            raise ValueError('Alert reviews require owned conditions and observations')
        if any(any(s not in sources for s in o.source_ids) for o in self.opportunities):
            raise ValueError('Opportunity sources must belong to this company')
        if len({p.version for p in self.operating_models}) != len(self.operating_models) or any(any(s not in sources for s in p.source_ids) for p in self.operating_models):
            raise ValueError('Operating versions must be unique and use owned sources')
        if any(any(c not in claims for c in v.claim_ids) or (v.memo_version and v.memo_version not in {m['version'] for m in self.memos}) for v in self.viewpoints):
            raise ValueError('Viewpoints require owned claims and memo versions')
        if any(a.person_id != p.id or a.source_id not in sources for p in self.people for a in p.affiliations):
            raise ValueError('Employment history requires owned person and source')
        if any(a.source_id and a.source_id not in sources for a in self.assumptions):
            raise ValueError("Assumptions require an existing source")
        if len({r.id for r in self.risks}) != len(self.risks):
            raise ValueError("Risk IDs must be unique")
        if any(r.claim_id not in claims or any(s not in sources for s in r.source_ids) for r in self.risks):
            raise ValueError("Risks require this company's claims and sources")
        if any(t.metric_id not in {m.id for m in self.metrics} for t in self.triggers):
            raise ValueError("Triggers require an existing metric")
        if len({t.id for t in self.diligence_tasks}) != len(self.diligence_tasks):
            raise ValueError("Diligence task IDs must be unique")
        if any(t.claim_id not in claims or any(s not in sources for s in t.source_ids) for t in self.diligence_tasks):
            raise ValueError("Diligence work must link this company's claims and sources")
        if any(m.memo_version not in {v['version'] for v in self.memos} for m in self.memo_comments):
            raise ValueError("Comments require an existing frozen memo version")
        if len({m.id for m in self.meetings}) != len(self.meetings):
            raise ValueError("Meeting IDs must be unique")
        if any(any(c not in claims for c in m.claim_ids) or (m.memo_version is not None and m.memo_version not in {v['version'] for v in self.memos}) for m in self.meetings):
            raise ValueError("Meeting context must belong to this company")
        return self


class SearchFilters(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: str = Field(default="", max_length=500)
    geography: str = "All"
    stage: str = "All"
    sector: str = "All"
    role: str = "All"
    employer: str = "All"
    signal: str = "All"
    recency_days: int = Field(default=90, ge=1, le=3650)
    min_evidence: int = Field(default=0, ge=0, le=100)


class ModelInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pre_money: float = Field(gt=0, le=1e12)
    check: float = Field(gt=0, le=1e12)
    dilution: float = Field(ge=0, lt=1)
    follow_on: float = Field(ge=0, le=1e12)
    follow_on_post_money: float = Field(gt=0, le=1e12)
    years: int = Field(ge=1, le=20)
    arr: float = Field(gt=0, le=1e12)
    multiple: float = Field(gt=0, le=100)

    @model_validator(mode="after")
    def round_valid(self):
        if self.follow_on > self.follow_on_post_money:
            raise ValueError("Follow-on cannot exceed the round's post-money valuation")
        return self


def calculate_model(inputs: ModelInput):
    """Simplified equity exit; follow-on assumed at end of year 2. No fees/preferences."""
    initial = inputs.check / (inputs.pre_money + inputs.check)
    ownership = initial * (1 - inputs.dilution) + inputs.follow_on / inputs.follow_on_post_money
    if ownership > 1:
        raise ValueError("Resulting ownership exceeds 100%")
    exit_value = inputs.arr * inputs.multiple
    proceeds = exit_value * ownership
    cost = inputs.check + inputs.follow_on
    moic = proceeds / cost
    follow_year = min(2, inputs.years)
    # Conventional cash flows have one sign change. Find a bracket instead of
    # silently clipping valid high or near-total-loss returns to fixed limits.
    def npv(rate):
        return -inputs.check - inputs.follow_on / (1+rate)**follow_year + proceeds / (1+rate)**inputs.years
    if follow_year == inputs.years and proceeds <= inputs.follow_on:
        raise ValueError("IRR is undefined: exit proceeds do not cover the follow-on investment. Review the exit assumptions or holding period.")
    lo, hi = -1 + 1e-15, 1.0
    if npv(lo) <= 0:
        raise ValueError("IRR is too close to a total loss to calculate reliably. Review the scenario inputs.")
    while npv(hi) > 0:
        hi *= 2
    for _ in range(200):
        r = (lo + hi) / 2
        if npv(r) > 0:
            lo = r
        else:
            hi = r
    return {"initial_ownership": initial, "exit_ownership": ownership, "exit_value": exit_value,
            "proceeds": proceeds, "invested": cost, "moic": moic, "irr": (lo+hi)/2}
