import copy
import unittest
from fastapi import HTTPException
from backend.frozen_history import preserve_frozen_history
from backend.workspace_demo import demo_companies
from backend.workspace_schema import Company


class CompletedHoldingTests(unittest.TestCase):
    def fixture(self):
        previous = demo_companies('Analyst')[0].model_dump(mode='json')
        previous['opportunities'] = [dict(
            id='closed-deal', name='Recorded seed investment', round='Seed', stage='Closed',
            rationale='Completed investment documented in the selected source.',
            approval_reference='Reviewed external investment approval document.',
            invested=500000, ownership=0.05, closed_on='2020-01-31', source_ids=['S03'],
            updated_at='2020-02-01T00:00:00Z', updated_by='Original reviewer')]
        return previous, Company.model_validate(previous).model_dump(mode='json')

    def test_legacy_defaults_and_unrelated_edits_preserve_exact_original(self):
        previous, candidate = self.fixture()
        self.assertIn('currency', candidate['opportunities'][0])
        candidate['description'] = 'New review context'
        output = preserve_frozen_history(previous, candidate)
        self.assertEqual(output['opportunities'], previous['opportunities'])
        self.assertEqual(output['description'], candidate['description'])
        output['opportunities'][0]['ownership'] = 0.9
        self.assertEqual(previous['opportunities'][0]['ownership'], 0.05)
        self.assertEqual(candidate['opportunities'][0]['ownership'], 0.05)

    def test_completed_fields_cannot_be_changed(self):
        previous, baseline = self.fixture()
        for key, value in dict(id='replacement', stage='Research', name='Rewritten name',
                              round='Series A', rationale='Rewritten reason',
                              approval_reference='Rewritten approval', currency='EUR',
                              invested=900000, ownership=0.9, closed_on='2020-03-01',
                              source_ids=[], rejection_reason='Lost allocation',
                              updated_at='2020-03-01T00:00:00Z', updated_by='Other reviewer').items():
            candidate = copy.deepcopy(baseline)
            candidate['opportunities'][0][key] = value
            with self.subTest(field=key), self.assertRaises(HTTPException) as error:
                preserve_frozen_history(previous, candidate)
            self.assertEqual(error.exception.status_code, 403)

    def test_removal_malformed_collection_and_duplicate_identity_are_rejected(self):
        previous, baseline = self.fixture()
        for items in ([], None, {}, 'Closed', [baseline['opportunities'][0]] * 2,
                      [baseline['opportunities'][0], {**baseline['opportunities'][0], 'stage':'Research'}]):
            candidate = copy.deepcopy(baseline)
            candidate['opportunities'] = items
            with self.subTest(items=items), self.assertRaises(HTTPException):
                preserve_frozen_history(previous, candidate)
        candidate = copy.deepcopy(baseline)
        candidate.pop('opportunities')
        with self.assertRaises(HTTPException):
            preserve_frozen_history(previous, candidate)

    def test_active_edits_new_closures_and_reordering_remain_allowed(self):
        previous, baseline = self.fixture()
        active = {**baseline['opportunities'][0], 'id':'active-deal', 'stage':'Diligence',
                  'invested':None, 'ownership':None, 'closed_on':None}
        previous['opportunities'].append(active)
        candidate = Company.model_validate(previous).model_dump(mode='json')
        candidate['opportunities'][1].update(stage='Closed', invested=100000, ownership=0.1, closed_on='2020-03-01')
        candidate['opportunities'].reverse()
        output = preserve_frozen_history(previous, candidate)
        self.assertEqual(output['opportunities'][0]['ownership'], 0.1)
        self.assertEqual(output['opportunities'][1], previous['opportunities'][0])
        candidate['opportunities'][0].update(stage='Research', invested=None, ownership=None, closed_on=None)
        self.assertEqual(preserve_frozen_history(previous, candidate)['opportunities'][0]['stage'], 'Research')
        previous.pop('opportunities')
        self.assertEqual(preserve_frozen_history(previous, candidate)['opportunities'], candidate['opportunities'])


if __name__ == '__main__':
    unittest.main()
