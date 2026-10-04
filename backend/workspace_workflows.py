"""Bounded, supervised research and meeting inputs; no network or outreach."""
from datetime import datetime, timezone
from typing import Literal
from urllib.parse import urlsplit, urlunsplit
from pydantic import BaseModel, ConfigDict, Field, model_validator


class MeetingInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    id: str | None = Field(default=None, max_length=100)
    title: str = Field(min_length=1, max_length=160)
    kind: Literal["Founder call", "Customer reference", "Partner review", "Investment committee", "Follow-up"]
    starts_at: datetime
    duration_minutes: int = Field(default=30, ge=15, le=240)
    location: str = Field(default="", max_length=300)
    agenda: str = Field(min_length=1, max_length=4000)
    claim_ids: list[str] = Field(default_factory=list, max_length=30)
    memo_version: int | None = Field(default=None, ge=1)
    status: Literal["Planned", "Complete", "Cancelled"] = "Planned"
    outcome: str = Field(default="", max_length=4000)

    @model_validator(mode="after")
    def valid_time(self):
        if self.starts_at.tzinfo is None or self.starts_at.utcoffset() is None:
            raise ValueError("Meeting time must include a timezone")
        self.starts_at = self.starts_at.astimezone(timezone.utc)
        if len(self.claim_ids) != len(set(self.claim_ids)):
            raise ValueError("Select each claim once")
        if self.status == "Complete" and not self.outcome:
            raise ValueError("Record the outcome before completing a meeting")
        return self


class Meeting(MeetingInput):
    id: str
    owner: str
    updated_at: str
    sequence: int = Field(default=0, ge=0)


class ProfileInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=120)
    role: str = Field(min_length=1, max_length=160)
    previous_employer: str = Field(default="Not evidenced", min_length=1, max_length=160)
    profile_url: str = Field(min_length=1, max_length=500)
    excerpt: str = Field(min_length=20, max_length=4000)
    question: str = Field(min_length=1, max_length=1000)

    @model_validator(mode="after")
    def profile_link(self):
        p = urlsplit(self.profile_url)
        if p.scheme != "https" or p.hostname not in ("linkedin.com", "www.linkedin.com") or p.username or p.password or p.port not in (None, 443) or not p.path.startswith("/in/") or not p.path[4:].strip("/"):
            raise ValueError("Use a public HTTPS LinkedIn /in/ profile URL")
        self.profile_url = urlunsplit(("https", "www.linkedin.com", p.path.rstrip("/"), "", ""))
        return self


class MemoReasoning(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    why_win: str = Field(min_length=20, max_length=4000)
    counter_case: str = Field(min_length=20, max_length=4000)
    reversal: str = Field(min_length=10, max_length=2000)
    source_ids: list[str] = Field(default_factory=list, max_length=50)
    change_note: str = Field(min_length=5, max_length=500)


class AssumptionNote(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    rationale: str = Field(min_length=10, max_length=1000)
    source_id: str | None = Field(default=None, max_length=100)


def profile_plan(payload, company):
    """A review checklist from entered fields, explicitly not inferred facts."""
    existing = next((p for p in company.people if p.profile_url == payload.profile_url), None)
    return {"method": "Rules-based review checklist; no LinkedIn access or model inference",
            "identity_match": existing.id if existing else None,
            "profile": payload.model_dump(),
            "steps": ["Compare this identity with the company website", "Confirm role and employment dates in a second source", "Capture a primary-source venture announcement", "Review the evidence state before using the founder in a thesis"],
            "questions": [payload.question, f"What dated primary source confirms {payload.name}'s role at {company.name}?", f"What evidence supports the reported prior employer, {payload.previous_employer}?"],
            "writes": "Saving captures user-entered notes and a Missing claim for review; it does not verify employment."}
