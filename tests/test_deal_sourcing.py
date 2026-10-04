import json
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.auth import create_access_token
from backend.deal_sourcing import SourcingRequest, SignalInput, parse_feed, source_run, sign_candidate, verify_candidate, assess_signal
from backend.deal_sourcing import search_x
from backend.budgets import PublicDiscoveryBudget
from database.db import get_db
from database.models import Base, User

AT = '2026-10-04T13:40:00+00:00'


def feed(description='Photonic silicon accelerator for inference', url='https://www.producthunt.com/products/chip-fixture', published='2026-10-01T12:00:00Z'):
    return f'''<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Chip Fixture</title><published>{published}</published><link rel="alternate" href="{url}"/><content type="html">&lt;p&gt;{description}&lt;/p&gt;</content></entry></feed>'''.encode()


class SourcingLogicTests(unittest.TestCase):
    def test_chip_matches_do_not_treat_generic_ai_as_semiconductors(self):
        request = SourcingRequest()
        chips, inspected = parse_feed(feed(), request, AT)
        self.assertEqual(inspected, 1); self.assertEqual(len(chips), 1)
        self.assertEqual(chips[0]['domain'], '')
        self.assertIn('Geography and funding stage', chips[0]['gaps'])
        generic, _ = parse_feed(feed('AI agents for email and calendars').replace(b'Chip Fixture', b'Mail Helper'), request, AT)
        self.assertEqual(generic, [])

    def test_launch_window_and_keywords_are_applied(self):
        self.assertEqual(parse_feed(feed(published='2026-01-01T12:00:00Z'), SourcingRequest(), AT)[0], [])
        self.assertEqual(parse_feed(feed(), SourcingRequest(keywords='memory'), AT)[0], [])
        self.assertEqual(len(parse_feed(feed(), SourcingRequest(keywords='photonic'), AT)[0]), 1)
        self.assertEqual(parse_feed(feed(published='2027-01-01T12:00:00Z'), SourcingRequest(), AT)[0], [])

    def test_untrusted_xml_and_external_links_are_rejected(self):
        with self.assertRaises(ValueError):
            parse_feed(b'<!DOCTYPE feed [<!ENTITY x "bad">]><feed/>', SourcingRequest(), AT)
        for url in ('https://evil.com/products/x', 'https://producthunt.com.evil.com/products/x', 'https://www.producthunt.com/other', 'https://user:password@www.producthunt.com/products/x'):
            self.assertEqual(parse_feed(feed(url=url), SourcingRequest(), AT)[0], [])

    def test_duplicate_feed_entries_are_collapsed(self):
        xml = feed().decode(); entry = xml[xml.index('<entry>'):xml.index('</entry>') + 8]
        xml = xml.replace('</feed>', entry + '</feed>')
        self.assertEqual(len(parse_feed(xml.encode(), SourcingRequest(), AT)[0]), 1)

    def test_collector_failure_is_explicit_and_keeps_real_notes(self):
        with patch('backend.deal_sourcing.fetch_feed', side_effect=RuntimeError('provider private token should not appear')):
            result = source_run(SourcingRequest(), 1, None)
        self.assertEqual(len(result['candidates']), 3)
        self.assertEqual(result['sources'][1]['state'], 'Unavailable')
        self.assertNotIn('private token', json.dumps(result))

    def test_receipts_are_bound_to_owner_content_and_expiry(self):
        signed = sign_candidate({'name': 'Test'}, 1)
        self.assertEqual(verify_candidate(signed['receipt'], signed['signature'], 1)['name'], 'Test')
        for owner, receipt in ((2, signed['receipt']), (1, signed['receipt'].replace('Test', 'Edited'))):
            with self.assertRaises(HTTPException): verify_candidate(receipt, signed['signature'], owner)
        with patch('backend.deal_sourcing.time.time', return_value=0): old = sign_candidate({'name': 'Old'}, 1)
        with self.assertRaises(HTTPException): verify_candidate(old['receipt'], old['signature'], 1)

    def test_customer_language_is_not_customer_verification(self):
        used = assess_signal(SignalInput(url='https://x.com/i/status/123', excerpt='We are using these chips in our daily production workloads.'))
        self.assertEqual(used['category'], 'Possible usage signal'); self.assertEqual(used['state'], 'Unreviewed')
        self.assertIn('Not established', used['independence'])
        maker = assess_signal(SignalInput(url='https://x.com/i/status/124', excerpt='Our customers are using production accelerators every day.', relationship='Company or maker'))
        self.assertEqual(maker['category'], 'Interested-party statement')
        negative = assess_signal(SignalInput(url='https://x.com/i/status/125', excerpt='We are not using this in production because it failed.'))
        self.assertEqual(negative['category'], 'Possible complaint or mixed evidence')

    def test_x_search_uses_fixed_endpoint_and_collapses_repeated_posts(self):
        import httpx
        from types import SimpleNamespace
        observed = []
        def handler(request):
            observed.append(request)
            return httpx.Response(200, json={'data': [
                {'id': '123', 'text': 'We are using these accelerators in production every day.', 'created_at': '2026-10-04T10:00:00Z'},
                {'id': '124', 'text': 'We are using these accelerators in production every day.', 'created_at': '2026-10-04T10:01:00Z'},
                {'id': '125', 'text': 'Nice'},
            ]})
        client = httpx.Client(transport=httpx.MockTransport(handler))
        with patch.dict('os.environ', {'X_BEARER_TOKEN': 'private-fixture'}), patch('backend.deal_sourcing.httpx.Client', return_value=client):
            result = search_x({'name': 'Chip Maker " OR from:other'}, SimpleNamespace(reserve=lambda: None))
        self.assertEqual(len(result['signals']), 1)
        self.assertEqual(str(observed[0].url).split('?')[0], 'https://api.x.com/2/tweets/search/recent')
        self.assertNotIn('from:', observed[0].url.params['query'])
        self.assertEqual(result['signals'][0]['state'], 'Unreviewed')
        self.assertNotIn('private-fixture', json.dumps(result))

    def test_x_provider_errors_do_not_expose_credentials_or_response_body(self):
        import httpx
        from types import SimpleNamespace
        client = httpx.Client(transport=httpx.MockTransport(lambda request: httpx.Response(403, text='private-fixture')))
        with patch.dict('os.environ', {'X_BEARER_TOKEN': 'private-fixture'}), patch('backend.deal_sourcing.httpx.Client', return_value=client):
            with self.assertRaises(HTTPException) as failure:
                search_x({'name': 'Chip Maker'}, SimpleNamespace(reserve=lambda: None))
        self.assertNotIn('private-fixture', failure.exception.detail)
        self.assertEqual(failure.exception.status_code, 502)


class SourcingAPITests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict('os.environ', {'AUTH_PROVIDER': 'local', 'WORKSPACE_PROVIDER': 'rules', 'X_BEARER_TOKEN': ''}); self.env.start(); self.addCleanup(self.env.stop)
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine); self.factory = sessionmaker(bind=self.engine)
        with self.factory() as db:
            db.add_all([User(id=1, email='sourcing-a@example.invalid', full_name='Analyst', role='analyst', hashed_password='unused'), User(id=2, email='sourcing-b@example.invalid', full_name='Reader', role='viewer', hashed_password='unused')]); db.commit()
        def db_override():
            with self.factory() as db: yield db
        app.dependency_overrides[get_db] = db_override
        self.addCleanup(app.dependency_overrides.clear); self.addCleanup(self.engine.dispose)
        self.client = TestClient(app); self.addCleanup(self.client.close)
        self.headers = {'Authorization': 'Bearer ' + create_access_token({'sub': 'sourcing-a@example.invalid'})}
        self.reader = {'Authorization': 'Bearer ' + create_access_token({'sub': 'sourcing-b@example.invalid'})}

    def candidate(self):
        response = self.client.get('/api/workspace/sourcing/preview', headers=self.headers)
        self.assertEqual(response.status_code, 200)
        return response.json()['candidates'][0]

    def save(self, candidate, **extra):
        return self.client.post('/api/workspace/sourcing/save', headers=self.headers, json={'receipt': candidate['receipt'], 'signature': candidate['signature'], 'domain': candidate['domain'], **extra})

    def test_preview_requires_auth_and_does_not_write_company(self):
        self.assertEqual(self.client.get('/api/workspace/sourcing/preview').status_code, 401)
        self.candidate()
        self.assertEqual(self.client.get('/api/workspace', headers=self.headers).json()['companies'], [])

    def test_reader_cannot_run_provider_or_save(self):
        self.assertEqual(self.client.post('/api/workspace/sourcing/run', headers=self.reader, json={}).status_code, 403)
        c = self.candidate()
        self.assertEqual(self.client.post('/api/workspace/sourcing/save', headers=self.reader, json={'receipt': c['receipt'], 'signature': c['signature'], 'domain': c['domain']}).status_code, 403)

    def test_industry_research_auth_consent_and_ephemeral_results(self):
        payload = {'query': 'semiconductor infrastructure', 'consent': True}
        with patch('backend.industry_research.google_research', return_value={'answer': 'Cited synthetic research', 'citations': [{'url': 'https://example.org', 'title': 'Fixture', 'supports': 'Synthetic scope'}], 'suggestions': []}) as provider:
            self.assertEqual(self.client.post('/api/workspace/sourcing/research', json=payload).status_code, 401)
            self.assertEqual(self.client.post('/api/workspace/sourcing/research', headers=self.reader, json=payload).status_code, 403)
            self.assertEqual(self.client.post('/api/workspace/sourcing/research', headers=self.headers, json={**payload, 'consent': False}).status_code, 422)
            provider.assert_not_called()
            response = self.client.post('/api/workspace/sourcing/research', headers=self.headers, json=payload)
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()['sources'][0]['state'], 'Completed')
        self.assertEqual(self.client.get('/api/workspace', headers=self.headers).json()['companies'], [])

    def test_research_capabilities_require_auth_and_do_not_run_providers(self):
        with patch('backend.industry_research.httpx.Client') as network:
            self.assertEqual(self.client.get('/api/workspace/sourcing/research/capabilities').status_code, 401)
            response = self.client.get('/api/workspace/sourcing/research/capabilities', headers=self.headers)
            self.assertEqual(response.status_code, 200)
            self.assertIsInstance(response.json()['gemini']['selectable'], bool)
            self.assertEqual(self.client.get('/api/workspace/sourcing/research/capabilities', headers=self.reader).status_code, 200)
            network.assert_not_called()

    def test_explicit_intake_keeps_sources_unreviewed_and_deduplicates(self):
        c = self.candidate(); saved = self.save(c)
        self.assertEqual(saved.status_code, 200, saved.text)
        company = saved.json()['company']
        self.assertFalse(company['illustrative']); self.assertFalse(company['in_pipeline'])
        self.assertIsNone(company['fit_score']); self.assertEqual(company['geography'], 'Not evidenced')
        self.assertEqual(company['people'][0]['name'], 'Not evidenced')
        self.assertTrue(all(claim['state'] == 'Unreviewed' for claim in company['claims']))
        self.assertIsNone(company['evidence'][0]['reviewer'])
        self.assertEqual(company['sources'][0]['rights'], 'Unknown')
        repeated = self.save(c); self.assertFalse(repeated.json()['created'])
        self.assertEqual(company['revision'], repeated.json()['company']['revision'])

    def test_changed_receipt_or_domain_is_not_saved(self):
        c = self.candidate(); c['receipt'] = c['receipt'].replace('d-Matrix', 'Fake startup')
        self.assertEqual(self.save(c).status_code, 422)
        c = self.candidate(); c['domain'] = 'other-company.com'
        self.assertEqual(self.save(c).status_code, 422)

    def test_social_excerpts_need_retention_confirmation_and_collapse_repeats(self):
        c = self.candidate(); signal = {'url': 'https://www.linkedin.com/posts/customer-fixture', 'excerpt': 'We are using this accelerator in production workloads.', 'relationship': 'Customer-reported'}
        self.assertEqual(self.save(c, signals=[signal]).status_code, 422)
        result = self.save(c, signals=[signal, signal], permitted_to_retain=True)
        self.assertEqual(result.status_code, 200, result.text)
        company = result.json()['company']; self.assertEqual(len(company['sources']), 2)
        self.assertEqual(company['sources'][1]['rights'], 'User supplied')
        self.assertEqual(company['claims'][1]['state'], 'Unreviewed')

    def test_missing_x_access_does_not_invent_results(self):
        c = self.candidate()
        response = self.client.post('/api/workspace/sourcing/signals/x', headers=self.headers, json={'receipt': c['receipt'], 'signature': c['signature']})
        self.assertEqual(response.status_code, 422)
        self.assertIn('needs a private', response.json()['detail'])

    def test_unknown_thesis_fails_before_any_collector(self):
        with patch('backend.deal_sourcing.fetch_feed') as fetch:
            result = self.client.post('/api/workspace/sourcing/run', headers=self.headers, json={'focus': 'Invent winners'})
            self.assertEqual(result.status_code, 422); fetch.assert_not_called()

    def test_keyless_feed_has_atomic_local_allowance_in_hybrid_mode(self):
        from types import SimpleNamespace
        budget = PublicDiscoveryBudget(SimpleNamespace(id=1))
        with patch('backend.budgets.SessionLocal', self.factory), patch.dict('os.environ', {'AUTH_PROVIDER': 'hybrid'}):
            for _ in range(10): budget.reserve()
            with self.assertRaises(HTTPException) as blocked: budget.reserve()
        self.assertEqual(blocked.exception.status_code, 429)
