"""Organization-owned copies are separate from personal research records."""
from sqlalchemy import Column, String, Integer, Boolean, JSON, ForeignKey, UniqueConstraint
from database.models import Base


class Fund(Base):
    __tablename__='workspace_funds'
    id=Column(String,primary_key=True)
    name=Column(String,nullable=False)
    created_at=Column(String,nullable=False)


class FundMember(Base):
    __tablename__='workspace_fund_members'
    id=Column(Integer,primary_key=True)
    fund_id=Column(String,ForeignKey('workspace_funds.id'),nullable=False,index=True)
    user_id=Column(Integer,ForeignKey('users.id'),nullable=False,index=True)
    role=Column(String,nullable=False)
    active=Column(Boolean,nullable=False,default=True)
    __table_args__=(UniqueConstraint('fund_id','user_id'),)


class FundCompany(Base):
    __tablename__='workspace_fund_companies'
    id=Column(String,primary_key=True)
    fund_id=Column(String,ForeignKey('workspace_funds.id'),nullable=False,index=True)
    slug=Column(String,nullable=False,unique=True)
    revision=Column(Integer,nullable=False)
    data=Column(JSON,nullable=False)


class FundGrant(Base):
    __tablename__='workspace_fund_grants'
    id=Column(Integer,primary_key=True)
    company_id=Column(String,ForeignKey('workspace_fund_companies.id'),nullable=False,index=True)
    member_id=Column(Integer,ForeignKey('workspace_fund_members.id'),nullable=False,index=True)
    role=Column(String,nullable=False)
    __table_args__=(UniqueConstraint('company_id','member_id'),)


class FundAudit(Base):
    __tablename__='workspace_fund_audit'
    id=Column(Integer,primary_key=True)
    company_id=Column(String,ForeignKey('workspace_fund_companies.id'),nullable=False,index=True)
    actor=Column(String,nullable=False)
    actor_id=Column(String,nullable=False)
    action=Column(String,nullable=False)
    at=Column(String,nullable=False)
    previous_revision=Column(Integer,nullable=False)
    revision=Column(Integer,nullable=False)
    snapshot=Column(JSON,nullable=False)


class FundAccessAudit(Base):
    __tablename__='workspace_fund_access_audit'
    id=Column(Integer,primary_key=True)
    fund_id=Column(String,ForeignKey('workspace_funds.id'),nullable=False,index=True)
    actor_id=Column(String,nullable=False)
    action=Column(String,nullable=False)
    detail=Column(JSON,nullable=False)
    at=Column(String,nullable=False)
