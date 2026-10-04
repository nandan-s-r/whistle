import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch, Mock

from fastapi import HTTPException
from backend.platform_api import connections, queue, knowledge
from backend.platform_capabilities import task_capabilities
from backend.ingestion import JobRequest
from backend.workspace_demo import demo_companies


class ConnectionReadinessTests(unittest.TestCase):
    def setUp(self):
        env = patch.dict(os.environ, {'AUTH_PROVIDER':'local', 'JOB_WORKER_MODE':'external'}, clear=True)
        env.start(); self.addCleanup(env.stop)
        self.local = SimpleNamespace(id=1, role='analyst', is_active=True)
        self.cloud = SimpleNamespace(id='fixture-cloud-owner', role='analyst', is_active=True, supabase_token='fixture-user-token')

    def catalog(self, user):
        result = connections(user)
        return {row['name']:row for row in result['connections']}

    def test_configured_keys_are_not_reported_as_live_connections(self):
        with patch.dict(os.environ, {'AUTH_PROVIDER':'hybrid', 'GEMINI_API_KEY':'fixture-private-key', 'GEMINI_MODEL':'valid-model', 'FIRECRAWL_API_KEY':'fixture-firecrawl', 'X_BEARER_TOKEN':'fixture-x', 'SENTRY_DSN':'fixture-dsn'}):
            result = connections(self.local)
            rows = {r['name']:r for r in result['connections']}
            self.assertEqual(rows['Gemini research']['state'], 'Cloud sign-in required')
            self.assertEqual(rows['Firecrawl web ingestion']['state'], 'Cloud sign-in required')
            self.assertEqual(rows['X customer signals']['state'], 'Cloud sign-in required')
            self.assertEqual(rows['Sentry']['state'], 'Configured · untested')
            for value in ('fixture-private-key','fixture-firecrawl','fixture-x','fixture-dsn'):
                self.assertNotIn(value, json.dumps(result))
            self.assertIn('Configuration only', result['check_scope'])

    def test_cloud_identity_does_not_establish_index_or_storage_acceptance(self):
        rows = self.catalog(self.cloud)
        self.assertEqual(rows['Supabase Auth, RLS & Storage']['state'], 'Cloud session active')
        self.assertEqual(rows['Knowledge search · pgvector']['state'], 'Needs setup')
        self.assertEqual(rows['Background jobs']['state'], 'Needs worker setup')

    def test_empty_cloud_token_is_local(self):
        self.assertEqual(connections(SimpleNamespace(id=1,supabase_token=''))['mode'], 'Local workspace')

    def test_worker_account_database_mismatch_blocks_admission(self):
        for user, database in ((self.local,'supabase'), (self.cloud,'local')):
            with patch.dict(os.environ, {'JOB_DATABASE':database, 'SUPABASE_SERVICE_ROLE_KEY':'fixture-worker'}):
                self.assertFalse(task_capabilities(user)['research_draft']['selectable'])
                repo = Mock(); repo.find.return_value = demo_companies('Fixture')[0]
                with patch('backend.platform_api.JobStore') as store:
                    with self.assertRaises(HTTPException) as caught:
                        queue(JobRequest(company_slug=repo.find.return_value.id,kind='research_draft'),user,repo)
                    self.assertEqual(caught.exception.status_code,422); store.assert_not_called()

    def test_hybrid_paid_research_is_rejected_before_job_creation(self):
        with patch.dict(os.environ, {'AUTH_PROVIDER':'hybrid','WORKSPACE_PROVIDER':'gemini','GEMINI_API_KEY':'fixture','GEMINI_MODEL':'valid-model'}):
            repo = Mock(); repo.find.return_value = demo_companies('Fixture')[0]
            with patch('backend.platform_api.JobStore') as store:
                with self.assertRaises(HTTPException):
                    queue(JobRequest(company_slug=repo.find.return_value.id,kind='research_draft'),self.local,repo)
                store.assert_not_called()

    def test_rules_remain_available_without_provider_keys(self):
        caps = task_capabilities(self.local)
        self.assertTrue(caps['research_draft']['selectable'])
        self.assertIn('Rules-based',caps['research_draft']['detail'])
        self.assertFalse(caps['web_capture']['selectable'])

    def test_embedding_setup_and_worker_are_separate_requirements(self):
        with patch.dict(os.environ, {'GEMINI_API_KEY':'fixture','GEMINI_EMBEDDING_MODEL':'gemini-embedding-001'}):
            caps = task_capabilities(self.cloud)
            self.assertTrue(caps['knowledge_search']['selectable'])
            self.assertFalse(caps['index_evidence']['selectable'])
            with patch.dict(os.environ, {'JOB_DATABASE':'supabase','SUPABASE_SERVICE_ROLE_KEY':'fixture-worker'}):
                self.assertTrue(task_capabilities(self.cloud)['index_evidence']['selectable'])
            with patch.dict(os.environ, {'GEMINI_EMBEDDING_MODEL':'unsupported-model'}):
                self.assertFalse(task_capabilities(self.cloud)['knowledge_search']['selectable'])

    def test_invalid_embedding_configuration_fails_before_provider(self):
        from backend.platform_api import KnowledgeQuery
        with patch('backend.platform_api.embed') as embed:
            with self.assertRaises(HTTPException): knowledge(KnowledgeQuery(query='founder evidence'),self.cloud)
            embed.assert_not_called()

    def test_production_embedded_worker_is_not_claimed_running(self):
        with patch.dict(os.environ, {'JOB_WORKER_MODE':'embedded','ENVIRONMENT':'production'}):
            self.assertFalse(task_capabilities(self.local)['worker']['selectable'])
        with patch.dict(os.environ, {'JOB_WORKER_MODE':'invalid'}):
            self.assertFalse(task_capabilities(self.local)['worker']['selectable'])

    def test_configured_fund_flag_matches_repository_case_handling(self):
        with patch.dict(os.environ, {'FUND_ACCESS_ENABLED':'TRUE'}):
            self.assertEqual(self.catalog(self.cloud)['Team deal access']['state'],'Configured · untested')
