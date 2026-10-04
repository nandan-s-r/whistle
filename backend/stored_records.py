"""Contain malformed authorized records without suppressing infrastructure or access errors."""
from fastapi import HTTPException
from datetime import datetime
import json
from pydantic import BaseModel, ConfigDict, Field
from backend.workspace_schema import Company, Source, Claim, Assumption, ModelInput
from backend.workspace_intake import normalize_domain
from backend.workspace_workflows import MemoReasoning


class Snapshot(BaseModel):
    model_config = ConfigDict(extra='allow', allow_inf_nan=False, strict=True)
    version: int = Field(ge=1)
    at: str
    owner: str


class Returns(BaseModel):
    model_config = ConfigDict(extra='allow', allow_inf_nan=False, strict=True)
    initial_ownership: float
    exit_ownership: float
    exit_value: float
    proceeds: float
    invested: float
    moic: float
    irr: float


class ModelSnapshot(Snapshot):
    inputs: ModelInput
    scenarios: dict[str, Returns]
    sensitivity: list[list[float]]
    assumptions: list[Assumption] = Field(default_factory=list)
    # Historical models may lack a source snapshot; existing export fallback remains.
    sources: list[Source] | None = None
    method: str


class MemoSnapshot(Snapshot):
    model_version: int | None
    company_revision: int = Field(ge=1)
    text: str
    sources: list[Source]
    claims: list[Claim]
    reasoning: MemoReasoning | None = None


def stored_company(row):
    try:
        company = Company.model_validate(row.data)
        normalize_domain(company.domain)
        if datetime.fromisoformat(company.signal_at).tzinfo is None:
            raise ValueError('Signal time requires timezone')
        for model in company.models:
            ModelSnapshot.model_validate(model)
        for memo in company.memos:
            MemoSnapshot.model_validate(memo)
        # Postgres JSON can contain strings that Pydantic coerces into NaN/Inf.
        # Validate the actual outbound representation before accepting the row.
        json.dumps(company.model_dump(mode='json'), allow_nan=False)
        return company
    except (ValueError, KeyError, TypeError, IndexError, AttributeError):
        # Never reflect malformed contents, parser errors or validation inputs.
        raise HTTPException(409, 'This saved record needs repair. Ask its owner or fund administrator to restore valid data from its history; other records remain available.') from None


def authorized_partition(repo):
    valid, quarantined = [], []
    for row in repo.companies():
        try:
            stored_company(row)
            valid.append(row)
        except HTTPException as error:
            if error.status_code != 409:
                raise
            quarantined.append({'id': row.slug, 'revision': row.revision,
                                'fund_record': getattr(row, 'fund_record', False),
                                'reason': 'Saved record validation failed; repair required.'})
    return valid, quarantined
