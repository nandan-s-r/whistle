import json
import os
import unittest
from unittest.mock import patch, Mock
import httpx
from backend.workspace_demo import demo_companies
from backend.workspace_provider import generate_draft, provider_status


class ProviderPrivacyTests(unittest.TestCase):
    def test_gemini_credential_scope_schema_and_redaction(self):
        secret='synthetic-gemini-credential-123'
        def respond(request):
            self.assertEqual(request.url.host, 'generativelanguage.googleapis.com')
            self.assertEqual(request.headers['x-goog-api-key'], secret)
            self.assertNotIn(secret, str(request.url))
            body=json.loads(request.content)
            self.assertFalse(body['store'])
            self.assertNotIn(secret, request.content.decode())
            self.assertIn('source_ids', body['generationConfig']['responseFormat']['text']['schema']['required'])
            output=json.dumps({'draft':'Inspect [S01]. '+secret, 'source_ids':['S01']})
            return httpx.Response(200, json={'candidates':[{'finishReason':'STOP', 'content':{'parts':[{'text':output}]}}]})
        real_client=httpx.Client
        with patch.dict(os.environ, {'WORKSPACE_PROVIDER':'gemini', 'GEMINI_MODEL':'test-model', 'GEMINI_API_KEY':secret}, clear=True), patch('backend.workspace_provider.httpx.Client', side_effect=lambda **kwargs:real_client(transport=httpx.MockTransport(respond), **kwargs)):
            status,draft,refs=generate_draft('Challenge this claim', demo_companies('Test')[0],Mock())
            self.assertEqual(status['provider'], 'Gemini')
            self.assertNotIn(secret, json.dumps(status))
            self.assertNotIn(secret, draft)
            self.assertEqual(refs, ['S01'])

    def test_gemini_missing_config_uses_explicit_rules(self):
        with patch.dict(os.environ, {'WORKSPACE_PROVIDER':'gemini'}, clear=True):
            self.assertFalse(provider_status()['configured'])
            self.assertEqual(provider_status()['provider'], 'Rules-based templates')

    def test_secret_is_only_in_authorization_and_never_returned(self):
        # Synthetic sentinel only; no real credential is read or used by this test.
        secret = 'synthetic-test-credential-123'
        def respond(request):
            self.assertEqual(request.headers['Authorization'], 'Bearer '+secret)
            self.assertNotIn(secret, request.content.decode())
            content = json.dumps({'draft':'Reviewed [S01]. '+secret, 'source_ids':['S01']})
            return httpx.Response(200, json={'choices':[{'message':{'content':content}}]})
        real_client = httpx.Client
        env = {'WORKSPACE_MODEL_URL':'https://provider.test/v1', 'WORKSPACE_MODEL':'test-model', 'WORKSPACE_MODEL_KEY':secret}
        with patch.dict(os.environ, env, clear=True), patch('backend.workspace_provider.httpx.Client', side_effect=lambda **kwargs:real_client(transport=httpx.MockTransport(respond), **kwargs)):
            status, draft, _ = generate_draft('Challenge this claim', demo_companies('Test')[0],Mock())
            self.assertNotIn(secret, json.dumps(status))
            self.assertNotIn(secret, draft)
            self.assertIn('[credential removed]', draft)

    def test_http_hosted_endpoint_rejected_before_request(self):
        with patch.dict(os.environ, {'WORKSPACE_MODEL_URL':'http://provider.test/v1', 'WORKSPACE_MODEL':'test'}, clear=True):
            with self.assertRaisesRegex(ValueError, 'HTTPS'):
                generate_draft('Challenge this claim', demo_companies('Test')[0],Mock())

    def test_undeclared_inline_citation_is_rejected(self):
        def respond(request):
            return httpx.Response(200, json={'choices':[{'message':{'content':json.dumps({'draft':'Unsupported [S99]', 'source_ids':['S01']})}}]})
        real_client=httpx.Client
        with patch.dict(os.environ, {'WORKSPACE_MODEL_URL':'https://provider.test/v1', 'WORKSPACE_MODEL':'test'}, clear=True), patch('backend.workspace_provider.httpx.Client', side_effect=lambda **kwargs:real_client(transport=httpx.MockTransport(respond), **kwargs)):
            with self.assertRaises(ValueError):
                generate_draft('Challenge this claim', demo_companies('Test')[0],Mock())

    def test_rules_tasks_are_distinct_and_do_not_invent_company_conflicts(self):
        c = demo_companies('Test')[0]
        with patch.dict(os.environ, {}, clear=True):
            self.assertFalse(provider_status()['configured'])
            conflict = generate_draft('Identify conflicting evidence', c)[1]
            questions = generate_draft('Draft customer-reference questions', c)[1]
            self.assertNotEqual(conflict, questions)
            self.assertIn('Interview plan', questions)
            c.claims=[]
            c.evidence=[]
            c.sources=[]
            empty = generate_draft('Challenge this claim', c)[1]
            self.assertNotIn('conflicting sales-cycle', empty)
            self.assertIn('No unresolved claims', empty)
