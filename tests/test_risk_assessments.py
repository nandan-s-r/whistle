import copy
import hashlib
import json
import unittest
import test_review_workflows as fixtures
from backend.workspace_schema import Company
from backend.workspace_artifacts import research_hash

class RiskAssessmentTests(unittest.TestCase):
    setUp=fixtures.ReviewWorkflowTests.setUp
    tearDown=fixtures.ReviewWorkflowTests.tearDown
    auth=fixtures.ReviewWorkflowTests.auth
    company=fixtures.ReviewWorkflowTests.company
    action=fixtures.ReviewWorkflowTests.action
    freeze=fixtures.ReviewWorkflowTests.freeze

    def risk(self,**changes):
        return {'title':'Procurement delays growth','severity':'High','claim_id':'C04','question':'Which customer source establishes the complete buying cycle?','owner':'Reviewer','due_date':'2026-10-03','rationale':'Long procurement cycles may reduce cash generation before the next round.',**changes}

    def test_create_mitigate_and_reopen_preserve_claims_and_frozen_memo(self):
        self.freeze();before=self.company();memo=copy.deepcopy(before['memos'][0]);claims=copy.deepcopy(before['claims'])
        r=self.action('risk',risk=self.risk());self.assertEqual(r.status_code,200,r.text)
        data=r.json();risk=data['risks'][-1];self.assertEqual(risk['updated_by'],'Reviewer')
        self.assertNotEqual(data['research_hash'],before['research_hash'])
        r=self.action('risk',risk=self.risk(id=risk['id'],status='Mitigated',outcome='Customer interview supports a shorter cycle for the observed cohort; expansion still needs review.',source_ids=['S03']))
        self.assertEqual(r.status_code,200,r.text);data=r.json()
        self.assertEqual(data['claims'],claims);self.assertEqual(data['memos'][0],memo)
        data=self.action('memo').json();self.assertIn('High / Mitigated',data['memos'][-1]['text'])
        self.assertIn('Customer interview supports',data['memos'][-1]['text']);self.assertEqual(data['memos'][0],memo)
        r=self.action('risk',risk=self.risk(id=risk['id'],outcome='New contradicting evidence means the mitigation needs another review.',source_ids=['S03']))
        self.assertEqual(r.status_code,200,r.text);self.assertEqual(r.json()['risks'][-1]['status'],'Open');self.assertEqual(r.json()['claims'],claims)

    def test_invalid_links_dates_mitigation_and_spoofed_metadata_are_atomic(self):
        before=self.company()
        for change in [{'claim_id':'foreign-claim'},{'source_ids':['foreign-source']},{'due_date':'2026-02-30'},{'due_date':'20261003'},{'source_ids':['S03','S03']},{'status':'Mitigated','outcome':'A sufficient explanation without a supporting source.'},{'status':'Mitigated','source_ids':['S03']},{'rationale':'short'},{'updated_by':'Another author'}]:
            result=self.action('risk',risk=self.risk(**change));self.assertEqual(result.status_code,422,result.text);self.assertEqual(self.company(),before)
        self.assertEqual(self.action('risk').status_code,422)
        self.assertEqual(self.action('risk',risk=self.risk(id='foreign-risk')).status_code,404)
        self.assertEqual(self.company(),before)

    def test_reader_other_account_and_stale_revision_cannot_edit(self):
        before=self.company();payload={'action':'risk','revision':before['revision'],'risk':self.risk()}
        url='/api/workspace/companies/atlasops/actions'
        self.assertEqual(self.client.post(url,headers=self.auth('read'),json=payload).status_code,403)
        self.assertEqual(self.client.post(url,headers=self.auth('other'),json=payload).status_code,404)
        self.action('note',rationale='Concurrent analyst research changed this record.')
        after=self.company();self.assertEqual(self.client.post(url,headers=self.headers,json=payload).status_code,409);self.assertEqual(self.company(),after)

    def test_additive_defaults_preserve_legacy_research_fingerprint(self):
        data=self.company();company=Company.model_validate({k:v for k,v in data.items() if k not in ('revision','research_hash','condition_states','fund_record','can_write')})
        legacy=company.model_dump(mode='json')
        for s in legacy['sources']:
            for key in ('published_on','observed_on','origin_source_id','rights','rights_note','availability'):s.pop(key)
        for r in legacy['risks']:
            for key in ('status','rationale','outcome','source_ids','updated_at','updated_by'):r.pop(key)
        fields=('name','domain','description','why_now','disposition','next_action','sources','claims','evidence','assumptions','risks','diligence_tasks','decisions')
        payload={k:legacy[k] for k in fields};payload['model']=legacy['models'][-1] if legacy['models'] else None
        expected=hashlib.sha256(json.dumps(payload,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
        self.assertEqual(research_hash(company),expected)

if __name__=='__main__':unittest.main()
