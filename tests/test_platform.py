import os
import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from fastapi.testclient import TestClient
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import httpx
from backend.main import app
from backend.auth import create_access_token
from backend.supabase_gateway import authenticate,Gateway
from backend.workspace_repository import CloudRepository
from backend.workspace_schema import Company
from backend.ingestion import public_url
from backend.observability import sanitize_event
from backend.job_store import JobStore
from backend.worker import process_job
from database.db import get_db
from database.models import Base,User
from database.jobs import WorkspaceJob


class PlatformTests(unittest.TestCase):
    def setUp(self):
        env=patch.dict(os.environ,{'AUTH_PROVIDER':'local','WORKSPACE_PROVIDER':'rules','WORKSPACE_MODEL_URL':'','WORKSPACE_MODEL':'','JOB_DATABASE':'local'})
        env.start();self.addCleanup(env.stop)
        self.engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
        Base.metadata.create_all(self.engine);self.factory=sessionmaker(bind=self.engine)
        with self.factory() as db:
            db.add_all([User(id=1,email='platform-a@example.invalid',full_name='Analyst',role='analyst',hashed_password='unused'),User(id=2,email='platform-b@example.invalid',full_name='Other',role='viewer',hashed_password='unused')]);db.commit()
        def db_override():
            with self.factory() as db: yield db
        app.dependency_overrides[get_db]=db_override
        for target in ('backend.job_store.SessionLocal','backend.worker.SessionLocal'):
            mocked=patch(target,self.factory);mocked.start();self.addCleanup(mocked.stop)
        self.client=TestClient(app);self.addCleanup(self.client.close)
        self.addCleanup(app.dependency_overrides.clear);self.addCleanup(self.engine.dispose)
        self.headers={'Authorization':'Bearer '+create_access_token({'sub':'platform-a@example.invalid'})}
        captured=self.client.post('/api/workspace/companies',headers=self.headers,json={'name':'Platform Fixture','domain':'platform-fixture.com','founder_name':'Public Founder','sector':'B2B SaaS','geography':'India','stage':'Not evidenced'})
        self.assertEqual(captured.status_code,200,captured.text)
        self.company=captured.json()['company']

    def queue(self):
        response=self.client.post('/api/platform/jobs',headers=self.headers,json={'company_slug':self.company['id'],'kind':'research_draft','task':'Challenge this claim'})
        self.assertEqual(response.status_code,200,response.text);return response.json()

    def test_durable_research_result_is_reviewed_separately(self):
        job=self.queue();process_job(job['id'])
        done=JobStore(SimpleNamespace(id=1)).get(job['id'])
        self.assertEqual(done['state'],'Succeeded');self.assertTrue(done['result']['review_required'])
        current=self.client.get('/api/workspace',headers=self.headers).json()['companies'][0]
        self.assertEqual(current['claims'],[]);self.assertEqual(current['ai_runs'],[])
        saved=self.client.post('/api/platform/jobs/'+job['id']+'/save-draft',headers=self.headers,json={'revision':current['revision']})
        self.assertEqual(saved.status_code,200)
        current=self.client.get('/api/workspace',headers=self.headers).json()['companies'][0]
        self.assertEqual(current['ai_runs'][0]['status'],'Draft');self.assertEqual(current['claims'],[])

    def test_cancelled_job_does_not_call_provider(self):
        job=self.queue();self.client.post('/api/platform/jobs/'+job['id']+'/cancel',headers=self.headers)
        with patch('backend.worker.generate_draft') as model:
            process_job(job['id']);model.assert_not_called()
        self.assertEqual(JobStore(SimpleNamespace(id=1)).get(job['id'])['state'],'Cancelled')

    def test_jobs_are_owner_isolated(self):
        job=self.queue()
        other={'Authorization':'Bearer '+create_access_token({'sub':'platform-b@example.invalid'})}
        self.assertEqual(self.client.get('/api/platform/jobs',headers=other).json(),[])
        self.assertEqual(self.client.post('/api/platform/jobs/'+job['id']+'/cancel',headers=other).status_code,403)
        self.assertIsNone(JobStore(SimpleNamespace(id=2)).get(job['id']))

    def test_stale_draft_is_not_saved(self):
        job=self.queue();process_job(job['id'])
        self.client.post('/api/workspace/companies/'+self.company['id']+'/actions',headers=self.headers,json={'revision':1,'action':'note','rationale':'New research arrived'})
        self.assertEqual(self.client.post('/api/platform/jobs/'+job['id']+'/save-draft',headers=self.headers,json={'revision':2}).status_code,409)

    def test_old_lease_cannot_overwrite_a_new_attempt(self):
        job=self.queue();store=JobStore(worker=True);first=store.claim(job['id'])
        self.assertIsNone(store.claim(job['id']))
        store.change(job['id'],{'lease_until':'2000-01-01T00:00:00+00:00'})
        second=store.claim(job['id']);self.assertEqual(second['attempts'],2)
        self.assertFalse(store.change(job['id'],{'state':'Succeeded'},'Running',first['attempts']))

    def test_missing_web_key_fails_before_job_created(self):
        with patch.dict(os.environ,{'FIRECRAWL_API_KEY':''}):
            result=self.client.post('/api/platform/jobs',headers=self.headers,json={'company_slug':self.company['id'],'kind':'web_capture','url':'https://platform-fixture.com/about'})
        self.assertEqual(result.status_code,422);self.assertEqual(JobStore(SimpleNamespace(id=1)).list(),[])

    def test_expired_final_attempt_becomes_retryable_failure(self):
        job=self.queue();store=JobStore(worker=True)
        for attempt in range(1,4):
            claimed=store.claim(job['id']);self.assertEqual(claimed['attempts'],attempt)
            store.change(job['id'],{'lease_until':'2000-01-01T00:00:00+00:00'})
        self.assertIsNone(store.claim(job['id']))
        failed=store.get(job['id'])
        self.assertEqual(failed['state'],'Failed');self.assertIsNone(failed['lease_until'])

    def test_public_url_rejects_private_and_credential_urls(self):
        for url in ('http://example.com','https://localhost','https://127.0.0.1','https://169.254.169.254/metadata','https://user:secret@example.com','https://example.com?token=private'):
            with self.assertRaises(ValueError):public_url(url)

    def test_monitoring_omits_source_and_credentials(self):
        sentinel='private source or credential'
        cleaned=sanitize_event({'request':{'data':sentinel},'user':{'email':sentinel},'breadcrumbs':[sentinel],'exception':{'values':[{'type':'ValueError','value':sentinel,'stacktrace':{'frames':[{'filename':'worker.py','lineno':1,'vars':{'key':sentinel}}]}}]}})
        self.assertNotIn(sentinel,json.dumps(cleaned));self.assertEqual(cleaned['exception']['values'][0]['type'],'ValueError')

    def test_supabase_roles_ignore_user_editable_metadata(self):
        profile={'id':'f5e8a540-4196-4a09-a4da-2ca9844a951d','email':'public@example.invalid','user_metadata':{'workspace_role':'admin','full_name':'Analyst'},'app_metadata':{'workspace_role':'viewer'}}
        with patch.object(Gateway,'request',return_value=profile):
            user=authenticate('synthetic-session');self.assertEqual(user.role,'viewer')

    def test_cloud_updates_include_revision_and_user_bearer(self):
        user=SimpleNamespace(id='test-owner',supabase_token='synthetic-user-session')
        repo=CloudRepository(user)
        data={key:value for key,value in self.company.items() if key in Company.model_fields}
        with patch.object(repo.gateway,'request',return_value=[]) as call:
            with self.assertRaises(HTTPException) as rejected:
                repo.save(SimpleNamespace(id='record-id',data=data),data,2,'note')
            self.assertEqual(rejected.exception.status_code,409)
            self.assertEqual(call.call_args.kwargs['params']['revision'],'eq.2')
            self.assertEqual(repo.gateway.token,'synthetic-user-session')

if __name__=='__main__': unittest.main()
