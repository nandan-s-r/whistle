"""Synthetic regression checks; never use a real provider or existing database."""
import asyncio
import hashlib
import hmac
import json
import os
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
from unittest.mock import Mock, patch
from fastapi import FastAPI, HTTPException, Request
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from backend.api import app as local_app, startup_event
from backend.main import app as production_app
from backend.auth import get_current_user, create_access_token, get_password_hash, credential_version
from backend.budgets import ProviderBudget, WorkAllowance
from backend.job_store import JobStore
from backend.security import RequestBudget, require_production_auth
from backend.workspace_demo import demo_companies
from backend.workspace_provider import generate_draft
from backend.ingestion import embed, capture_web
from backend.worker import process_job
from database.db import get_db
from database.models import Base, User, Startup
from database.jobs import WorkspaceJob
from webhooks.whatsapp_webhook import app as webhook_app


class ApiBoundaryTests(unittest.TestCase):
    def test_local_auth_throttle_advertises_cooldown_without_relaxing_limit(self):
        from collections import defaultdict
        from backend.api import check_rate_limit
        request=SimpleNamespace(client=SimpleNamespace(host='synthetic-auth-throttle'))
        with patch('backend.api.login_signup_rate_limit_data',defaultdict(list)),patch('backend.api.time.time',return_value=100):
            for _ in range(5):check_rate_limit(request)
            with self.assertRaises(HTTPException) as denied:check_rate_limit(request)
            self.assertEqual(denied.exception.status_code,429);self.assertEqual(denied.exception.headers,{'Retry-After':'60'})
            with patch('backend.api.time.time',return_value=160):check_rate_limit(request)

    def setUp(self):
        self.env=patch.dict(os.environ,{'AUTH_PROVIDER':'local','ENVIRONMENT':'development','JOB_WORKER_MODE':'external'})
        self.env.start();self.addCleanup(self.env.stop)
        self.engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.factory=sessionmaker(bind=self.engine)
        self.addCleanup(self.engine.dispose)
        for target,value in (('backend.api.engine',self.engine),('database.db.engine',self.engine),('backend.api.SessionLocal',self.factory)):
            patcher=patch(target,value);patcher.start();self.addCleanup(patcher.stop)
        with self.factory() as db:
            db.add(User(id=1,email='security@example.invalid',full_name='Analyst',hashed_password='unused',role='analyst'))
            db.add(Startup(name='Other owner legacy record'));db.commit()
        def db_override():
            with self.factory() as db: yield db
        for app in (local_app,production_app):
            app.dependency_overrides[get_db]=db_override
            self.addCleanup(app.dependency_overrides.clear)
        self.headers={'Authorization':'Bearer '+create_access_token({'sub':'security@example.invalid'})}

    def test_legacy_read_mutations_upload_and_aliases_are_retired(self):
        with TestClient(local_app) as client, patch('backend.api.genai.Client') as model, patch('backend.api.SessionLocal',self.factory):
            for method,path in [('GET','/api/startups'),('GET','/api/meetings'),('GET','/api/startups/'),('GET','/api/%73tartups'),('DELETE','/api/startups/1'),('POST','/api/startups'),('POST','/api/upload-deck'),('POST','/api/truth-engine')]:
                result=client.request(method,path,headers=self.headers)
                self.assertEqual(result.status_code,404,(path,result.text))
            self.assertEqual(client.post('/api/upload-deck',files={'file':('small.pdf',b'%PDF-small','application/pdf')}).status_code,404)
            model.assert_not_called()
        with self.factory() as db: self.assertEqual(db.query(Startup).count(),1)

    def test_local_startup_does_not_seed_accounts(self):
        with patch('backend.api.engine',self.engine),patch('backend.api.SessionLocal',self.factory): startup_event()
        with self.factory() as db: self.assertEqual(db.query(User).count(),1)

    def test_previous_shared_credentials_and_stale_demo_tokens_are_rejected(self):
        with self.factory() as db:
            db.add(User(email='test@vc.os',full_name='Old fixture',hashed_password=get_password_hash('Password123!'),role='partner'));db.commit()
        with patch('backend.api.SessionLocal',self.factory): startup_event()
        with self.factory() as db:
            user=db.query(User).filter_by(email='test@vc.os').one()
            self.assertFalse(user.is_active)
            user.hashed_password=get_password_hash('SyntheticNewPassword123!');user.is_active=True
            version=credential_version(user);db.commit()
        with TestClient(local_app) as client,patch('backend.api.SessionLocal',self.factory):
            self.assertEqual(client.post('/api/auth/login',data={'username':'test@vc.os','password':'Password123!'}).status_code,400)
            old={'Authorization':'Bearer '+create_access_token({'sub':'test@vc.os'})}
            self.assertEqual(client.get('/api/auth/me',headers=old).status_code,401)
            signed=client.post('/api/auth/login',data={'username':'test@vc.os','password':'SyntheticNewPassword123!'})
            self.assertEqual(signed.status_code,200,signed.text)
            new={'Authorization':'Bearer '+signed.json()['access_token']}
            self.assertEqual(client.get('/api/auth/me',headers=new).status_code,200)

    def test_production_requires_cloud_auth(self):
        for mode in ('local','hybrid',''):
            with patch.dict(os.environ,{'ENVIRONMENT':'production','AUTH_PROVIDER':mode}):
                with self.assertRaises(RuntimeError): require_production_auth()
        with patch.dict(os.environ,{'ENVIRONMENT':'production','AUTH_PROVIDER':'supabase'}): require_production_auth()
        with patch.dict(os.environ,{'ENVIRONMENT':'production','AUTH_PROVIDER':'supabase'}), TestClient(local_app) as client:
            self.assertEqual(client.post('/api/auth/login',data={'username':'synthetic','password':'synthetic'}).status_code,404)

    def test_owned_intake_still_works_both_entrypoints(self):
        for i,app in enumerate((local_app,production_app)):
            with TestClient(app) as client:
                result=client.post('/api/workspace/companies',headers=self.headers,json={'name':'Security fixture','domain':f'fixture-{i}.com','founder_name':'Analyst','sector':'B2B SaaS','geography':'India','stage':'Not evidenced'})
                self.assertEqual(result.status_code,200,result.text)

    def test_upload_auth_precedes_multipart_and_valid_storage_is_scoped(self):
        from starlette.formparsers import MultiPartParser
        original=MultiPartParser.parse
        for app in (local_app,production_app):
            with TestClient(app) as client,patch.object(MultiPartParser,'parse',side_effect=AssertionError('Parser ran before authentication')):
                self.assertEqual(client.post('/api/platform/files',files={'file':('source.txt',b'hello','text/plain')}).status_code,401)
            cloud=SimpleNamespace(id='11111111-1111-4111-8111-111111111111',role='analyst',is_active=True,supabase_token='synthetic')
            app.dependency_overrides[get_current_user]=lambda:cloud
            try:
                with TestClient(app) as client,patch('backend.platform_api.Gateway.request',return_value={}) as storage:
                    result=client.post('/api/platform/files',files={'file':('source.txt',b'hello','text/plain')})
                    self.assertEqual(result.status_code,200,result.text)
                    self.assertTrue(result.json()['path'].startswith(cloud.id+'/'))
                    self.assertEqual(storage.call_args.kwargs['headers']['x-upsert'],'false')
                    for files in ({'wrong':('source.txt',b'hello','text/plain')}, [('file',('a.txt',b'a','text/plain')),('file',('b.txt',b'b','text/plain'))]):
                        storage.reset_mock();result=client.post('/api/platform/files',files=files)
                        self.assertIn(result.status_code,(400,422));storage.assert_not_called()
                    storage.reset_mock()
                    with patch('backend.security.FILE_REQUEST_BYTES',128):
                        result=client.post('/api/platform/files',files={'file':('source.txt',b'x'*200,'text/plain')})
                    self.assertEqual(result.status_code,413);storage.assert_not_called()
            finally: app.dependency_overrides.pop(get_current_user,None)

    def test_actual_chunk_count_rejects_missing_and_dishonest_length(self):
        api=FastAPI();api.add_middleware(RequestBudget)
        @api.post('/body')
        async def body(request:Request): return {'body':(await request.body()).decode()}
        async def exercise(headers,chunks):
            messages=[{'type':'http.request','body':c,'more_body':i<len(chunks)-1} for i,c in enumerate(chunks)]
            replies=[]
            async def receive(): return messages.pop(0) if messages else {'type':'http.disconnect'}
            async def send(message): replies.append(message)
            await api({'type':'http','http_version':'1.1','method':'POST','path':'/body','raw_path':b'/body','query_string':b'','headers':headers,'scheme':'http','server':('test',80),'client':('test',1)},receive,send)
            return next(r['status'] for r in replies if r['type']=='http.response.start')
        with patch('backend.security.JSON_REQUEST_BYTES',8):
            for headers in ([],[(b'content-length',b'1')]):
                self.assertEqual(asyncio.run(exercise(headers,[b'12345',b'67890'])),413)
            self.assertEqual(asyncio.run(exercise([], [b'1234',b'5678'])),200)


class DurableAllowanceTests(unittest.TestCase):
    def setUp(self):
        env=patch.dict(os.environ,{'AUTH_PROVIDER':'local'});env.start();self.addCleanup(env.stop)
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.engine=create_engine('sqlite:///'+self.temp.name+'/fixture.db',connect_args={'check_same_thread':False,'timeout':20})
        Base.metadata.create_all(self.engine);self.factory=sessionmaker(bind=self.engine);self.addCleanup(self.engine.dispose)
        for name in ('backend.budgets.SessionLocal','backend.job_store.SessionLocal'):
            p=patch(name,self.factory);p.start();self.addCleanup(p.stop)
        self.owner=SimpleNamespace(id=1)

    def test_concurrent_provider_requests_have_one_durable_allowance(self):
        clock=patch('backend.budgets.time',return_value=1800000010)
        clock.start();self.addCleanup(clock.stop)
        def spend(_):
            try: ProviderBudget(self.owner).reserve();return True
            except HTTPException as error: self.assertEqual(error.status_code,429);return False
        with ThreadPoolExecutor(max_workers=8) as pool: self.assertEqual(sum(pool.map(spend,range(24))),10)
        # A new object/process sees persisted counters, not a fresh in-memory budget.
        with self.assertRaises(HTTPException): ProviderBudget(self.owner).reserve()

    def test_global_allowance_limits_new_account_evasion(self):
        clock=patch('backend.budgets.time',return_value=1800000010)
        clock.start();self.addCleanup(clock.stop)
        for owner in range(1,61): ProviderBudget(SimpleNamespace(id=owner)).reserve()
        with self.assertRaises(HTTPException) as denied: ProviderBudget(SimpleNamespace(id=61)).reserve()
        self.assertEqual(denied.exception.status_code,429)

    def test_hybrid_provider_work_has_only_the_cloud_allowance(self):
        with patch.dict(os.environ,{'AUTH_PROVIDER':'hybrid'}):
            with self.assertRaises(HTTPException) as denied: ProviderBudget(self.owner).reserve()
            self.assertEqual(denied.exception.status_code,422)
            gateway=Mock();ProviderBudget(owner='synthetic-cloud-owner',gateway=gateway).reserve()
            gateway.request.assert_called_once()

    def test_quota_wait_is_not_a_crashed_lease_and_keeps_fencing(self):
        store=JobStore(self.owner)
        row=store.create(SimpleNamespace(slug='fixture',revision=1),'research_draft',{'company_slug':'fixture','task':'Challenge this claim'})
        first=store.claim(row['id'])
        store.change(row['id'],{'state':'Queued','lease_until':'2099-01-01T00:00:00+00:00','attempts':3},'Running',first['attempts'])
        self.assertIsNone(store.claim(row['id']));self.assertNotIn(row['id'],store.pending())
        store.change(row['id'],{'lease_until':'2000-01-01T00:00:00+00:00'})
        resumed=store.claim(row['id']);self.assertEqual(resumed['attempts'],4)
        self.assertFalse(store.change(row['id'],{'state':'Succeeded'},'Running',first['attempts']))

    def test_bulk_index_pauses_and_resumes_without_repeating_paid_chunks(self):
        company=demo_companies('Synthetic')[0]
        company.sources=[company.sources[0].model_copy(update={'id':f'S{i:02}'}) for i in range(1,12)]
        chunks=set()
        class GatewayFixture:
            def request(self,method,path,**kwargs):
                if path.endswith('vc_companies'): return [{'data':company.model_dump(mode='json'),'revision':1}]
                if method=='GET': return [{'id':'existing'}] if kwargs['params']['source_id'][3:] in chunks else []
                chunks.add(kwargs['data']['source_id']);return []
        class StoreFixture:
            cloud=True;gateway=GatewayFixture()
            row={'id':'fixture-job','owner_id':'11111111-1111-4111-8111-111111111111','company_id':'fixture-row','company_revision':1,'kind':'index_evidence','attempts':0,'cancelled':False,'state':'Queued','payload':{'company_slug':company.id,'task':'Challenge this claim'}}
            def claim(self,jid): self.row.update(state='Running',attempts=self.row['attempts']+1);return dict(self.row)
            def get(self,jid): return self.row
            def change(self,jid,values,*args): self.row.update(values);return True
        calls=0
        def embedding(*args):
            nonlocal calls
            calls+=1
            if calls>10: raise HTTPException(429,'Synthetic allowance')
            return [0.0]*768,'gemini-embedding-001'
        store=StoreFixture()
        with patch('backend.worker.embed',embedding): process_job('fixture-job',store)
        self.assertEqual(store.row['state'],'Queued');self.assertEqual(len(chunks),10)
        calls=0
        with patch('backend.worker.embed',embedding): process_job('fixture-job',store)
        self.assertEqual(store.row['state'],'Succeeded');self.assertEqual(len(chunks),11);self.assertEqual(calls,1)

    def test_active_jobs_cannot_hide_behind_newer_finished_jobs(self):
        store=JobStore(self.owner);company=SimpleNamespace(slug='fixture',revision=1)
        payload={'company_slug':'fixture','task':'Challenge this claim','url':None}
        for _ in range(5): store.create(company,'research_draft',payload)
        with self.factory() as db:
            db.add_all([WorkspaceJob(id=f'done-{i}',owner_id=1,company_id='fixture',company_revision=1,kind='research_draft',state='Succeeded',payload=payload,created_at='9999',updated_at='9999') for i in range(31)]);db.commit()
        self.assertFalse(any(j['state']=='Queued' for j in store.list()))
        with self.assertRaises(HTTPException) as denied: store.create(company,'research_draft',payload)
        self.assertEqual(denied.exception.status_code,429)

    def test_job_admission_is_atomic_under_concurrency(self):
        def enqueue(_):
            try:
                JobStore(self.owner).create(SimpleNamespace(slug='fixture',revision=1),'research_draft',{'company_slug':'fixture','task':'Challenge this claim'});return True
            except HTTPException as error: self.assertEqual(error.status_code,429);return False
        with ThreadPoolExecutor(max_workers=8) as pool: self.assertEqual(sum(pool.map(enqueue,range(12))),5)

    def test_every_provider_transport_reserves_before_network(self):
        denied=Mock();denied.reserve.side_effect=HTTPException(429,'Synthetic limit')
        env={'WORKSPACE_PROVIDER':'gemini','GEMINI_API_KEY':'synthetic','GEMINI_MODEL':'test','GEMINI_EMBEDDING_MODEL':'gemini-embedding-001','FIRECRAWL_API_KEY':'synthetic'}
        with patch.dict(os.environ,env),patch('backend.workspace_provider.httpx.Client') as network:
            for operation in (lambda:generate_draft('Challenge this claim',demo_companies('Test')[0],denied),lambda:embed('Source','RETRIEVAL_QUERY',denied),lambda:capture_web('https://fixture.com',denied)):
                with self.assertRaises(HTTPException) as error: operation()
                self.assertEqual(error.exception.status_code,429)
            network.assert_not_called()
        with patch.dict(os.environ,{'WORKSPACE_PROVIDER':'compatible','WORKSPACE_MODEL_URL':'https://fixture.com','WORKSPACE_MODEL':'test'}),patch('backend.workspace_provider.httpx.Client') as network:
            with self.assertRaises(HTTPException):generate_draft('Challenge this claim',demo_companies('Test')[0],denied)
            network.assert_not_called()


class WebhookTests(unittest.TestCase):
    def test_signature_exact_bytes_and_fail_closed_configuration(self):
        body=json.dumps({'object':'whatsapp_business_account','entry':[]}).encode()
        secret='synthetic-secret'
        signature='sha256='+hmac.new(secret.encode(),body,hashlib.sha256).hexdigest()
        with TestClient(webhook_app) as client,patch.dict(os.environ,{'WHATSAPP_APP_SECRET':secret,'WHATSAPP_VERIFY_TOKEN':'synthetic-verify'}):
            self.assertEqual(client.post('/webhook',content=body).status_code,401)
            self.assertEqual(client.post('/webhook',content=body+b' ',headers={'X-Hub-Signature-256':signature}).status_code,401)
            self.assertEqual(client.post('/webhook',content=body,headers={'X-Hub-Signature-256':signature}).json(),{'status':'received','processed':False})
            self.assertEqual(client.get('/webhook',params={'hub.mode':'subscribe','hub.verify_token':'synthetic-verify','hub.challenge':'42'}).text,'42')
            self.assertEqual(client.get('/webhook',params={'hub.mode':'subscribe','hub.verify_token':'antigravity','hub.challenge':'42'}).status_code,403)
        with TestClient(webhook_app) as client,patch.dict(os.environ,{'WHATSAPP_APP_SECRET':'','WHATSAPP_VERIFY_TOKEN':''}):
            self.assertEqual(client.post('/webhook',content=body).status_code,503)
            self.assertEqual(client.get('/webhook').status_code,503)


if __name__=='__main__':unittest.main()
