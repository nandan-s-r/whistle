import unittest
import test_review_workflows as review


class DecisionLoopTests(unittest.TestCase):
    setUp = review.ReviewWorkflowTests.setUp
    tearDown = review.ReviewWorkflowTests.tearDown
    auth = review.ReviewWorkflowTests.auth
    company = review.ReviewWorkflowTests.company
    action = review.ReviewWorkflowTests.action
    freeze = review.ReviewWorkflowTests.freeze

    def saved(self, action, **data):
        out = self.action(action, **data)
        self.assertEqual(out.status_code, 200, out.text)
        return out.json()

    def observation(self, **changes):
        return dict(label='Renewal rate', definition='Renewed paying accounts divided by accounts due for renewal',
                    unit='%', currency=None, period_from='2020-01-01', period_to='2020-01-31',
                    value=70, source_id=self.company()['sources'][0]['id'], state='Verified',
                    rationale='Reviewed dated account cohort and denominator; sample coverage remains limited.', **changes)

    def condition(self, metric, **changes):
        c=self.company()
        self.saved('decision', disposition='Watch', rationale='Renewal evidence may change our investment view.', trigger='Review the next renewal cohort.')
        return dict(title='Revisit retention concern', decision_id=self.company()['decisions'][-1]['id'], metric_id=metric,
                    operator='lt', threshold=80, owner='Reviewer', due_date='2090-01-01',
                    rationale='A lower renewal cohort would undermine the recurring revenue assumption.', **changes)

    def test_origin_cycle_is_atomic_and_unavailable_source_retains_excerpt(self):
        before=self.company();a,b=before['sources'][:2]
        c=self.saved('source_context',source_context={'source_id':b['id'],'origin_source_id':a['id'],'availability':'Unavailable'})
        self.assertEqual(c['sources'][1]['excerpt'],b['excerpt'])
        self.assertEqual(self.action('source_context',source_context={'source_id':a['id'],'origin_source_id':b['id']}).status_code,422)
        self.assertEqual(self.company(),c)
        self.assertEqual(self.action('source_context',source_context={'source_id':a['id'],'origin_source_id':'foreign'}).status_code,422)
        self.assertEqual(self.action('source_context',source_context={'source_id':a['id'],'rights':'Permission confirmed'}).status_code,422)

    def test_observation_history_order_and_definition_change(self):
        c=self.saved('observation',observation=self.observation());o=c['observations'][-1]
        earlier={**self.observation(), 'metric_id':o['metric_id'],'period_from':'2019-12-01','period_to':'2019-12-31','value':95}
        c=self.saved('observation',observation=earlier)
        self.assertEqual(next(m for m in c['metrics'] if m['id']==o['metric_id'])['value'],70)
        self.assertIsNone(next(m for m in c['metrics'] if m['id']==o['metric_id'])['expected'])
        self.assertEqual(len(c['observations']),2)
        for change in ({'definition':'A different denominator for renewal rates'},{'unit':'accounts'},{'currency':'EUR'},{'source_id':'foreign'},{'meeting_id':'foreign'}):
            self.assertEqual(self.action('observation',observation={**self.observation(),'metric_id':o['metric_id'],**change}).status_code,422)
        self.assertEqual(self.company(),c)

    def test_observation_validates_dates_calculation_and_author(self):
        for change in ({'period_to':'2090-01-31'},{'period_from':'2020-02-01'},{'period_to':'not-a-date'},{'state':'Calculated'},{'recorded_by':'Impersonated'},{'value':float('inf')}):
            if 'value' in change:
                # JSON itself rejects infinity; use an overflowing numeric JSON literal.
                raw='{"action":"observation","revision":'+str(self.company()['revision'])+',"observation":{"value":1e309}}'
                out=self.client.post('/api/workspace/companies/atlasops/actions',headers={**self.headers,'Content-Type':'application/json'},content=raw)
            else: out=self.action('observation',observation={**self.observation(),**change})
            self.assertEqual(out.status_code,422)

    def test_condition_reviews_one_observation_and_new_update_reactivates_it(self):
        c=self.saved('observation',observation=self.observation());metric=c['observations'][-1]['metric_id']
        c=self.saved('condition',condition=self.condition(metric));t=c['conditions'][-1];o=c['observations'][-1]
        self.assertEqual(c['condition_states'][t['id']],'Review required')
        decision=c['decisions'][-1]
        c=self.saved('acknowledge_condition',condition_id=t['id']);self.assertEqual(c['conditions'][-1]['acknowledged_by'],'Reviewer')
        review={'condition_id':t['id'],'observation_id':o['id'],'classification':'Misleading','rationale':'This period has a documented seasonal effect; keep the decision unchanged.'}
        c=self.saved('alert_review',alert_review=review)
        self.assertEqual(c['condition_states'][t['id']],'Reviewed observation');self.assertEqual(c['decisions'][-1],decision)
        self.assertEqual(self.action('alert_review',alert_review=review).status_code,409)
        changed={k:v for k,v in t.items() if k in ('id','title','decision_id','metric_id','operator','threshold','owner','due_date','rationale','status','resolution','source_ids')}
        c=self.saved('condition',condition={**changed,'threshold':90})
        self.assertEqual(c['condition_states'][t['id']],'Review required')
        self.assertEqual(c['conditions'][-1]['evaluation_version'],2)
        c=self.saved('alert_review',alert_review=review);self.assertEqual(c['condition_states'][t['id']],'Reviewed observation')
        c=self.saved('observation',observation={**self.observation(),'metric_id':metric,'period_from':'2020-02-01','period_to':'2020-02-29','value':65})
        self.assertEqual(c['condition_states'][t['id']],'Review required');self.assertEqual(len(c['alert_reviews']),2)
        fields={k:v for k,v in t.items() if k in ('id','title','decision_id','metric_id','operator','threshold','owner','due_date','rationale','status','resolution','source_ids')}
        c=self.saved('condition',condition={**fields,'owner':'Different reviewer'})
        self.assertIsNone(c['conditions'][-1]['acknowledged_at'])
        self.assertEqual(self.action('acknowledge_condition',condition_id=t['id']).status_code,403)
        self.assertEqual(self.action('condition',condition={**fields,'status':'Resolved'}).status_code,422)
        c=self.saved('condition',condition={**fields,'status':'Resolved','resolution':'Reviewed the changed renewal basis and preserved the original decision.','source_ids':[o['source_id']]})
        self.assertEqual(c['condition_states'][t['id']],'Resolved')

    def test_founder_report_needs_review_and_foreign_condition_links_rejected(self):
        c=self.saved('observation',observation={**self.observation(),'state':'Founder-reported'});metric=c['observations'][-1]['metric_id']
        fields=self.condition(metric);c=self.saved('condition',condition=fields);t=c['conditions'][-1]
        self.assertEqual(c['condition_states'][t['id']],'Needs evidence review')
        for key in ('metric_id','decision_id'):
            self.assertEqual(self.action('condition',condition={**fields,key:'foreign'}).status_code,422)
        self.assertEqual(self.action('alert_review',alert_review={'condition_id':t['id'],'observation_id':'foreign','classification':'Incorrect','rationale':'This is another company observation and must be rejected.'}).status_code,422)

    def test_viewpoints_freeze_in_new_memo_without_rewriting_old_memo(self):
        self.freeze();before=self.company();old=before['memos'][-1]
        view={'position':'Against','case':'The cited sales cycle may invalidate the proposed growth rate.','assumption':'The revenue forecast assumes no deterioration in the renewal cohort.','resolving_question':'Can a dated renewal cohort resolve the disputed sales cycle?','claim_ids':['C04'],'memo_version':old['version']}
        c=self.saved('viewpoint',viewpoint=view);self.assertEqual(c['viewpoints'][-1]['author'],'Reviewer')
        self.assertEqual(c['memos'][-1],old);self.assertEqual(c['claims'],before['claims'])
        self.assertEqual(self.action('viewpoint',viewpoint={**view,'author':'Partner'}).status_code,422)
        self.assertEqual(self.action('viewpoint',viewpoint={**view,'claim_ids':['foreign']}).status_code,422)
        c=self.saved('memo');self.assertEqual(c['memos'][0],old);self.assertEqual(len(c['memos'][-1]['viewpoints']),1)
        self.assertIn(view['case'],c['memos'][-1]['text'])

    def test_approval_is_not_holding_and_completed_holding_is_retained(self):
        before=self.company();source=before['sources'][0]['id']
        base={'name':'Seed extension review','round':'Seed extension','stage':'Approved','rationale':'Record the externally approved round separately from the completed transaction.','approval_reference':'Documented approval by the investment committee in the captured source.','source_ids':[source]}
        c=self.saved('opportunity',opportunity=base);self.assertEqual(c['portfolio'],before['portfolio']);o=c['opportunities'][-1]
        self.assertEqual(self.action('opportunity',opportunity={**base,'id':o['id'],'stage':'Closed'}).status_code,422)
        closed={**base,'id':o['id'],'stage':'Closed','invested':100000,'ownership':0.02,'closed_on':'2020-01-31'}
        c=self.saved('opportunity',opportunity=closed);self.assertTrue(c['portfolio'])
        recorded=c['opportunities'][0]
        c=self.saved('opportunity',opportunity=closed)
        self.assertEqual(c['opportunities'][0],recorded)
        self.assertEqual(self.action('opportunity',opportunity={**closed,'invested':200000}).status_code,422)
        self.assertEqual(self.action('opportunity',opportunity={**closed,'stage':'Research'}).status_code,422)
        self.assertEqual(self.action('opportunity',opportunity={**base,'stage':'Rejected'}).status_code,422)
        c=self.saved('opportunity',opportunity={**base,'stage':'Rejected','rejection_reason':'Lost allocation'})
        self.assertEqual(len(c['opportunities']),2);self.assertEqual(c['opportunities'][0]['invested'],100000)

    def test_new_actions_preserve_account_role_revision_boundary(self):
        c=self.company();payload={'action':'observation','revision':c['revision'],'observation':self.observation()}
        url='/api/workspace/companies/atlasops/actions'
        self.assertEqual(self.client.post(url,headers=self.auth('other'),json=payload).status_code,404)
        self.assertEqual(self.client.post(url,headers=self.auth('read'),json=payload).status_code,403)
        self.saved('observation',observation=self.observation())
        self.assertEqual(self.client.post(url,headers=self.headers,json=payload).status_code,409)

    def test_employment_period_remains_source_linked_without_claim_verification(self):
        before=self.company();fields={'person_id':before['people'][0]['id'],'company_name':'Previous business','company_domain':'https://previous.invalid/','role':'Founder','started_on':'2010-01-01','ended_on':'2019-01-01','source_id':before['sources'][0]['id'],'rationale':'The selected founder material reports this role; verify dates with primary records.'}
        c=self.saved('affiliation',affiliation=fields);self.assertEqual(c['claims'],before['claims'])
        self.assertEqual(c['people'][0]['affiliations'][0]['company_domain'],'previous.invalid')
        self.assertEqual(self.action('affiliation',affiliation=fields).status_code,409)
        self.assertEqual(self.action('affiliation',affiliation={**fields,'source_id':'foreign'}).status_code,422)

    def test_original_premises_survive_changed_metrics_and_decision_access_is_scoped(self):
        c=self.saved('decision',disposition='Pass',rationale='The available renewal cohort does not support the investment case.',trigger='Revisit if a comparable cohort improves materially.')
        d=c['decisions'][-1];url=f"/api/workspace/companies/atlasops/decisions/{d['id']}/changes"
        initial=self.client.get(url,headers=self.headers).json()
        self.assertTrue(initial['available']);self.assertEqual(initial['changes'],[])
        self.saved('observation',observation=self.observation())
        out=self.client.get(url,headers=self.headers);self.assertEqual(out.status_code,200,out.text)
        changed=out.json();self.assertEqual(changed['decision'],d)
        observation=next(v for v in changed['changes'] if v['kind']=='Observation')
        self.assertIsNone(observation['before']);self.assertEqual(observation['after']['value'],70)
        self.assertEqual(self.client.get(url,headers=self.auth('other')).status_code,404)
        self.assertEqual(self.client.get(url.replace(d['id'],'foreign'),headers=self.headers).status_code,404)


if __name__=='__main__':unittest.main()
