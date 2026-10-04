"""Human-reviewed observations and investment handoffs; no external execution."""
from datetime import date
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


def calendar(value):
    if date.fromisoformat(value).isoformat() != value:
        raise ValueError('Use an ISO calendar date')
    return value


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True, allow_inf_nan=False)


class SourceContext(Input):
    source_id: str = Field(min_length=1, max_length=100)
    published_on: str | None = None
    observed_on: str | None = None
    origin_source_id: str | None = None
    rights: Literal['Unknown', 'Private research', 'User supplied', 'Permission confirmed'] = 'Unknown'
    rights_note: str = Field(default='', max_length=2000)
    availability: Literal['Available', 'Unavailable'] = 'Available'

    @model_validator(mode='after')
    def dates(self):
        for value in (self.published_on, self.observed_on):
            if value: calendar(value)
        if self.rights == 'Permission confirmed' and len(self.rights_note) < 20:
            raise ValueError('Describe the permission and its scope')
        return self


class ObservationInput(Input):
    metric_id: str | None = Field(default=None, max_length=100)
    label: str = Field(min_length=2, max_length=120)
    definition: str = Field(min_length=10, max_length=2000)
    unit: str = Field(min_length=1, max_length=40)
    currency: str | None = Field(default=None, pattern=r'^[A-Z]{3}$')
    period_from: str
    period_to: str
    value: float = Field(ge=-1e15, le=1e15)
    expected: float | None = Field(default=None, ge=-1e15, le=1e15)
    source_id: str = Field(min_length=1, max_length=100)
    state: Literal['Founder-reported', 'Verified', 'Calculated'] = 'Founder-reported'
    rationale: str = Field(min_length=20, max_length=4000)
    calculation: str = Field(default='', max_length=2000)
    meeting_id: str | None = None

    @model_validator(mode='after')
    def valid_period(self):
        calendar(self.period_from); calendar(self.period_to)
        if self.period_from > self.period_to or self.period_to > date.today().isoformat():
            raise ValueError('Observed reporting periods must end today or earlier, after their start')
        if self.state == 'Calculated' and len(self.calculation) < 10:
            raise ValueError('Calculated observations need visible inputs and a formula')
        return self


class Observation(ObservationInput):
    id: str
    metric_id: str
    recorded_at: str
    recorded_by: str


class ConditionInput(Input):
    id: str | None = None
    title: str = Field(min_length=3, max_length=200)
    decision_id: str = Field(min_length=1, max_length=100)
    metric_id: str = Field(min_length=1, max_length=100)
    operator: Literal['lt', 'gt', 'lte', 'gte']
    threshold: float = Field(ge=-1e15, le=1e15)
    owner: str = Field(min_length=1, max_length=120)
    due_date: str
    rationale: str = Field(min_length=20, max_length=4000)
    status: Literal['Active', 'Resolved', 'Paused'] = 'Active'
    resolution: str = Field(default='', max_length=4000)
    source_ids: list[str] = Field(default_factory=list, max_length=30)

    @model_validator(mode='after')
    def valid_review(self):
        calendar(self.due_date)
        if len(set(self.source_ids)) != len(self.source_ids):
            raise ValueError('Use each source once')
        if self.status == 'Resolved' and (len(self.resolution) < 20 or not self.source_ids):
            raise ValueError('Resolving a condition requires a written review and source')
        if self.status == 'Paused' and len(self.resolution) < 20:
            raise ValueError('Explain why this review is paused')
        return self


class DecisionCondition(ConditionInput):
    id: str
    metric_definition: str
    metric_unit: str
    metric_currency: str | None = None
    baseline_observation_id: str | None = None
    acknowledged_at: str | None = None
    acknowledged_by: str | None = None
    updated_at: str
    updated_by: str
    evaluation_version: int = Field(default=1, ge=1)
    owner_identity: str | None = None


class AlertReviewInput(Input):
    condition_id: str
    observation_id: str
    classification: Literal['Incorrect', 'Irrelevant', 'Duplicate', 'Misleading', 'Reviewed']
    rationale: str = Field(min_length=20, max_length=4000)


class AlertReview(AlertReviewInput):
    id: str
    at: str
    author: str
    evaluation_version: int = Field(default=1, ge=1)


class ViewpointInput(Input):
    position: Literal['For', 'Against', 'Undecided']
    case: str = Field(min_length=20, max_length=4000)
    assumption: str = Field(min_length=20, max_length=4000)
    resolving_question: str = Field(min_length=10, max_length=2000)
    claim_ids: list[str] = Field(default_factory=list, max_length=30)
    memo_version: int | None = Field(default=None, ge=1)


class Viewpoint(ViewpointInput):
    id: str
    author: str
    at: str
    company_revision: int


class OpportunityInput(Input):
    id: str | None = None
    name: str = Field(min_length=3, max_length=160)
    round: str = Field(min_length=1, max_length=80)
    stage: Literal['Research', 'Diligence', 'IC review', 'Approved', 'Committed', 'Closed', 'Rejected'] = 'Research'
    rationale: str = Field(min_length=20, max_length=4000)
    approval_reference: str = Field(default='', max_length=2000)
    currency: str = Field(default='USD', pattern=r'^[A-Z]{3}$')
    invested: float | None = Field(default=None, gt=0, le=1e15)
    ownership: float | None = Field(default=None, gt=0, le=1)
    closed_on: str | None = None
    source_ids: list[str] = Field(default_factory=list, max_length=30)
    rejection_reason: Literal['No fit', 'Evidence concern', 'Price', 'Timing', 'No access', 'Lost allocation', 'Other'] | None = None

    @model_validator(mode='after')
    def stage_evidence(self):
        if len(set(self.source_ids)) != len(self.source_ids):
            raise ValueError('Use each opportunity source once')
        if self.stage in ('Approved', 'Committed', 'Closed') and (len(self.approval_reference) < 20 or not self.source_ids):
            raise ValueError('Record the external approval basis and captured source')
        if self.stage == 'Closed' and (self.invested is None or self.ownership is None or not self.closed_on):
            raise ValueError('Completed investment needs amount, ownership, date and documentary source')
        if self.stage != 'Closed' and any(v is not None for v in (self.invested,self.ownership,self.closed_on)):
            raise ValueError('Record completed amount, ownership and date only at the Closed stage')
        if self.closed_on:
            calendar(self.closed_on)
            if self.closed_on > date.today().isoformat(): raise ValueError('Completed investment cannot be future dated')
        if self.stage == 'Rejected' and not self.rejection_reason:
            raise ValueError('Distinguish the reason this opportunity was rejected')
        return self


class Opportunity(OpportunityInput):
    id: str
    updated_at: str
    updated_by: str


class AffiliationInput(Input):
    person_id: str
    company_name: str = Field(min_length=1, max_length=160)
    company_domain: str = Field(min_length=3, max_length=300)
    role: str = Field(min_length=1, max_length=160)
    started_on: str
    ended_on: str | None = None
    source_id: str
    rationale: str = Field(min_length=20, max_length=2000)

    @model_validator(mode='after')
    def period(self):
        calendar(self.started_on)
        if self.ended_on:
            calendar(self.ended_on)
            if self.ended_on < self.started_on: raise ValueError('Employment must end after it starts')
        from backend.workspace_intake import normalize_domain
        self.company_domain = normalize_domain(self.company_domain)
        return self


class Affiliation(AffiliationInput):
    id: str
    at: str
    author: str
