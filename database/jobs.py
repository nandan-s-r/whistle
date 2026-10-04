from sqlalchemy import Column, String, Integer, JSON, Boolean
from database.models import Base


class WorkspaceJob(Base):
    __tablename__ = "workspace_jobs"
    id = Column(String, primary_key=True)
    owner_id = Column(Integer, nullable=False, index=True)
    company_id = Column(String, nullable=False)
    company_revision = Column(Integer, nullable=False)
    kind = Column(String, nullable=False)
    state = Column(String, nullable=False, default="Queued")
    payload = Column(JSON, nullable=False)
    result = Column(JSON)
    error = Column(String)
    cancelled = Column(Boolean, nullable=False, default=False)
    attempts = Column(Integer, nullable=False, default=0)
    lease_until = Column(String)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)
