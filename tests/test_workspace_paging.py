import unittest
from types import SimpleNamespace
from unittest.mock import Mock
from fastapi import HTTPException
from backend.workspace_repository import CloudRepository


class WorkspacePagingTests(unittest.TestCase):
    def test_all_pages_are_read_even_when_server_limit_is_lower_than_requested(self):
        repo=CloudRepository(SimpleNamespace(supabase_token='synthetic-token'))
        repo.gateway.request=Mock(side_effect=[[{'id':'0001'},{'id':'0002'}],[{'id':'0003'}],[]])
        self.assertEqual([r.id for r in repo.companies()],['0001','0002','0003'])
        calls=repo.gateway.request.call_args_list
        self.assertNotIn('id',calls[0].kwargs['params'])
        self.assertEqual(calls[1].kwargs['params']['id'],'gt.0002')
        self.assertEqual(calls[2].kwargs['params']['id'],'gt.0003')

    def test_nonadvancing_page_does_not_return_silent_partial_results(self):
        repo=CloudRepository(SimpleNamespace(supabase_token='synthetic-token'))
        repo.gateway.request=Mock(side_effect=[[{'id':'0001'}],[{'id':'0001'}]])
        with self.assertRaises(HTTPException) as error:repo.companies()
        self.assertEqual(error.exception.status_code,502)

    def test_snapshot_query_uses_owned_company_and_exact_revision(self):
        repo=CloudRepository(SimpleNamespace(supabase_token='synthetic-token'))
        repo.gateway.request=Mock(return_value=[{'snapshot':{'name':'Original research'}}])
        self.assertEqual(repo.revision_snapshot(SimpleNamespace(id='owned-id'),12)['name'],'Original research')
        self.assertEqual(repo.gateway.request.call_args.kwargs['params']['company_id'],'eq.owned-id')
        self.assertEqual(repo.gateway.request.call_args.kwargs['params']['previous_revision'],'eq.12')
