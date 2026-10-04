import copy
import unittest
from fastapi import HTTPException
from backend.frozen_history import FROZEN_COLLECTIONS,preserve_frozen_history
from backend.workspace_schema import Company
from backend.workspace_demo import demo_companies


class FrozenHistoryTests(unittest.TestCase):
    def fixture(self):
        previous=demo_companies('Analyst')[0].model_dump(mode='json')
        previous['decisions']=[dict(id='legacy-decision',disposition='Watch',rationale='Obtain another cohort.',
                                    objections='Retention remains uncertain.',trigger='A dated cohort.',author='Analyst',at='2026-09-01T00:00:00Z')]
        return previous

    def test_legacy_defaults_do_not_rewrite_prior_decision(self):
        previous=self.fixture();candidate=Company.model_validate(previous).model_dump(mode='json')
        self.assertIn('evidence_revision',candidate['decisions'][0])
        candidate['description']='Updated review context'
        output=preserve_frozen_history(previous,candidate)
        self.assertEqual(output['decisions'],previous['decisions'])
        self.assertEqual(output['description'],'Updated review context')
        self.assertNotIn('evidence_revision',previous['decisions'][0])

    def test_edit_remove_and_reorder_are_rejected_before_preservation(self):
        previous=self.fixture();previous['models']=[{'version':1,'inputs':{'arr':1}},{'version':2,'inputs':{'arr':2}}]
        baseline=Company.model_validate(previous).model_dump(mode='json')
        for changed in [[],list(reversed(baseline['models'])),[{'version':1,'inputs':{'arr':100}},baseline['models'][1]],None,{}]:
            candidate=copy.deepcopy(baseline);candidate['models']=changed
            with self.subTest(changed=changed),self.assertRaises(HTTPException):preserve_frozen_history(previous,candidate)
        candidate=copy.deepcopy(baseline);candidate['decisions'][0]['evidence_revision']=123
        with self.assertRaises(HTTPException):preserve_frozen_history(previous,candidate)

    def test_new_versions_append_and_missing_legacy_collections_stay_compatible(self):
        previous=self.fixture();previous.pop('operating_models')
        candidate=Company.model_validate(previous).model_dump(mode='json')
        candidate['decisions'].append({**candidate['decisions'][0],'id':'next-decision','rationale':'Updated evidence.'})
        output=preserve_frozen_history(previous,candidate)
        self.assertEqual(output['decisions'][0],previous['decisions'][0])
        self.assertEqual(output['decisions'][1],candidate['decisions'][1])
        self.assertTrue(all(isinstance(output[key],list) for key in FROZEN_COLLECTIONS))
