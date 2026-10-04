import copy
import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from datetime import datetime, timezone, timedelta

import httpx
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from backend.main import app
from backend.auth import create_access_token
from backend.calendar_integration import calendar_status, event_summary, sign_event, verify_event, CalendarImport
from database.db import get_db
from database.models import Base, User

USER_URI = 'https://api.calendly.com/users/AAAAAAAA'
EVENT_URI = 'https://api.calendly.com/scheduled_events/EEEEEEEE'
START = datetime.now(timezone.utc).replace(second=0,microsecond=0) + timedelta(days=1)
EVENT = {'uri': EVENT_URI, 'name': 'Founder call fixture', 'status': 'active',
         'start_time': START.isoformat(), 'end_time': (START+timedelta(minutes=30)).isoformat(),
         'event_memberships': [{'user': USER_URI, 'user_email': 'private@example.invalid'}],
         'meeting_notes_plain': 'PRIVATE NOTES MUST NOT BE IMPORTED',
         'event_guests': [{'email': 'private@example.invalid'}]}
REAL_CLIENT = httpx.Client


class CalendarIntegrationTests(unittest.TestCase):
    def setUp(self):
        env = patch.dict(os.environ, {'AUTH_PROVIDER': 'local', 'CALENDLY_ACCESS_TOKEN': 'fixture-calendar-secret', 'CALENDLY_ACCOUNT_SCOPE': 'local:1'})
        env.start(); self.addCleanup(env.stop)
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread':False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine); factory = sessionmaker(bind=self.engine)
        with factory() as db:
            db.add_all([User(id=1,email='calendar@example.invalid',full_name='Owner',role='analyst',hashed_password='unused'),
                        User(id=2,email='calendar-other@example.invalid',full_name='Other',role='analyst',hashed_password='unused'),
                        User(id=3,email='calendar-reader@example.invalid',full_name='Reader',role='viewer',hashed_password='unused')]); db.commit()
        def override():
            with factory() as db: yield db
        app.dependency_overrides[get_db] = override
        self.addCleanup(app.dependency_overrides.clear); self.addCleanup(self.engine.dispose)
        self.client = TestClient(app); self.addCleanup(self.client.close)
        self.headers = {'Authorization':'Bearer '+create_access_token({'sub':'calendar@example.invalid'})}
        company = self.client.post('/api/workspace/companies',headers=self.headers,json={'name':'Calendar fixture','domain':'calendar-fixture.com','founder_name':'Not evidenced','sector':'AI','stage':'Not evidenced','geography':'Not evidenced'})
        self.assertEqual(company.status_code,200,company.text); self.company = company.json()['company']
        self.calls = []; self.provider_event = copy.deepcopy(EVENT)
        def handler(request):
            self.calls.append(request)
            self.assertEqual(request.url.host,'api.calendly.com')
            self.assertEqual(request.method,'GET')
            self.assertEqual(request.headers['Authorization'],'Bearer fixture-calendar-secret')
            if request.url.path == '/users/me': return httpx.Response(200,json={'resource':{'uri':USER_URI}})
            if request.url.path == '/scheduled_events': return httpx.Response(200,json={'collection':[self.provider_event], 'pagination':{'next_page':'https://malicious.example/private'}})
            if request.url.path == '/scheduled_events/EEEEEEEE': return httpx.Response(200,json={'resource':self.provider_event})
            self.fail('Unexpected external request')
        mocked = patch('backend.calendar_integration.httpx.Client', side_effect=lambda **options: REAL_CLIENT(transport=httpx.MockTransport(handler),**options))
        mocked.start(); self.addCleanup(mocked.stop)
        self.allowance = patch('backend.calendar_integration.reserve_provider'); self.reserve = self.allowance.start(); self.addCleanup(self.allowance.stop)

    def preview(self):
        response = self.client.post('/api/platform/calendly/preview',headers=self.headers,json={'consent':True})
        self.assertEqual(response.status_code,200,response.text); return response.json()

    def import_payload(self, preview):
        event = preview['events'][0]
        return {'company_slug':self.company['id'], 'revision':self.company['revision'], 'receipt':event['receipt'], 'signature':event['signature'], 'consent':True}

    def test_private_account_binding_and_status_never_expose_credentials(self):
        for uid, available in ((1,True),(2,False),(3,False)):
            status = calendar_status(SimpleNamespace(id=uid))
            self.assertEqual(status['available'],available); self.assertNotIn('fixture-calendar-secret',json.dumps(status))
        self.assertFalse(calendar_status(SimpleNamespace(id=1,supabase_token='fixture'))['available'])
        self.assertEqual(self.client.get('/api/platform/calendly/status').status_code,401)

    def test_consent_owner_and_reader_boundaries_before_network(self):
        self.assertEqual(self.client.post('/api/platform/calendly/preview',headers=self.headers,json={'consent':False}).status_code,422)
        other = {'Authorization':'Bearer '+create_access_token({'sub':'calendar-other@example.invalid'})}
        self.assertEqual(self.client.post('/api/platform/calendly/preview',headers=other,json={'consent':True}).status_code,422)
        reader = {'Authorization':'Bearer '+create_access_token({'sub':'calendar-reader@example.invalid'})}
        self.assertEqual(self.client.post('/api/platform/calendly/preview',headers=reader,json={'consent':True}).status_code,403)
        self.assertEqual(self.calls,[]); self.reserve.assert_not_called()

    def test_hybrid_local_capabilities_do_not_offer_disallowed_private_work(self):
        with patch.dict(os.environ,{'AUTH_PROVIDER':'hybrid'}):
            result = calendar_status(SimpleNamespace(id=1))
            self.assertFalse(result['available']); self.assertIn('cloud sign-in',result['detail'])
            with patch.dict(os.environ,{'CALENDLY_ACCOUNT_SCOPE':'cloud:1'}):
                self.assertTrue(calendar_status(SimpleNamespace(id=1,supabase_token='fixture'))['available'])

    def test_minimal_preview_fixed_scope_no_pagination_follow_or_private_notes(self):
        preview = self.preview()
        self.assertTrue(preview['has_more']); self.assertEqual(len(self.calls),2)
        self.assertEqual(self.calls[1].url.params['user'],USER_URI)
        self.assertEqual(self.calls[1].url.params['count'],'20'); self.assertNotIn('organization',self.calls[1].url.params)
        self.assertEqual(preview['events'][0]['status'],'Planned')
        self.assertNotIn('private@example.invalid',json.dumps(preview)); self.assertNotIn('PRIVATE NOTES',json.dumps(preview))
        self.assertEqual(self.reserve.call_count,2)

    def test_reviewed_import_is_idempotent_and_not_a_founder_reply(self):
        payload = self.import_payload(self.preview())
        response = self.client.post('/api/platform/calendly/import',headers=self.headers,json=payload)
        self.assertEqual(response.status_code,200,response.text); result = response.json()
        self.assertTrue(result['created']); self.assertEqual(len(result['company']['meetings']),1)
        meeting = result['company']['meetings'][0]
        self.assertEqual(meeting['status'],'Planned'); self.assertEqual(meeting['outcome'],'')
        self.assertNotIn('PRIVATE NOTES',json.dumps(result)); self.assertNotIn('private@example.invalid',json.dumps(result))
        self.assertFalse(any(item['kind']=='Founder response' for item in result['company']['interactions']))
        payload['revision'] = result['company']['revision']; calls = len(self.calls)
        repeated = self.client.post('/api/platform/calendly/import',headers=self.headers,json=payload)
        self.assertEqual(repeated.status_code,200,repeated.text); self.assertFalse(repeated.json()['created'])
        self.assertEqual(len(self.calls),calls)

    def test_tamper_expiry_and_owner_receipts_rejected(self):
        payload = self.import_payload(self.preview()); payload['receipt'] += ' '
        self.assertEqual(self.client.post('/api/platform/calendly/import',headers=self.headers,json=payload).status_code,422)
        signed = sign_event(event_summary(EVENT,USER_URI),SimpleNamespace(id=2))
        self.assertEqual(self.client.post('/api/platform/calendly/import',headers=self.headers,json={**payload,**signed}).status_code,422)
        with patch('backend.calendar_integration.time.time',return_value=0): signed = sign_event(event_summary(EVENT,USER_URI),SimpleNamespace(id=1))
        self.assertEqual(self.client.post('/api/platform/calendly/import',headers=self.headers,json={**payload,**signed}).status_code,422)
        self.assertEqual(len(self.calls),2)

    def test_stale_revision_and_changed_provider_event_do_not_write(self):
        payload = self.import_payload(self.preview())
        changed = self.client.post('/api/workspace/companies/'+self.company['id']+'/actions',headers=self.headers,json={'revision':payload['revision'],'action':'note','rationale':'Independent analyst update'})
        self.assertEqual(changed.status_code,200,changed.text)
        self.assertEqual(self.client.post('/api/platform/calendly/import',headers=self.headers,json=payload).status_code,409)
        payload['revision'] = changed.json()['revision']; self.provider_event['status'] = 'canceled'
        self.assertEqual(self.client.post('/api/platform/calendly/import',headers=self.headers,json=payload).status_code,409)
        current = self.client.get('/api/workspace',headers=self.headers).json()['companies'][0]
        self.assertEqual(current['meetings'],[])

    def test_cancelled_preview_stays_cancelled_and_invalid_rows_are_skipped(self):
        self.provider_event['status'] = 'canceled'
        result = self.client.post('/api/platform/calendly/import',headers=self.headers,json=self.import_payload(self.preview()))
        self.assertEqual(result.status_code,200,result.text); self.assertEqual(result.json()['company']['meetings'][0]['status'],'Cancelled')
        for field,value in (('uri','https://evil.example/EEEEEEEE'),('end_time','2030-02-01T10:01:00Z'),('start_time','2030-02-01T10:00:00'),('event_memberships',[{'user':'https://api.calendly.com/users/BBBBBBBB'}])):
            self.provider_event = {**copy.deepcopy(EVENT),field:value}
            skipped = self.preview(); self.assertEqual(skipped['events'],[]); self.assertEqual(skipped['skipped'],1)

    def test_original_activity_time_is_preserved_future_and_naive_time_rejected(self):
        path = '/api/workspace/companies/'+self.company['id']+'/actions'
        payload = {'revision':self.company['revision'],'action':'note','rationale':'Actual reply received earlier','note_kind':'Founder response','note_at':'2025-01-01T09:00:00+05:30'}
        reply = self.client.post(path,headers=self.headers,json=payload)
        self.assertEqual(reply.status_code,200,reply.text); self.assertEqual(reply.json()['interactions'][-1]['at'],'2025-01-01T03:30:00+00:00')
        payload['revision']=reply.json()['revision']
        for timestamp in ('2099-01-01T00:00:00Z','2025-01-01T09:00:00'):
            self.assertEqual(self.client.post(path,headers=self.headers,json={**payload,'note_at':timestamp}).status_code,422)

    def test_provider_errors_are_sanitized_and_allowance_prevents_network(self):
        for status_code in (401,302,429):
            with patch('backend.calendar_integration.httpx.Client', side_effect=lambda **options:REAL_CLIENT(transport=httpx.MockTransport(lambda request:httpx.Response(status_code,text='fixture-calendar-secret PRIVATE RESPONSE')),**options)):
                response=self.client.post('/api/platform/calendly/preview',headers=self.headers,json={'consent':True})
                self.assertEqual(response.status_code,502,response.text); self.assertNotIn('fixture-calendar-secret',response.text)
        from fastapi import HTTPException
        with patch('backend.calendar_integration.reserve_provider',side_effect=HTTPException(429,'Allowance reached')):
            response=self.client.post('/api/platform/calendly/preview',headers=self.headers,json={'consent':True})
            self.assertEqual(response.status_code,429); self.assertEqual(self.calls,[])

    def test_no_retention_consent_or_deal_write_access_no_provider_fetch(self):
        from backend.workspace_repository import get_repository
        payload = self.import_payload(self.preview()); calls = len(self.calls)
        self.assertEqual(self.client.post('/api/platform/calendly/import',headers=self.headers,json={**payload,'consent':False}).status_code,422)
        app.dependency_overrides[get_repository] = lambda: SimpleNamespace(find=lambda slug:SimpleNamespace(can_write=False))
        self.assertEqual(self.client.post('/api/platform/calendly/import',headers=self.headers,json=payload).status_code,403)
        self.assertEqual(len(self.calls),calls)

    def test_response_size_bound_and_date_window_do_not_fabricate_events(self):
        with patch('backend.calendar_integration.httpx.Client',side_effect=lambda **options:REAL_CLIENT(transport=httpx.MockTransport(lambda request:httpx.Response(200,content=b'x'*(2*1024*1024+1))),**options)):
            self.assertEqual(self.client.post('/api/platform/calendly/preview',headers=self.headers,json={'consent':True}).status_code,502)
        self.provider_event['start_time']='2099-01-01T10:00:00Z'; self.provider_event['end_time']='2099-01-01T10:30:00Z'
        self.assertEqual(self.preview()['events'],[])


if __name__ == '__main__': unittest.main()
