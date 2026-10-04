"""Manual research intake. Capturing a URL never fetches it or verifies its contents."""
from datetime import datetime, timezone
import re
from urllib.parse import urlsplit
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator
from backend.workspace_schema import EvidenceState


def public_reference(value: str):
    parsed = HttpUrl(value.strip())
    if parsed.username or parsed.password:
        raise ValueError("Source links must not include credentials")
    return str(parsed)


def normalize_domain(value: str):
    parsed = urlsplit(value.strip() if "://" in value else "https://" + value.strip())
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Enter a company domain or HTTP website URL without credentials")
    if parsed.port is not None:
        raise ValueError("A company identity must use a domain without a port")
    domain = parsed.hostname.lower().rstrip(".").removeprefix("www.").encode("idna").decode()
    if "." not in domain or not re.fullmatch(r"[a-z0-9.-]+", domain) or any(not p or p.startswith("-") or p.endswith("-") for p in domain.split(".")):
        raise ValueError("Enter a valid company domain, for example company.com")
    return domain


class Intake(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class CompanyIntake(Intake):
    name: str = Field(min_length=1, max_length=160)
    domain: str = Field(min_length=3, max_length=300)
    geography: str = Field(min_length=1, max_length=80)
    sector: str = Field(min_length=1, max_length=80)
    stage: str = Field(min_length=1, max_length=50)
    founder_name: str = Field(min_length=1, max_length=160)
    founder_role: str = Field(default="Founder", min_length=1, max_length=100)
    previous_employer: str = Field(default="Not evidenced", max_length=160)
    profile_url: str | None = None
    description: str = Field(default="", max_length=2000)
    why_now: str = Field(default="", max_length=2000)
    illustrative: bool = False

    @field_validator("domain")
    @classmethod
    def domain_valid(cls, value):
        return normalize_domain(value)

    @field_validator("profile_url")
    @classmethod
    def profile_valid(cls, value):
        return public_reference(value) if value else None


class SourceCapture(Intake):
    title: str = Field(min_length=1, max_length=250)
    url: str = Field(min_length=1, max_length=2000)
    excerpt: str = Field(min_length=10, max_length=12000)
    captured_at: str
    method: str = Field(default="Public page, manually captured", min_length=1, max_length=150)
    claim_id: str | None = None
    statement: str = Field(default="", max_length=2000)
    topic: str = Field(default="other", pattern=r"^(company|founder|traction|market|other)$")
    state: EvidenceState = EvidenceState.reported
    question: str = Field(default="What independent evidence would validate or contradict this claim?", min_length=1, max_length=1000)
    confidence: int = Field(default=50, ge=0, le=100)
    relationship: str = Field(default="supports", pattern=r"^(supports|contradicts)$")
    reviewed: bool = False
    rationale: str = Field(default="", max_length=2000)
    calculation: str | None = Field(default=None, max_length=2000)

    @field_validator("url")
    @classmethod
    def url_valid(cls, value):
        return public_reference(value)

    @field_validator("captured_at")
    @classmethod
    def date_valid(cls, value):
        captured = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if captured.tzinfo is None:
            raise ValueError("Source capture time must include a timezone")
        if captured.timestamp() > datetime.now(timezone.utc).timestamp() + 300:
            raise ValueError("Source capture time cannot be in the future")
        return captured.isoformat()

    @model_validator(mode="after")
    def review_valid(self):
        if not self.claim_id and not self.statement.strip():
            raise ValueError("Enter a claim statement or select an existing claim")
        if not self.claim_id and self.state == EvidenceState.verified and (not self.reviewed or not self.rationale.strip()):
            raise ValueError("Verified evidence requires a named review confirmation and rationale")
        if not self.claim_id and self.state == EvidenceState.calculated and not self.calculation:
            raise ValueError("Calculated claims require visible inputs and a formula")
        return self


def empty_assumptions(owner, at):
    fields = [("pre_money", "Entry valuation", "USD"), ("check", "Initial investment", "USD"),
              ("dilution", "Subsequent dilution", "ratio"), ("follow_on", "Follow-on investment", "USD"),
              ("follow_on_post_money", "Follow-on post-money", "USD"), ("years", "Holding period", "years"),
              ("arr", "Year 5 ARR", "USD"), ("multiple", "Exit ARR multiple", "x")]
    return [{"id": key, "label": label, "unit": unit, "value": None, "source_id": None,
             "rationale": "Not entered. Record an explicit scenario assumption before modeling.", "owner": owner, "modified_at": at}
            for key, label, unit in fields]
