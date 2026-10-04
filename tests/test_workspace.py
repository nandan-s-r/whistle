import math
import unittest
import os
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from pydantic import ValidationError
from backend.api import app
from backend.auth import create_access_token, get_password_hash
from backend.workspace_schema import Company, ModelInput, calculate_model
from backend.workspace_demo import demo_companies
from database.db import get_db
from database.models import Base, User


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        provider_env = patch.dict(os.environ, {'WORKSPACE_PROVIDER':'rules', 'WORKSPACE_MODEL_URL':'', 'WORKSPACE_MODEL':''})
        provider_env.start()
        self.addCleanup(provider_env.stop)
        self.engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.factory=sessionmaker(bind=self.engine)
        with self.factory() as db:
            db.add_all([User(email='a@example.test',full_name='Analyst A',role='analyst',hashed_password=get_password_hash('TestPassword123!')),User(email='b@example.test',full_name='Analyst B',role='analyst',hashed_password=get_password_hash('TestPassword123!')),User(email='reader@example.test',full_name='Reader',role='reader',hashed_password=get_password_hash('TestPassword123!'))])
            db.commit()
        def test_db():
            with self.factory() as db:
                yield db
        app.dependency_overrides[get_db]=test_db
        self.client=TestClient(app)
        self.headers={'Authorization':'Bearer '+create_access_token({'sub':'a@example.test'})}
        self.client.post('/api/workspace/demo',headers=self.headers)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.engine.dispose()

    def company(self):
        return self.client.get('/api/workspace',headers=self.headers).json()['companies'][0]

    def action(self, action, **values):
        c=self.company()
        return self.client.post('/api/workspace/companies/atlasops/actions',headers=self.headers,json={'action':action,'revision':c['revision'],**values})

    def test_authenticated_end_to_end(self):
        login=self.client.post('/api/auth/login',data={'username':'a@example.test','password':'TestPassword123!'})
        self.assertEqual(login.status_code,200)
        results=self.client.post('/api/workspace/search',headers=self.headers,json={'query':'India B2B SaaS MBB founders','min_evidence':2}).json()
        self.assertEqual(len(results['results']),2)
        self.assertTrue(all(r['reason_codes'] and r['sources'] for r in results['results']))
        self.assertEqual(self.action('pipeline').status_code,200)
        screen=self.action('screen').json()['screening']
        self.assertIn('[S01]',screen)
        self.assertIn('No evidence',screen)
        self.assertIsNotNone(self.company()['screening_created_at'])
        decision=self.action('decision',disposition='Progress to diligence',rationale='References needed before conviction',trigger='Three customer references',objections='Procurement could exceed the case')
        self.assertEqual(decision.status_code,200)
        self.assertEqual(decision.json()['decisions'][0]['author'],'Analyst A')
        history=self.client.get('/api/workspace/companies/atlasops/history',headers=self.headers).json()
        self.assertEqual([h['action'] for h in history],['decision','screen','pipeline','company_intake'])

    def test_profile_cannot_escalate_own_role(self):
        result=self.client.put("/api/auth/me",headers=self.headers,json={"role":"admin"})
        self.assertEqual(result.status_code,403)

    def test_requires_authentication(self):
        self.assertEqual(self.client.get('/api/workspace').status_code,401)

    def test_owner_isolation(self):
        headers={'Authorization':'Bearer '+create_access_token({'sub':'b@example.test'})}
        self.assertEqual(self.client.get('/api/workspace',headers=headers).json()['companies'],[])
        self.assertEqual(self.client.post('/api/workspace/companies/atlasops/actions',headers=headers,json={'revision':1,'action':'pipeline'}).status_code,404)

    def test_reader_cannot_write(self):
        headers={'Authorization':'Bearer '+create_access_token({'sub':'reader@example.test'})}
        self.assertEqual(self.client.post('/api/workspace/demo',headers=headers).status_code,403)
        self.assertEqual(self.client.post('/api/workspace/searches',headers=headers,json={'name':'test','filters':{}}).status_code,403)

    def test_duplicate_initialization(self):
        self.client.post('/api/workspace/demo',headers=self.headers)
        data=self.client.get('/api/workspace',headers=self.headers).json()
        self.assertEqual(len(data['companies']),4)
        self.assertEqual(len(data['searches']),1)

    def test_no_evidence_cannot_be_verified(self):
        self.assertEqual(self.action('review',claim_id='C06',state='Verified').status_code,422)

    def test_conflict_requires_review_rationale(self):
        self.assertEqual(self.action('review',claim_id='C04',state='Verified').status_code,422)
        self.assertEqual(self.action('review',claim_id='C04',state='Verified',rationale='Canonical sales cycle is 92 days; deck referred to a different cohort.',statement='Sales cycle for the referenced customer was 92 days.').status_code,200)
        c=self.company()
        self.assertEqual(c['reviews'][-1]['previous'],'Conflicted')
        self.assertEqual(c['claims'][3]['statement'],'Sales cycle for the referenced customer was 92 days.')
        self.assertTrue(all(e['reviewer']=='Analyst A' for e in c['evidence'] if e['claim_id']=='C04'))

    def test_source_claim_relationship_validation(self):
        c=demo_companies('Test')[0].model_dump(mode='json')
        c['evidence'][0]['source_id']='nonexistent'
        with self.assertRaises(ValidationError):
            Company.model_validate(c)

    def test_stale_update_is_rejected(self):
        first=self.action('pipeline')
        self.assertEqual(first.status_code,200)
        conflict=self.client.post('/api/workspace/companies/atlasops/actions',headers=self.headers,json={'action':'watchlist','revision':1})
        self.assertEqual(conflict.status_code,409)

    def test_decision_history_is_append_only(self):
        self.action('decision',disposition='Watch',rationale='First review',trigger='Evidence arrives')
        self.action('decision',disposition='Pass',rationale='Second review',trigger='Expansion above threshold')
        c=self.company()
        self.assertEqual([d['disposition'] for d in c['decisions']],['Watch','Pass'])
        self.assertEqual(c['disposition'],'Pass')

    def test_model_math_and_cashflow_irr(self):
        inputs=ModelInput(pre_money=4500000,check=500000,dilution=.2,follow_on=200000,follow_on_post_money=20000000,years=5,arr=10000000,multiple=5)
        r=calculate_model(inputs)
        self.assertAlmostEqual(r['initial_ownership'],.1)
        self.assertAlmostEqual(r['exit_ownership'],.09)
        self.assertAlmostEqual(r['proceeds'],4500000)
        self.assertAlmostEqual(r['moic'],4500000/700000)
        npv=-500000-200000/(1+r['irr'])**2+4500000/(1+r['irr'])**5
        self.assertAlmostEqual(npv,0,places=5)

    def test_invalid_financial_inputs(self):
        with self.assertRaises(ValidationError):
            ModelInput(pre_money=0,check=500000,dilution=1,follow_on=0,follow_on_post_money=1,years=5,arr=1,multiple=1)

    def test_model_and_memo_versions_are_frozen(self):
        self.assertEqual(self.action('memo').status_code,422)
        inputs={'pre_money':8000000,'check':500000,'dilution':.35,'follow_on':350000,'follow_on_post_money':20000000,'years':5,'arr':18000000,'multiple':7}
        self.assertEqual(self.action('model',inputs=inputs).status_code,200)
        self.assertEqual(self.action('memo').status_code,200)
        self.assertEqual(self.action('model',inputs={**inputs,'arr':30000000}).status_code,200)
        c=self.company()
        self.assertEqual(c['models'][0]['inputs']['arr'],18000000)
        self.assertEqual(c['memos'][0]['model_version'],1)
        self.assertTrue(all(q['state']=='Verified' for q in c['memos'][0]['claims']))

    def test_ai_approval_does_not_overwrite_facts(self):
        prior=self.company()['claims']
        draft=self.action('draft',task='Challenge this claim')
        self.assertEqual(draft.status_code,200)
        run=draft.json()['ai_runs'][-1]
        self.assertEqual(run['model'],'evidence-rules-v1')
        self.assertEqual(self.action('review_draft',run_id=run['id'],approved=True).status_code,200)
        c=self.company()
        self.assertEqual(c['claims'],prior)
        self.assertEqual(c['ai_runs'][-1]['status'],'Approved')
        self.assertEqual(c['interactions'][-1]['kind'],'Approved draft')

    def test_saved_search_and_exclusions(self):
        self.assertEqual(self.client.post('/api/workspace/searches',headers=self.headers,json={'name':'No matches','filters':{'geography':'US'}}).status_code,200)
        result=self.client.post('/api/workspace/search',headers=self.headers,json={'geography':'US'}).json()
        self.assertEqual(result['results'],[])
        self.assertEqual(len(result['excluded']),4)

    def planned_work(self, **changes):
        return {'claim_id':'C04','title':'Reconcile sales-cycle cohorts','question':'Which cohort supports this claim?','owner':'Analyst A','due_date':'2026-10-03','priority':'High','status':'Open','outcome':'','source_ids':[],**changes}

    def test_diligence_completion_preserves_claim_review_and_reopens(self):
        prior=self.company()['claims']
        created=self.action('diligence_task',diligence=self.planned_work()).json()['diligence_tasks'][0]
        self.assertEqual(self.action('diligence_task',diligence=self.planned_work(id=created['id'],status='Complete')).status_code,422)
        done=self.action('diligence_task',diligence=self.planned_work(id=created['id'],status='Complete',outcome='Source S04 refers to a different cohort; the original claim remains conflicted.',source_ids=['S04']))
        self.assertEqual(done.status_code,200,done.text)
        self.assertEqual(done.json()['claims'],prior)
        self.assertEqual(done.json()['diligence_tasks'][0]['completed_by'],'Analyst A')
        reopened=self.action('diligence_task',diligence=self.planned_work(id=created['id'],outcome='More cohort evidence needed.')).json()
        self.assertIsNone(reopened['diligence_tasks'][0]['completed_at'])
        history=self.client.get('/api/workspace/companies/atlasops/history',headers=self.headers).json()
        self.assertEqual(history[0]['action'],'diligence_task')

    def test_diligence_scope_permissions_and_stale_revision(self):
        self.assertEqual(self.action('diligence_task',diligence=self.planned_work(claim_id='foreign')).status_code,422)
        self.assertEqual(self.action('diligence_task',diligence=self.planned_work(source_ids=['foreign'])).status_code,422)
        self.assertEqual(self.action('diligence_task',diligence=self.planned_work(due_date='2026-99-20')).status_code,422)
        self.assertEqual(self.action('diligence_task',diligence=self.planned_work(status='Blocked')).status_code,422)
        revision=self.company()['revision']
        self.action('note',rationale='New research arrived.')
        self.assertEqual(self.client.post('/api/workspace/companies/atlasops/actions',headers=self.headers,json={'revision':revision,'action':'diligence_task','diligence':self.planned_work()}).status_code,409)
        reader={'Authorization':'Bearer '+create_access_token({'sub':'reader@example.test'})}
        self.assertEqual(self.client.post('/api/workspace/companies/atlasops/actions',headers=reader,json={'revision':self.company()['revision'],'action':'diligence_task','diligence':self.planned_work()}).status_code,403)

    def test_memo_preserves_work_comments_and_selected_model_decision(self):
        self.action('diligence_task',diligence=self.planned_work())
        inputs={'pre_money':8000000,'check':500000,'dilution':.35,'follow_on':350000,'follow_on_post_money':20000000,'years':5,'arr':18000000,'multiple':7}
        self.action('model',inputs=inputs)
        frozen=self.action('memo').json()
        memo=frozen['memos'][-1]
        self.assertEqual(frozen['research_hash'],memo['research_hash'])
        self.assertEqual(memo['diligence_tasks'][0]['status'],'Open')
        commented=self.action('memo_comment',memo_version=1,rationale='Challenge cohort comparability.').json()
        self.assertEqual(commented['research_hash'],memo['research_hash'])
        self.assertEqual(commented['memos'][0],memo)
        self.assertEqual(commented['memo_comments'][0]['author'],'Analyst A')
        self.action('model',inputs={**inputs,'arr':20000000})
        self.assertNotEqual(self.company()['research_hash'],memo['research_hash'])
        decision=self.action('decision',memo_version=1,disposition='Watch',rationale='Review the original model case.',trigger='Reconcile cohorts.').json()['decisions'][-1]
        self.assertEqual(decision['model_version'],1);self.assertEqual(decision['memo_version'],1)
        self.assertEqual(self.action('memo_comment',memo_version=99,rationale='Invalid target.').status_code,422)

    def test_review_pack_keeps_current_research_and_frozen_artifacts_distinct(self):
        import io,json,zipfile
        self.action('model',inputs={'pre_money':8000000,'check':500000,'dilution':.35,'follow_on':350000,'follow_on_post_money':20000000,'years':5,'arr':18000000,'multiple':7})
        self.action('memo')
        self.action('model',inputs={'pre_money':8000000,'check':500000,'dilution':.35,'follow_on':350000,'follow_on_post_money':20000000,'years':5,'arr':25000000,'multiple':7})
        url='/api/workspace/companies/atlasops/review-pack?memo_version=1&revision='+str(self.company()['revision'])
        response=self.client.get(url,headers=self.headers);self.assertEqual(response.status_code,200)
        with zipfile.ZipFile(io.BytesIO(response.content)) as pack:
            self.assertEqual(json.loads(pack.read('frozen-model.json'))['version'],1)
            self.assertFalse(json.loads(pack.read('manifest.json'))['memo_matches_current_research'])
            self.assertIn('S04',pack.read('sources.csv').decode())
            self.assertIn('frozen-memo.json',pack.namelist())
        other={'Authorization':'Bearer '+create_access_token({'sub':'b@example.test'})}
        self.assertEqual(self.client.get(url,headers=other).status_code,404)
        self.action('note',rationale='Research update.')
        self.assertEqual(self.client.get(url,headers=self.headers).status_code,409)

    def test_documented_pass_memo_does_not_require_invented_financials(self):
        self.assertEqual(self.action('memo').status_code,422)
        self.action('decision',disposition='Pass',rationale='The evidence does not meet our mandate.',trigger='Revisit on primary evidence of eligibility.')
        response=self.action('memo');self.assertEqual(response.status_code,200,response.text)
        memo=response.json()['memos'][0]
        self.assertIsNone(memo['model_version']);self.assertIn('No return model prepared',memo['text'])
        self.assertEqual(response.json()['models'],[])
        import io,zipfile,json
        url='/api/workspace/companies/atlasops/review-pack?memo_version=1&revision='+str(response.json()['revision'])
        with zipfile.ZipFile(io.BytesIO(self.client.get(url,headers=self.headers).content)) as pack:
            self.assertNotIn('frozen-model.json',pack.namelist());self.assertIsNone(json.loads(pack.read('manifest.json'))['model_version'])


if __name__=='__main__':
    unittest.main()
