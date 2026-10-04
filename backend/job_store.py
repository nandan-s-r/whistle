"""Persistent job state, leases, cancellation, and bounded retries."""
import os
from datetime import datetime,timedelta,timezone
from uuid import uuid4
from sqlalchemy import update,or_,and_
from database.db import SessionLocal
from database.jobs import WorkspaceJob
from backend.supabase_gateway import Gateway
from backend.workspace_schema import now
from backend.budgets import reserve_local
from fastapi import HTTPException

FIELDS=('id','owner_id','company_id','company_revision','kind','state','payload','result','error','cancelled','attempts','lease_until','created_at','updated_at')


class JobStore:
    def __init__(self,user=None,worker=False):
        self.user=user
        self.cloud=bool(getattr(user,'supabase_token',None)) or (worker and os.getenv('JOB_DATABASE')=='supabase')
        self.gateway=Gateway(os.environ['SUPABASE_SERVICE_ROLE_KEY'] if worker and self.cloud else getattr(user,'supabase_token','')) if self.cloud else None

    def list(self):
        if self.cloud:
            return self.gateway.request('GET','/rest/v1/vc_jobs',params={'select':'*','order':'created_at.desc','limit':30})
        with SessionLocal() as db:
            return [{k:getattr(r,k) for k in FIELDS} for r in db.query(WorkspaceJob).filter_by(owner_id=self.user.id).order_by(WorkspaceJob.created_at.desc()).limit(30)]

    def get(self,jid):
        if self.cloud:
            rows=self.gateway.request('GET','/rest/v1/vc_jobs',params={'id':'eq.'+jid,'select':'*','limit':1})
            return rows[0] if rows else None
        with SessionLocal() as db:
            query=db.query(WorkspaceJob).filter_by(id=jid)
            if self.user: query=query.filter_by(owner_id=self.user.id)
            r=query.first()
            return {k:getattr(r,k) for k in FIELDS} if r else None

    def create(self,company,kind,payload):
        data={'owner_id':self.user.id,'company_id':company.id if self.cloud else company.slug,
              'company_revision':company.revision,'kind':kind,'payload':payload}
        if self.cloud:
            return self.gateway.request('POST','/rest/v1/vc_jobs',data=data,headers={'Prefer':'return=representation'})[0]
        at=now()
        with SessionLocal() as db:
            reserve_local(db,self.user.id,'job')
            if db.query(WorkspaceJob).filter_by(owner_id=self.user.id).filter(WorkspaceJob.state.in_(('Queued','Running'))).count()>=5 or db.query(WorkspaceJob).filter(WorkspaceJob.state.in_(('Queued','Running'))).count()>=100:
                raise HTTPException(429,'Finish or cancel pending tasks before queuing more work.')
            r=WorkspaceJob(id=str(uuid4()),**data,state='Queued',cancelled=False,attempts=0,created_at=at,updated_at=at)
            db.add(r);db.commit()
            return {k:getattr(r,k) for k in FIELDS}

    def change(self,jid,values,expected=None,attempt=None):
        if self.cloud:
            params={'id':'eq.'+jid}
            if expected: params['state']='eq.'+expected
            if attempt is not None: params['attempts']='eq.'+str(attempt)
            return bool(self.gateway.request('PATCH','/rest/v1/vc_jobs',params=params,data=values,headers={'Prefer':'return=representation'}))
        with SessionLocal() as db:
            query=update(WorkspaceJob).where(WorkspaceJob.id==jid)
            if self.user: query=query.where(WorkspaceJob.owner_id==self.user.id)
            if expected: query=query.where(WorkspaceJob.state==expected)
            if attempt is not None: query=query.where(WorkspaceJob.attempts==attempt)
            result=db.execute(query.values(**values));db.commit()
            return result.rowcount==1

    def claim(self,jid):
        row=self.get(jid)
        if not row or row['state'] in ('Succeeded','Failed','Cancelled'): return None
        if row['lease_until'] and datetime.fromisoformat(row['lease_until'].replace('Z','+00:00'))>datetime.now(timezone.utc): return None
        if row['state']=='Running' and row['attempts']>=3:
            self.change(jid,{'state':'Failed','error':'Worker recovery limit reached. Retry this task from the current company record.','updated_at':now(),'lease_until':None},row['state'],row['attempts'])
            return None
        if row['cancelled']:
            self.change(jid,{'state':'Cancelled','updated_at':now()},row['state']);return None
        values={'state':'Running','attempts':row['attempts']+1,'updated_at':now(),'error':None,
                'lease_until':(datetime.now(timezone.utc)+timedelta(seconds=180)).isoformat()}
        # A single conditional update decides which worker owns a queued job.
        if self.cloud:
            params={'id':'eq.'+jid,'state':'eq.'+row['state'],'attempts':'eq.'+str(row['attempts'])}
            won=self.gateway.request('PATCH','/rest/v1/vc_jobs',params=params,data=values,headers={'Prefer':'return=representation'})
        else:
            with SessionLocal() as db:
                changed=db.execute(update(WorkspaceJob).where(WorkspaceJob.id==jid,WorkspaceJob.state==row['state'],WorkspaceJob.attempts==row['attempts']).values(**values))
                db.commit();won=changed.rowcount==1
        return {**row,**values} if won else None

    def pending(self):
        if self.cloud:
            rows=self.gateway.request('GET','/rest/v1/vc_jobs',params={'state':'in.(Queued,Running)','or':'(lease_until.is.null,lease_until.lte.'+now()+')','order':'created_at.asc','limit':20})
            return [r['id'] for r in rows]
        with SessionLocal() as db:
            return [r.id for r in db.query(WorkspaceJob).filter(WorkspaceJob.state.in_(('Queued','Running')),or_(WorkspaceJob.lease_until.is_(None),WorkspaceJob.lease_until<=now())).order_by(WorkspaceJob.created_at).limit(20)]
