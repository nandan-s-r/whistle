"""Synthetic providers only: public research never writes company records."""
import json
import unittest
from threading import Barrier
from types import SimpleNamespace
from unittest.mock import patch
import httpx
from fastapi import HTTPException
from pydantic import ValidationError
from backend.industry_research import ResearchPrompt, extract_answer, reference_url, bounded_json, google_research, research_run, research_capabilities, industry_terms, github_search, producthunt_search


def answer():
    return {'status': 'completed', 'steps': [
        {'type': 'google_search_call', 'arguments': {'queries': ['semiconductor startup founders']}},
        {'type': 'google_search_result', 'result': [{'search_suggestions': '<a href="https://www.google.com/search?q=chips">Search</a>'}]},
        {'type': 'model_output', 'content': [{'type': 'text', 'text': 'A public company report.',
            'annotations': [{'type': 'url_citation', 'start_index': 2, 'end_index': 16,
                             'url': 'https://example.org/company', 'title': 'Company report'}]}]}]}


class IndustryResearchTests(unittest.TestCase):
    def test_utf8_citation_offsets_preserve_the_actual_supported_statement(self):
        body = answer()
        text = 'Founder résumé: नंदन builds chips.'
        block = body['steps'][2]['content'][0]
        block['text'] = text
        start = len('Founder résumé: '.encode('utf-8'))
        end = start + len('नंदन'.encode('utf-8'))
        block['annotations'][0].update(start_index=start, end_index=end)
        self.assertEqual(extract_answer(body)['citations'][0]['supports'], 'नंदन')
        block['annotations'][0]['start_index'] = start + 1
        with self.assertRaises(ValueError): extract_answer(body)

    def test_capabilities_are_boolean_configuration_not_keys_or_connection_proof(self):
        with patch.dict('os.environ', {'AUTH_PROVIDER': 'hybrid', 'GEMINI_API_KEY': 'synthetic-private-key', 'GEMINI_MODEL': 'gemini-fixture', 'FIRECRAWL_API_KEY': 'synthetic-crawl-key'}):
            local = research_capabilities(SimpleNamespace())
            cloud = research_capabilities(SimpleNamespace(supabase_token='synthetic-session'))
        self.assertFalse(local['gemini']['selectable']); self.assertFalse(local['firecrawl']['selectable'])
        self.assertTrue(cloud['gemini']['selectable']); self.assertTrue(cloud['firecrawl']['selectable'])
        self.assertIn('successful grounded answer', cloud['gemini']['detail'])
        for secret in ('synthetic-private-key', 'synthetic-crawl-key', 'synthetic-session'):
            self.assertNotIn(secret, json.dumps([local, cloud]))

    def test_producthunt_uses_industry_terms_not_a_chip_only_focus(self):
        from test_deal_sourcing import feed, AT
        seen = []
        def handler(request):
            seen.append(request)
            return httpx.Response(200, content=feed(description='Consumer shopping and retail brands', url='https://www.producthunt.com/products/consumer-fixture'))
        client = httpx.Client(transport=httpx.MockTransport(handler))
        budget = SimpleNamespace(reserve=lambda: None)
        with patch('backend.deal_sourcing.httpx.Client', return_value=client):
            result = producthunt_search('Find consumer brands and founder experience', budget, AT)
        self.assertEqual(len(result['launches']), 1); self.assertEqual(result['inspected'], 1)
        self.assertEqual(str(seen[0].url), 'https://www.producthunt.com/feed?category=undefined')
        self.assertNotIn('founder', result['terms'])
        self.assertEqual(industry_terms('Find climate startups and their founders'), ('climate',))

    def test_github_removes_instruction_words_and_keeps_fixed_search_destination(self):
        seen = []
        def handler(request):
            seen.append(request)
            return httpx.Response(200, json={'items': []})
        client = httpx.Client(transport=httpx.MockTransport(handler))
        with patch('backend.industry_research.httpx.Client', return_value=client):
            github_search('Find AI chip and semiconductor infrastructure startups and explain their founders', SimpleNamespace(reserve=lambda: None))
        self.assertTrue(seen[0].url.params['q'].startswith('semiconductor in:name,description,topics archived:false fork:false pushed:>='))
        self.assertEqual(seen[0].url.params['sort'], 'stars')
        self.assertEqual(seen[0].url.host, 'api.github.com')

    def test_developer_topic_search_filters_obvious_reference_collections(self):
        seen = []
        def handler(request):
            seen.append(request)
            return httpx.Response(200, json={'items': [
                {'full_name': 'fixture/awesome-tools', 'html_url': 'https://github.com/fixture/awesome-tools', 'description': 'Curated list'},
                {'full_name': 'fixture/company-list', 'html_url': 'https://github.com/fixture/company-list', 'description': 'This repository contains opportunities for you to apply to product companies and startups.'},
                {'full_name': 'fixture/product', 'html_url': 'https://github.com/fixture/product', 'description': 'Deployment tools', 'stargazers_count': 10, 'updated_at': '2026-10-04T00:00:00Z'}]})
        client = httpx.Client(transport=httpx.MockTransport(handler))
        with patch('backend.industry_research.httpx.Client', return_value=client):
            result = github_search('Find developer tool startups', SimpleNamespace(reserve=lambda: None))
        self.assertTrue(seen[0].url.params['q'].startswith('topic:developer-tools '))
        self.assertEqual([r['name'] for r in result], ['fixture/product'])

    def test_rate_limited_gemini_does_not_discard_successful_public_results(self):
        with patch('backend.industry_research.google_research', side_effect=HTTPException(429, 'Allowance used')), \
                patch('backend.industry_research.github_search', return_value=[{'name': 'fixture/chip'}]):
            result = research_run(ResearchPrompt(query='semiconductor infrastructure', consent=True, github=True), None, None)
        self.assertEqual(len(result['repositories']), 1)
        self.assertEqual([s['state'] for s in result['sources']], ['Limit reached', 'Completed'])

    def test_public_only_selection_never_calls_private_providers_and_empty_selection_fails(self):
        with patch('backend.industry_research.google_research') as google, patch('backend.industry_research.firecrawl_search') as crawler, \
                patch('backend.industry_research.producthunt_search', return_value={'launches': [], 'terms': ['consumer'], 'inspected': 1}):
            result = research_run(ResearchPrompt(query='consumer brand startups', consent=True, gemini=False, producthunt=True), None, None)
            self.assertEqual(result['sources'][0]['name'], 'Product Hunt public feed')
            google.assert_not_called(); crawler.assert_not_called()
            with self.assertRaises(HTTPException):
                research_run(ResearchPrompt(query='consumer brand startups', consent=True, gemini=False), None, None)

    def test_independent_sources_overlap_and_results_keep_deterministic_order(self):
        ready = Barrier(2)
        def google(*args):
            ready.wait(timeout=2)
            return {'answer': 'Synthetic cited brief'}
        def github(*args):
            ready.wait(timeout=2)
            return [{'name': 'fixture/chip'}]
        with patch('backend.industry_research.google_research', side_effect=google), patch('backend.industry_research.github_search', side_effect=github):
            result = research_run(ResearchPrompt(query='semiconductor infrastructure', consent=True, github=True), None, None)
        self.assertEqual(result['answer'], 'Synthetic cited brief')
        self.assertEqual([s['name'] for s in result['sources']], ['Gemini + Google Search', 'GitHub public API'])
        self.assertTrue(all(s['state'] == 'Completed' for s in result['sources']))

    def test_answer_preserves_citation_scope_without_auto_verification(self):
        result = extract_answer(answer())
        self.assertEqual(result['citations'][0]['supports'], 'public company')
        self.assertEqual(result['answer'], 'A public company report.')
        self.assertEqual(result['queries'], ['semiconductor startup founders'])
        self.assertNotIn('verified', result)

    def test_uncited_incomplete_and_invalid_citation_answers_fail(self):
        for change in ('status', 'queries', 'url', 'index'):
            body = answer()
            if change == 'status': body['status'] = 'in_progress'
            if change == 'queries': body['steps'][0]['arguments']['queries'] = []
            if change == 'url': body['steps'][2]['content'][0]['annotations'][0]['url'] = 'https://127.0.0.1/private'
            if change == 'index': body['steps'][2]['content'][0]['annotations'][0]['end_index'] = 999
            with self.assertRaises(ValueError): extract_answer(body)

    def test_research_requires_consent_and_rejects_credentials_before_providers(self):
        with patch('backend.industry_research.google_research') as provider:
            with self.assertRaises(HTTPException): research_run(ResearchPrompt(query='semiconductor infrastructure'), None, None)
            with patch.dict('os.environ', {'GEMINI_API_KEY': 'synthetic-private-key'}):
                with self.assertRaises(HTTPException): research_run(ResearchPrompt(query='research synthetic-private-key', consent=True), None, None)
            with self.assertRaises(HTTPException): research_run(ResearchPrompt(query='research api_key=unshared-example', consent=True), None, None)
            provider.assert_not_called()
        with self.assertRaises(ValidationError): ResearchPrompt(query='chips')
        with self.assertRaises(ValidationError): ResearchPrompt(query='chip infrastructure', secret='unexpected')

    def test_reference_links_reject_private_credentials_and_unsafe_schemes(self):
        for url in ('http://example.org', 'https://user:pass@example.org', 'https://localhost/x', 'https://example.org/?api_key=abc', 'javascript:alert(1)'):
            with self.assertRaises(ValueError): reference_url(url)
        self.assertEqual(reference_url('https://example.org/article?id=4'), 'https://example.org/article?id=4')

    def test_google_uses_fixed_destination_header_key_and_nonstored_interaction(self):
        observed = []
        def handler(request):
            observed.append(request)
            return httpx.Response(200, json=answer())
        client = httpx.Client(transport=httpx.MockTransport(handler))
        budget = SimpleNamespace(reserve=lambda: None)
        with patch.dict('os.environ', {'GEMINI_API_KEY': 'synthetic-private-key', 'GEMINI_MODEL': 'gemini-3.8-flash'}), patch('backend.industry_research.httpx.Client', return_value=client):
            result = google_research('semiconductor infrastructure', budget)
        request = observed[0]
        self.assertEqual(str(request.url), 'https://generativelanguage.googleapis.com/v1beta/interactions')
        self.assertEqual(request.headers['x-goog-api-key'], 'synthetic-private-key')
        payload = json.loads(request.content)
        self.assertFalse(payload['store']); self.assertEqual(payload['tools'], [{'type': 'google_search'}])
        self.assertNotIn('synthetic-private-key', json.dumps(result))

    def test_oversized_response_and_redirect_are_not_accepted(self):
        for status, content in ((200, b'x' * 50), (302, b'')):
            with httpx.Client(transport=httpx.MockTransport(lambda request: httpx.Response(status, content=content, headers={'Location': 'https://localhost/private'})), follow_redirects=False) as client, patch('backend.industry_research.MAX_RESPONSE', 20):
                with self.assertRaises((ValueError, httpx.HTTPStatusError)):
                    bounded_json(client, 'GET', 'https://example.org')

    def test_failed_private_provider_keeps_public_results_and_hides_error_body(self):
        with patch('backend.industry_research.google_research', side_effect=RuntimeError('private-provider-secret')), patch('backend.industry_research.github_search', return_value=[{'name': 'owner/chip', 'url': 'https://github.com/owner/chip'}]):
            result = research_run(ResearchPrompt(query='semiconductor infrastructure', consent=True, github=True), None, None)
        self.assertEqual(result['answer'], ''); self.assertEqual(len(result['repositories']), 1)
        self.assertEqual([s['state'] for s in result['sources']], ['Unavailable', 'Completed'])
        self.assertNotIn('private-provider-secret', json.dumps(result))
