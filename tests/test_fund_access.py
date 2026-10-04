import unittest
from unittest.mock import patch
import test_review_workflows as review


class FundAccessTests(unittest.TestCase):
    setUp=review.ReviewWorkflowTests.setUp
    tearDown=review.ReviewWorkflowTests.tearDown
    auth=review.ReviewWorkflowTests.auth
    company=review.ReviewWorkflowTests.company
    action=review.ReviewWorkflowTests.action

    def fund(self):
        out=self.client.post('/api/workspace/funds',headers=self.headers,json={'name':'Test Fund'})
        self.assertEqual(out.status_code,200,out.text);return out.json()['id']

    def publish(self,fund):
        c=self.company()
        out=self.client.post(f'/api/workspace/funds/{fund}/records',headers=self.headers,json={'company_id':c['id'],'revision':c['revision'],'disclosure_confirmed':True})
        self.assertEqual(out.status_code,200,out.text);return out.json()

    def member(self,fund,role='Reviewer',active=True):
        out=self.client.post(f'/api/workspace/funds/{fund}/members',headers=self.headers,json={'email':'other@test.invalid','role':role,'active':active})
        self.assertEqual(out.status_code,200,out.text);return out.json()['member_id']

    def grant(self,fund,record,member,role):
        out=self.client.post(f"/api/workspace/funds/{fund}/records/{record['id']}/grants",headers=self.headers,json={'member_id':member,'role':role})
        self.assertEqual(out.status_code,200,out.text)

    def records(self,actor='other'):
        return self.client.get('/api/workspace',headers=self.auth(actor)).json()['companies']

    def test_membership_does_not_expose_deals_and_grants_are_clamped_to_member_role(self):
        f=self.fund();r=self.publish(f);m=self.member(f,'Viewer')
        self.assertEqual(self.records(),[])
        self.grant(f,r,m,'Reviewer');rows=self.records();self.assertEqual(len(rows),1);self.assertFalse(rows[0]['can_write'])
        out=self.client.post(f"/api/workspace/companies/{r['id']}/actions",headers=self.auth('other'),json={'action':'note','revision':r['revision'],'rationale':'A viewer must not write a fund note.'})
        self.assertEqual(out.status_code,403)
        self.member(f,'Reviewer');self.assertTrue(self.records()[0]['can_write'])
        out=self.client.post(f"/api/workspace/companies/{r['id']}/actions",headers=self.auth('other'),json={'action':'note','revision':r['revision'],'rationale':'A granted reviewer can save a review without modifying the personal original.'})
        self.assertEqual(out.status_code,200,out.text)
        self.assertEqual(self.company()['revision'],r['revision']-1)
        self.assertTrue(out.json()['fund_record']);self.assertTrue(out.json()['can_write'])
        history=self.client.get(f"/api/workspace/companies/{r['id']}/history",headers=self.auth('other')).json()
        self.assertEqual(history[0]['actor'],'Other');self.assertEqual(history[0]['actor_id'],'2')

    def test_leaver_revocation_keeps_organization_record_and_removes_grants(self):
        f=self.fund();r=self.publish(f);m=self.member(f);self.grant(f,r,m,'Reviewer')
        self.assertEqual(len(self.records()),1);self.member(f,active=False)
        self.assertEqual(self.records(),[])
        self.assertEqual(self.client.get(f"/api/workspace/companies/{r['id']}/history",headers=self.auth('other')).status_code,404)
        self.assertTrue(any(c['id']==r['id'] for c in self.records('review')))
        self.member(f,active=True);self.assertEqual(self.records(),[])

    def test_admin_boundaries_confirmation_revision_and_cross_fund_grant(self):
        f=self.fund();m=self.member(f);r=self.publish(f)
        self.assertEqual(self.client.post(f'/api/workspace/funds/{f}/members',headers=self.auth('other'),json={'email':'review@test.invalid','role':'Admin'}).status_code,403)
        self.assertEqual(self.client.post(f'/api/workspace/funds/{f}/members',headers=self.headers,json={'email':'review@test.invalid','active':False}).status_code,422)
        c=self.company()
        self.assertEqual(self.client.post(f'/api/workspace/funds/{f}/records',headers=self.headers,json={'company_id':c['id'],'revision':c['revision'],'disclosure_confirmed':False}).status_code,422)
        self.assertEqual(self.client.post(f'/api/workspace/funds/{f}/records',headers=self.headers,json={'company_id':c['id'],'revision':c['revision']+1,'disclosure_confirmed':True}).status_code,409)
        f2=self.fund()
        self.assertEqual(self.client.post(f"/api/workspace/funds/{f2}/records/{r['id']}/grants",headers=self.headers,json={'member_id':m,'role':'Reviewer'}).status_code,404)

    def test_revoked_member_cannot_export_compare_or_generate_and_frozen_history_remains(self):
        self.action('decision',disposition='Pass',rationale='Insufficient renewal evidence for this investment.',trigger='Review a comparable cohort when it appears.')
        d=self.company()['decisions'][-1]
        f=self.fund();r=self.publish(f);m=self.member(f);self.grant(f,r,m,'Viewer')
        url=f"/api/workspace/companies/{r['id']}/decisions/{d['id']}/changes"
        self.assertTrue(self.client.get(url,headers=self.auth('other')).json()['available'])
        self.grant(f,r,m,'Remove')
        self.assertEqual(self.client.get(url,headers=self.auth('other')).status_code,404)
        self.assertEqual(self.client.get(f"/api/workspace/companies/{r['id']}/deliverable",headers=self.auth('other'),params={'format':'xlsx','revision':r['revision']}).status_code,404)
        with patch('backend.workspace_api.generate_draft') as provider:
            out=self.client.post(f"/api/workspace/companies/{r['id']}/actions",headers=self.auth('other'),json={'action':'draft','revision':r['revision'],'task':'Find the weakest assumption'})
            self.assertEqual(out.status_code,404);provider.assert_not_called()
