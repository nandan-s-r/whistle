"""Additive, owner-isolated tables; existing Startup and Founder records are untouched."""
from sqlalchemy import Column, Integer, String, JSON, ForeignKey, UniqueConstraint
from database.models import Base


class WorkspaceCompany(Base):
    __tablename__ = "workspace_companies"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    slug = Column(String, nullable=False)
    revision = Column(Integer, nullable=False, default=1)
    data = Column(JSON, nullable=False)
    __table_args__ = (UniqueConstraint("user_id", "slug"),)


class WorkspaceSearch(Base):
    __tablename__ = "workspace_searches"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    filters = Column(JSON, nullable=False)


class WorkspaceAudit(Base):
    __tablename__ = "workspace_audit"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("workspace_companies.id"), nullable=False, index=True)
    actor = Column(String, nullable=False)
    action = Column(String, nullable=False)
    at = Column(String, nullable=False)
    previous_revision = Column(Integer, nullable=False)
    revision = Column(Integer, nullable=False)
    snapshot = Column(JSON, nullable=False)


class WorkspaceIdentity(Base):
    """Database uniqueness protects simultaneous intake of the same canonical domain."""
    __tablename__ = "workspace_identities"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    domain = Column(String, nullable=False)
    company_id = Column(Integer, ForeignKey("workspace_companies.id"), nullable=False)
    __table_args__ = (UniqueConstraint("user_id", "domain"),)
