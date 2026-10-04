"""Authenticated sourcing previews and explicit, source-preserving company intake."""
from hashlib import sha256
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.auth import get_current_user
from backend.budgets import ProviderBudget, PublicDiscoveryBudget
from backend.deal_sourcing import SourcingRequest, SignalInput, source_run, verify_candidate, assess_signal, search_x
from backend.workspace_api import writer, public_record
from backend.workspace_intake import normalize_domain, empty_assumptions
from backend.workspace_repository import get_repository
from backend.workspace_schema import Company, Source, Claim, Evidence, Interaction, EvidenceState, now
from backend.industry_research import ResearchPrompt, research_run, research_capabilities
from backend.stored_records import authorized_partition

router = APIRouter(prefix='/api/workspace/sourcing', tags=['Deal sourcing'])


class Receipt(BaseModel):
    model_config = ConfigDict(extra='forbid')
    receipt: str = Field(min_length=20, max_length=25000)
    signature: str = Field(pattern=r'^[a-f0-9]{64}$')


class CandidateSave(Receipt):
    domain: str = Field(min_length=3, max_length=250)
    founder_name: str = Field(default='Not evidenced', min_length=1, max_length=160)
    signals: list[SignalInput] = Field(default_factory=list, max_length=10)
    permitted_to_retain: bool = False

    @field_validator('domain')
    @classmethod
    def domain_valid(cls, value):
        return normalize_domain(value)


@router.get('/preview')
def preview(user=Depends(get_current_user)):
    return source_run(SourcingRequest(), user.id, None, live=False)


@router.post('/run')
def run(payload: SourcingRequest, user=Depends(get_current_user)):
    writer(user)
    return source_run(payload, user.id, PublicDiscoveryBudget(user))


@router.post('/research')
def research(payload: ResearchPrompt, user=Depends(get_current_user)):
    writer(user)
    return research_run(payload, ProviderBudget(user), PublicDiscoveryBudget(user))


@router.get('/research/capabilities')
def research_sources(user=Depends(get_current_user)):
    return research_capabilities(user)


@router.post('/signals/assess')
def assess(payload: SignalInput, user=Depends(get_current_user)):
    try:
        return assess_signal(payload)
    except ValueError:
        raise HTTPException(422, 'Use a public HTTPS post link without credentials.')


@router.post('/signals/x')
def x_posts(payload: Receipt, user=Depends(get_current_user)):
    writer(user)
    candidate = verify_candidate(payload.receipt, payload.signature, user.id)
    return search_x(candidate, ProviderBudget(user))


@router.post('/save')
def save(payload: CandidateSave, user=Depends(get_current_user), repo=Depends(get_repository)):
    writer(user)
    candidate = verify_candidate(payload.receipt, payload.signature, user.id)
    domain = payload.domain
    if candidate['domain'] and domain != candidate['domain']:
        raise HTTPException(422, 'Use the company domain shown in this research result. A different company needs separate intake.')
    existing = next((row for row in authorized_partition(repo)[0] if normalize_domain(row.data['domain']) == domain), None)
    if existing:
        # Existing research is authoritative. Never overwrite it from a sourcing result.
        return {'company': public_record(existing), 'created': False, 'message': 'Already saved. Open the existing evidence; its records were preserved.'}
    at = now()
    sources, claims, evidence = [], [], []
    for index, item in enumerate(candidate['sources']):
        sid, cid, eid = f'SRC{index + 1}', f'CLM{index + 1}', f'EVD{index + 1}'
        sources.append(Source(id=sid, title=item['title'], url=item['url'], excerpt=item['excerpt'],
                              captured_at=candidate['captured_at'], published_on=item.get('published_on'),
                              method=candidate['origin'], illustrative=False, rights='Unknown',
                              rights_note='Selected public research reference; customer-facing redistribution rights have not been established. ' + item['relationship']))
        claims.append(Claim(id=cid, statement='Research note to verify: ' + item['excerpt'], state=EvidenceState.unreviewed,
                            evidence_ids=[eid], owner=user.full_name, topic='company',
                            question='Check the original source and independent customer evidence before approving this statement.'))
        evidence.append(Evidence(id=eid, source_id=sid, claim_id=cid, confidence=0))
    if payload.signals and not payload.permitted_to_retain:
        raise HTTPException(422, 'Confirm permission to retain the selected post excerpts before saving them.')
    seen = set()
    for index, item in enumerate(payload.signals):
        try:
            signal = assess_signal(item)
        except ValueError:
            raise HTTPException(422, 'Use public HTTPS references for customer signals.')
        if signal['duplicate_key'] in seen:
            continue
        seen.add(signal['duplicate_key'])
        sid, cid, eid = f'SOC{index + 1}', f'SCL{index + 1}', f'SEV{index + 1}'
        sources.append(Source(id=sid, title=candidate['name'] + ' · ' + signal['category'], url=signal['url'],
                              excerpt=signal['excerpt'], captured_at=at, method='User-selected social excerpt',
                              illustrative=False, rights='User supplied', rights_note='User confirmed permission to retain this excerpt. Author relationship: ' + signal['relationship'] + '. Independence not established.'))
        claims.append(Claim(id=cid, statement='Unverified social statement: ' + signal['excerpt'], state=EvidenceState.unreviewed,
                            evidence_ids=[eid], owner=user.full_name, topic='traction', question=signal['question']))
        evidence.append(Evidence(id=eid, source_id=sid, claim_id=cid, confidence=0))
    company = Company(id='company-' + sha256(domain.encode()).hexdigest()[:16], name=candidate['name'], domain=domain,
                      sector=candidate['focus'], geography='Not evidenced', stage='Not evidenced', owner=user.full_name,
                      description=candidate['summary'], why_now='', next_action=candidate['gaps'][0], disposition='Unreviewed',
                      illustrative=False, signal_at=candidate['captured_at'], founder_signal='Source-backed sourcing draft',
                      fit_score=None, fit_dimensions={}, reason_codes=candidate['reasons'],
                      people=[{'id': 'P01', 'name': payload.founder_name, 'role': 'Not evidenced', 'previous_employer': 'Not evidenced', 'confidence': 0}],
                      sources=sources, claims=claims, evidence=evidence, assumptions=empty_assumptions(user.full_name, at),
                      interactions=[Interaction(id=uuid4().hex[:12], kind='Sourcing intake', actor=user.full_name, at=at,
                                                note='User selected a source-backed candidate. Metadata and notes require review; no investment recommendation or customer verification.')])
    row, created = repo.create(company)
    return {'company': public_record(row), 'created': created, 'message': 'Saved to research. Review its sources before adding it to Pipeline.'}
