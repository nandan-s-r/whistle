"""Account persistence in isolated storage; no real accounts or passwords used."""
import unittest
import time
from collections import defaultdict
from unittest.mock import patch
import jwt
from fastapi.testclient import TestClient
from backend.api import app
import test_review_workflows as review


class ReturningLocalAccountTests(unittest.TestCase):
    setUp = review.ReviewWorkflowTests.setUp
    tearDown = review.ReviewWorkflowTests.tearDown
    auth = review.ReviewWorkflowTests.auth

    def test_returning_signin_restores_same_owned_company_and_signup_session_lifetime(self):
        # Entering TestClient's lifespan must use only this test's database and
        # must not leave an embedded worker running against later test fixtures.
        with patch('backend.api.login_signup_rate_limit_data', defaultdict(list)), \
                patch.dict('os.environ', {'AUTH_PROVIDER': 'local', 'JOB_WORKER_MODE': 'external'}), \
                patch('backend.api.engine', self.engine), \
                patch('backend.api.SessionLocal', self.factory), \
                patch('backend.worker.run') as worker:
            created = self.client.post('/api/auth/signup', json={'email': 'returning@example.invalid', 'full_name': 'Returning fixture', 'password': 'SyntheticPrivateFixture1!'})
            self.assertEqual(created.status_code, 200, created.text)
            token = created.json()['access_token']
            expiry = jwt.decode(token, options={'verify_signature': False})['exp'] - time.time()
            self.assertGreater(expiry, 604700); self.assertLessEqual(expiry, 604800)
            headers = {'Authorization': 'Bearer ' + token}
            saved = self.client.post('/api/workspace/companies', headers=headers, json={'name': 'Persistent fixture', 'domain': 'persistent-fixture.example', 'founder_name': 'Unverified person', 'sector': 'Chips', 'stage': 'Unknown', 'geography': 'Unknown'})
            self.assertEqual(saved.status_code, 200, saved.text)
            with TestClient(app) as returning:
                login = returning.post('/api/auth/login', data={'username': 'returning@example.invalid', 'password': 'SyntheticPrivateFixture1!'})
                self.assertEqual(login.status_code, 200, login.text)
                headers = {'Authorization': 'Bearer ' + login.json()['access_token']}
                records = returning.get('/api/workspace', headers=headers)
                self.assertEqual(records.status_code, 200, records.text)
                self.assertEqual([c['id'] for c in records.json()['companies']], [saved.json()['company']['id']])
                self.assertEqual(returning.get('/api/auth/me', headers=headers).json()['email'], 'returning@example.invalid')
            worker.assert_not_called()
            with self.factory() as db:
                from database.models import User
                identity = db.query(User).filter_by(email='returning@example.invalid').one()
                self.assertNotEqual(identity.hashed_password, 'SyntheticPrivateFixture1!')
