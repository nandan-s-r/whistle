"""Malformed shared fixtures cannot deny access to unrelated authorized records."""
import unittest
from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import patch
from fastapi import HTTPException
import test_review_workflows as review
from database.funds import FundCompany
from backend.stored_records import authorized_partition, stored_company
from backend.workspace_demo import demo_companies


class StoredRecordTests(unittest.TestCase):
    setUp = review.ReviewWorkflowTests.setUp
    tearDown = review.ReviewWorkflowTests.tearDown
    auth = review.ReviewWorkflowTests.auth
    company = review.ReviewWorkflowTests.company
    action = review.ReviewWorkflowTests.action

    def poison(self):
        fund = self.client.post('/api/workspace/funds', headers=self.headers, json={'name': 'Fixture fund'}).json()['id']
        c = self.company()
        shared = self.client.post(f'/api/workspace/funds/{fund}/records', headers=self.headers, json={'company_id': c['id'], 'revision': c['revision'], 'disclosure_confirmed': True}).json()
        member = self.client.post(f'/api/workspace/funds/{fund}/members', headers=self.headers, json={'email': 'other@test.invalid', 'role': 'Viewer'}).json()['member_id']
        self.client.post(f"/api/workspace/funds/{fund}/records/{shared['id']}/grants", headers=self.headers, json={'member_id': member, 'role': 'Viewer'})
        with self.factory() as db:
            row = db.query(FundCompany).filter_by(slug=shared['id']).one()
            broken = deepcopy(row.data); broken.pop('people'); row.data = broken; db.commit()
        return fund, shared

    def test_shared_corruption_is_quarantined_and_personal_search_intake_still_work(self):
        _, shared = self.poison()
        result = self.client.get('/api/workspace', headers=self.headers)
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(len(result.json()['companies']), 4)
        self.assertEqual(result.json()['quarantined_records'][0]['id'], shared['id'])
        search = self.client.post('/api/workspace/search', headers=self.headers, json={})
        self.assertEqual(search.status_code, 200); self.assertEqual(len(search.json()['quarantined_records']), 1)
        intake = self.client.post('/api/workspace/companies', headers=self.headers, json={'name': 'New fixture', 'domain': 'new-fixture.example', 'founder_name': 'Not evidenced', 'sector': 'Chips', 'geography': 'Unknown', 'stage': 'Unknown'})
        self.assertEqual(intake.status_code, 200, intake.text)
        other = self.client.get('/api/workspace', headers=self.auth('other')).json()
        self.assertEqual(other['companies'], []); self.assertEqual(len(other['quarantined_records']), 1)
        self.assertEqual(self.client.get('/api/workspace', headers=self.auth('read')).json()['quarantined_records'], [])

    def test_repair_error_keeps_role_scope_history_and_access_administration(self):
        fund, shared = self.poison()
        path = f"/api/workspace/companies/{shared['id']}"
        read = self.client.get(path + '/deliverable', headers=self.headers, params={'format': 'xlsx', 'revision': shared['revision']})
        self.assertEqual(read.status_code, 409)
        self.assertNotIn('people', read.text)
        denied = self.client.post(path + '/actions', headers=self.auth('other'), json={'action': 'note', 'revision': shared['revision'], 'rationale': 'Read-only user cannot change this.'})
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(self.client.get(path + '/history', headers=self.auth('other')).status_code, 200)
        self.assertEqual(self.client.get(path + '/history', headers=self.auth('read')).status_code, 404)
        self.assertEqual(self.client.get(f'/api/workspace/funds/{fund}', headers=self.headers).status_code, 200)

    def test_alternate_parser_failure_domains_and_timestamps_are_contained(self):
        valid = demo_companies('Fixture')[0].model_dump(mode='json')
        for change in ({'people': []}, {'memos': [{}]}, {'models': [{}]}, {'memos': [{}], 'memo_comments': [{'id': 'comment', 'memo_version': 1, 'text': 'A comment', 'actor': 'Fixture', 'at': valid['signal_at']}]}, {'domain': 'invalid:broken'}, {'signal_at': 'not-a-date'}, {'signal_at': '2026-10-04T10:00:00'}):
            row = SimpleNamespace(data={**valid, **change}, slug='authorized-broken', revision=2, fund_record=True)
            with self.assertRaises(HTTPException) as error: stored_company(row)
            self.assertEqual(error.exception.status_code, 409)
            accepted, quarantine = authorized_partition(SimpleNamespace(companies=lambda: [row, SimpleNamespace(data=valid, slug='valid', revision=1)]))
            self.assertEqual(len(accepted), 1); self.assertEqual(len(quarantine), 1)

    def test_infrastructure_failure_is_not_silenced(self):
        with self.assertRaises(RuntimeError):
            authorized_partition(SimpleNamespace(companies=lambda: (_ for _ in ()).throw(RuntimeError('database unavailable'))))

    def test_legal_json_strings_cannot_coerce_to_nonfinite_response_numbers(self):
        valid = demo_companies('Fixture')[0].model_dump(mode='json')
        for value in ('NaN', 'Infinity', '-Infinity', '1e999'):
            broken = deepcopy(valid); broken['assumptions'][0]['value'] = value
            row = SimpleNamespace(data=broken, slug='authorized-broken', revision=2)
            with self.assertRaises(HTTPException) as error: stored_company(row)
            self.assertEqual(error.exception.status_code, 409)
            rows, quarantined = authorized_partition(SimpleNamespace(companies=lambda: [row]))
            self.assertEqual(rows, []); self.assertEqual(len(quarantined), 1)

    def test_nonfinite_shared_value_does_not_break_actual_json_workspace_response(self):
        _, shared = self.poison()
        with self.factory() as db:
            row = db.query(FundCompany).filter_by(slug=shared['id']).one()
            broken = demo_companies('Fixture')[0].model_dump(mode='json')
            broken['id'] = shared['id']; broken['assumptions'][0]['value'] = 'NaN'
            row.data = broken; db.commit()
        response = self.client.get('/api/workspace', headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(len(response.json()['companies']), 4)
        self.assertEqual(len(response.json()['quarantined_records']), 1)

    def test_response_and_contact_are_explicit_recorded_activity(self):
        for kind in ('Founder response', 'Outbound contact', 'Analyst note'):
            result = self.action('note', rationale='Authorized manually recorded fixture activity.', note_kind=kind)
            self.assertEqual(result.status_code, 200, result.text)
            self.assertEqual(result.json()['interactions'][-1]['kind'], kind)
        self.assertEqual(self.action('note', rationale='Cannot invent a sync event.', note_kind='Email synchronized').status_code, 422)
