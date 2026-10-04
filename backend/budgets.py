"""Durable, atomic admission and provider allowances shared by all workers."""
from time import time
import os
from sqlalchemy import Column, Integer, String, text
from fastapi import HTTPException
from database.models import Base
from database.db import SessionLocal
from backend.supabase_gateway import Gateway


class WorkAllowance(Base):
    __tablename__ = 'workspace_work_allowances'
    bucket = Column(String, primary_key=True)
    window_start = Column(Integer, nullable=False)
    used = Column(Integer, nullable=False)


def reserve_local(db, owner, category):
    if owner is None:
        raise HTTPException(503, 'An authenticated work owner is required.')
    at = int(time())
    # Global row comes first: concurrent processes serialize admission/count/insert.
    for subject, period, limit in (('global',60,60),('global',86400,1000),('owner:'+str(owner),60,10),('owner:'+str(owner),86400,100)):
        bucket = category+':'+subject+':'+str(period)
        start = at // period * period
        row = db.execute(text('''INSERT INTO workspace_work_allowances (bucket, window_start, used)
            VALUES (:bucket,:start,1) ON CONFLICT (bucket) DO UPDATE SET
            window_start=CASE WHEN workspace_work_allowances.window_start>excluded.window_start THEN workspace_work_allowances.window_start ELSE excluded.window_start END,
            used=CASE WHEN workspace_work_allowances.window_start>=excluded.window_start
                THEN workspace_work_allowances.used+1 ELSE 1 END
            WHERE workspace_work_allowances.window_start<excluded.window_start
                OR workspace_work_allowances.used<:limit RETURNING used'''),
            {'bucket':bucket,'start':start,'limit':limit}).first()
        if not row:
            raise HTTPException(429, 'The work allowance is used up. Retry after the current limit resets.')


class ProviderBudget:
    def __init__(self, user=None, *, owner=None, gateway=None):
        self.owner = owner if owner is not None else getattr(user,'id',None)
        self.gateway = gateway or (Gateway(user.supabase_token) if getattr(user,'supabase_token',None) else None)

    def reserve(self):
        if self.owner is None:
            raise HTTPException(503, 'An authenticated work owner is required.')
        if self.gateway:
            self.gateway.request('POST','/rest/v1/rpc/vc_reserve_provider_call',data={'for_owner':str(self.owner)})
        else:
            if os.getenv('AUTH_PROVIDER')=='hybrid':
                raise HTTPException(422,'Sign in with Supabase for provider work in the hybrid workspace. Local research remains available through rules-based templates.')
            with SessionLocal() as db:
                reserve_local(db,self.owner,'provider')
                db.commit()


def reserve_provider(budget):
    if budget is None:
        raise HTTPException(503, 'Provider work requires an authenticated allowance.')
    budget.reserve()


class PublicDiscoveryBudget(ProviderBudget):
    """Rate-limit the fixed public feed; it uses no private provider credentials."""
    def reserve(self):
        if self.gateway:
            return super().reserve()
        with SessionLocal() as db:
            reserve_local(db, self.owner, 'public_discovery')
            db.commit()
