"""Run `python -m backend.worker` or the Celery worker in Docker."""
import os
import time
import hashlib
from datetime import datetime,timedelta,timezone
from types import SimpleNamespace
from backend.config import load_runtime_config
load_runtime_config()
from backend.job_store import JobStore
from backend.workspace_schema import Company,now
from backend.workspace_provider import generate_draft
from backend.ingestion import capture_web,embed,JobRequest
from backend.budgets import ProviderBudget
from database.db import SessionLocal,engine
from database.models import Base
from database.workspace import WorkspaceCompany
from backend.observability import initialize_monitoring
from fastapi import HTTPException


def process_job(jid,store=None):
    store=store or JobStore(worker=True)
    job=store.claim(jid)
    if not job: return
    try:
        if store.cloud:
            rows=store.gateway.request('GET','/rest/v1/vc_companies',params={'id':'eq.'+job['company_id'],'owner_id':'eq.'+job['owner_id'],'select':'data,revision','limit':1})
            raw=rows[0] if rows else None
        else:
            with SessionLocal() as db:
                r=db.query(WorkspaceCompany).filter_by(user_id=job['owner_id'],slug=job['company_id']).first()
                raw={'data':r.data,'revision':r.revision} if r else None
        if not raw or raw['revision']!=job['company_revision']:
            raise ValueError('The company changed before the job started. Queue a new job from its current version.')
        company=Company.model_validate(raw['data'])
        payload=JobRequest.model_validate({**job['payload'],'kind':job['kind']})
        if payload.company_slug!=company.id: raise ValueError('Job payload does not match its company.')
        budget=ProviderBudget(owner=job['owner_id'],gateway=store.gateway if store.cloud else None)
        if job['kind']=='web_capture':
            result=capture_web(payload.url,budget)
            result['captured_at']=now()
        elif job['kind']=='research_draft':
            status,draft,refs=generate_draft(payload.task,company,budget)
            result={'draft':draft,'source_ids':refs,'provider':status['provider'],'model':status['model'],'review_required':True}
        else:
            if not store.cloud: raise ValueError('Vector indexing requires a Supabase account and worker.')
            if not company.sources: raise ValueError('Capture sources before indexing evidence.')
            indexed=0
            for source in company.sources[:30]:
                fresh=store.get(jid)
                if fresh['cancelled']: break
                if not store.change(jid,{'lease_until':(datetime.now(timezone.utc)+timedelta(seconds=180)).isoformat()},'Running',job['attempts']):
                    return
                digest=hashlib.sha256(source.excerpt.encode()).hexdigest()
                model=os.getenv('GEMINI_EMBEDDING_MODEL','gemini-embedding-001')
                existing=store.gateway.request('GET','/rest/v1/vc_chunks',params={'owner_id':'eq.'+job['owner_id'],'company_id':'eq.'+job['company_id'],'source_id':'eq.'+source.id,'content_hash':'eq.'+digest,'embedding_model':'eq.'+model,'select':'id','limit':1})
                if existing: continue
                values,model=embed(source.excerpt,'RETRIEVAL_DOCUMENT',budget)
                store.gateway.request('POST','/rest/v1/vc_chunks',data={'owner_id':job['owner_id'],'company_id':job['company_id'],'source_id':source.id,'content':source.excerpt,'content_hash':digest,'embedding':values,'embedding_model':model})
                indexed+=1
            result={'indexed':indexed,'review_required':False,'note':'Search index only; no claims or investment scores were changed.'}
        current=store.get(jid)
        store.change(jid,{'state':'Cancelled' if current['cancelled'] else 'Succeeded',
            'result':None if current['cancelled'] else result,'updated_at':now(),'lease_until':None},'Running',job['attempts'])
    except HTTPException as error:
        if error.status_code==429:
            # Keep attempt numbers monotonic for fencing, but quota waits are
            # queued work, not crashed leases. Indexing resumes existing chunks.
            resumes=datetime.fromtimestamp((int(time.time())//60+1)*60+2,timezone.utc).isoformat()
            store.change(jid,{'state':'Queued','error':'Waiting for the work allowance to reset. This task will resume automatically.','lease_until':resumes,'updated_at':now()},'Running',job['attempts'])
        else:
            store.change(jid,{'state':'Failed','error':'The task is not authorized or its provider is unavailable. Check your workspace connection.','updated_at':now(),'lease_until':None},'Running',job['attempts'])
    except Exception:
        # Provider errors may contain credentials or source text. Persist a safe, actionable message only.
        store.change(jid,{'state':'Failed','error':'This task could not complete. Check its company revision, provider credentials and worker connection; retry from the current record.','updated_at':now(),'lease_until':None},'Running',job['attempts'])


def run():
    initialize_monitoring()
    if os.getenv('JOB_DATABASE')!='supabase': Base.metadata.create_all(engine)
    while True:
        for jid in JobStore(worker=True).pending(): process_job(jid)
        time.sleep(2)

if __name__=='__main__': run()
