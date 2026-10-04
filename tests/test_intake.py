import unittest
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.schema import CreateTable
from sqlalchemy.dialects import postgresql
from fastapi.testclient import TestClient
from backend.api import app
from backend.auth import create_access_token
from database.db import get_db
from database.models import Base, User
from database.urls import normalize_database_url
from scripts.migrate_sqlite_to_postgres import copy_records


class IntakeTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.factory = sessionmaker(bind=self.engine)
        with self.factory() as db:
            db.add_all([User(email=email, full_name=role, role=role, hashed_password='unused')
                        for email, role in [('a@example.test', 'analyst'), ('b@example.test', 'analyst'), ('r@example.test', 'reader')]])
            db.commit()
        def test_db():
            with self.factory() as db:
                yield db
        app.dependency_overrides[get_db] = test_db
        self.client = TestClient(app)
        self.headers = self.auth('a@example.test')
        self.payload = dict(name='Public Research Co', domain='https://www.research.test/about', geography='India',
                            sector='B2B SaaS', stage='Not evidenced', founder_name='Research Person')

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.engine.dispose()

    def auth(self, email):
        return {'Authorization': 'Bearer ' + create_access_token({'sub': email})}

    def create(self):
        result = self.client.post('/api/workspace/companies', headers=self.headers, json=self.payload)
        self.assertEqual(result.status_code, 200, result.text)
        return result.json()['company']

    def capture(self, company, **changes):
        values = dict(title='Official company page', url='https://research.test/about', excerpt='The company builds business workflow software.',
                      captured_at=datetime.now(timezone.utc).isoformat(), statement='The company builds business workflow software.', topic='company')
        values.update(changes)
        return self.client.post(f"/api/workspace/companies/{company['id']}/actions", headers=self.headers,
                                json={'action': 'capture_source', 'revision': company['revision'], 'capture': values})

    def test_unscored_real_record_has_no_invented_data(self):
        c = self.create()
        self.assertEqual(c['domain'], 'research.test')
        self.assertFalse(c['illustrative'])
        self.assertEqual(c['disposition'], 'Unreviewed')
        self.assertIsNone(c['fit_score'])
        for key in ('sources', 'evidence', 'claims', 'models', 'metrics', 'risks'):
            self.assertEqual(c[key], [])
        self.assertTrue(all(a['value'] is None and a['source_id'] is None for a in c['assumptions']))

    def test_canonical_duplicate_does_not_overwrite(self):
        c = self.create()
        result = self.client.post('/api/workspace/companies', headers=self.headers,
                                 json={**self.payload, 'domain': 'http://RESEARCH.test/', 'name': 'Overwrite attempt'}).json()
        self.assertFalse(result['created'])
        self.assertEqual(result['company'], c)
        self.assertEqual(len(self.client.get('/api/workspace', headers=self.headers).json()['companies']), 1)

    def test_authenticated_roles_and_owner_isolation(self):
        c = self.create()
        self.assertEqual(self.client.post('/api/workspace/companies', json=self.payload).status_code, 401)
        self.assertEqual(self.client.post('/api/workspace/companies', headers=self.auth('r@example.test'), json=self.payload).status_code, 403)
        other = self.client.post('/api/workspace/companies', headers=self.auth('b@example.test'), json=self.payload)
        self.assertTrue(other.json()['created'])
        self.assertEqual(self.client.get(f"/api/workspace/companies/{c['id']}/history", headers=self.auth('r@example.test')).status_code, 404)

    def test_capture_reciprocal_links_and_review_gate(self):
        c = self.create()
        self.assertEqual(self.capture(c, state='Verified').status_code, 422)
        result = self.capture(c, state='Verified', reviewed=True, rationale='Reviewed the exact product statement on the official page.')
        self.assertEqual(result.status_code, 200, result.text)
        saved = result.json()
        self.assertEqual(saved['claims'][0]['state'], 'Verified')
        self.assertEqual(saved['evidence'][0]['source_id'], saved['sources'][0]['id'])
        self.assertEqual(saved['claims'][0]['evidence_ids'], [saved['evidence'][0]['id']])
        self.assertEqual(saved['reviews'][0]['reviewer'], 'analyst')
        self.assertFalse(saved['sources'][0]['illustrative'])
        self.assertEqual(self.capture(saved).status_code, 409)
        self.assertEqual(self.capture(c, excerpt='A different supporting statement.').status_code, 409)

    def test_contradiction_preserves_canonical_value_and_audit(self):
        saved = self.capture(self.create()).json()
        claim = saved['claims'][0]
        result = self.capture(saved, claim_id=claim['id'], relationship='contradicts',
                              url='https://research.test/update', excerpt='The company no longer sells the earlier workflow software.').json()
        self.assertEqual(result['claims'][0]['state'], 'Conflicted')
        self.assertEqual(result['claims'][0]['statement'], claim['statement'])
        self.assertEqual(result['reviews'][-1]['previous'], 'Founder-reported')
        self.assertEqual(len(result['claims'][0]['evidence_ids']), 2)
        history = self.client.get(f"/api/workspace/companies/{saved['id']}/history", headers=self.headers).json()
        self.assertEqual(history[0]['action'], 'capture_source')
        self.assertEqual(history[0]['previous_revision'], saved['revision'])

    def test_invalid_sources_and_formula_requirements(self):
        c = self.create()
        for values in [{'url':'javascript:alert(1)'}, {'url':'https://username:password@research.test/'},
                       {'captured_at': (datetime.now(timezone.utc)+timedelta(days=1)).isoformat()},
                       {'state':'Calculated'}, {'claim_id':'another-company-claim'}]:
            self.assertEqual(self.capture(c, **values).status_code, 422, values)
        self.assertEqual(self.capture(c, state='Calculated', calculation='100 / 10 = 10; inputs are analyst assumptions.').status_code, 200)

    def test_manual_first_demo_initialization_preserves_record(self):
        c = self.create()
        for _ in range(2):
            self.assertEqual(self.client.post('/api/workspace/demo', headers=self.headers).status_code, 200)
        companies = self.client.get('/api/workspace', headers=self.headers).json()['companies']
        self.assertEqual(len(companies), 5)
        self.assertEqual(next(item for item in companies if item['id'] == c['id']), c)

    def test_real_screen_and_frozen_memo_use_company_evidence(self):
        c = self.capture(self.create(), state='Verified', reviewed=True, rationale='Product statement reviewed.').json()
        def act(action, **kwargs):
            nonlocal c
            result = self.client.post(f"/api/workspace/companies/{c['id']}/actions", headers=self.headers,
                                      json={'action':action, 'revision':c['revision'], **kwargs})
            self.assertEqual(result.status_code, 200, result.text)
            c = result.json()
        act('screen')
        self.assertIn('Not scored', c['screening'])
        self.assertIn(c['sources'][0]['id'], c['screening'])
        self.assertNotIn('[S01]', c['screening'])
        self.assertNotIn('92 days', c['screening'])
        act('model', inputs=dict(pre_money=8000000, check=500000, dilution=.35, follow_on=350000,
                                follow_on_post_money=20000000, years=5, arr=18000000, multiple=7), rationale='Explicit scenario assumptions, not public metrics.')
        act('memo')
        text = c['memos'][0]['text']
        for heading in ('WHY THIS TEAM', 'WHY THIS MARKET', 'WHY THE COMPANY CAN WIN', 'DISSENT', 'MONITORING TRIGGERS'):
            self.assertIn(heading, text)
        self.assertIn(c['sources'][0]['id'], text)
        self.assertIn('No approved founder-background claim', text)
        self.assertNotIn('Illustrative scenario', text)
        frozen = c['memos'][0]
        act('note', rationale='Changed analyst view after memo freeze.')
        self.assertEqual(c['memos'][0], frozen)


class PostgresReadinessTests(unittest.TestCase):
    def test_url_driver_and_schema_compile(self):
        for prefix in ('postgres://', 'postgresql://'):
            self.assertEqual(normalize_database_url(prefix+'user:pass@localhost/db'), 'postgresql+psycopg://user:pass@localhost/db')
        self.assertEqual(normalize_database_url('sqlite:///local.db'), 'sqlite:///local.db')
        for table in Base.metadata.sorted_tables:
            self.assertTrue(str(CreateTable(table).compile(dialect=postgresql.dialect())))

    def test_migration_rejects_wrong_destination(self):
        engine = create_engine('sqlite://')
        try:
            with self.assertRaisesRegex(ValueError, 'PostgreSQL destination'):
                copy_records(engine, engine)
        finally:
            engine.dispose()
