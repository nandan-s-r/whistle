import io
import json
import zipfile
import unittest
from xml.etree import ElementTree as ET
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import patch
from backend.api import app
from backend.auth import create_access_token
from database.db import get_db
from database.models import Base,User


class ReviewWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.provider=patch.dict('os.environ',{'WORKSPACE_PROVIDER':'rules','WORKSPACE_MODEL_URL':'','WORKSPACE_MODEL':''});self.provider.start()
        self.engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
        Base.metadata.create_all(self.engine);self.factory=sessionmaker(bind=self.engine)
        with self.factory() as db:
            db.add_all([User(email='review@test.invalid',full_name='Reviewer',role='analyst',hashed_password='not-used'),User(email='other@test.invalid',full_name='Other',role='analyst',hashed_password='not-used'),User(email='read@test.invalid',full_name='Reader',role='reader',hashed_password='not-used')]);db.commit()
        def database():
            with self.factory() as db: yield db
        app.dependency_overrides[get_db]=database
        self.client=TestClient(app);self.headers=self.auth('review')
        self.client.post('/api/workspace/demo',headers=self.headers)

    def tearDown(self):
        self.client.close();app.dependency_overrides.clear();self.engine.dispose();self.provider.stop()

    def auth(self,name):return {'Authorization':'Bearer '+create_access_token({'sub':name+'@test.invalid'})}
    def company(self):return self.client.get('/api/workspace',headers=self.headers).json()['companies'][0]
    def action(self,action,**data):return self.client.post('/api/workspace/companies/atlasops/actions',headers=self.headers,json={'action':action,'revision':self.company()['revision'],**data})
    def meeting(self,**data):return {'title':'Partner review','kind':'Partner review','starts_at':'2026-10-09T14:30:00+05:30','agenda':'Resolve the sales-cycle contradiction [C04]','claim_ids':['C04'],'duration_minutes':45,**data}
    def profile(self,**data):return {'name':'Source Candidate','role':'Founder','previous_employer':'Google','profile_url':'https://www.linkedin.com/in/source-candidate/?trk=example','excerpt':'User observed a role change; employment dates are not independently verified.','question':'What dated primary source confirms this career transition?',**data}
    def freeze(self):
        result=self.action('model',inputs={'pre_money':8000000,'check':500000,'dilution':.35,'follow_on':350000,'follow_on_post_money':20000000,'years':5,'arr':18000000,'multiple':7})
        self.assertEqual(result.status_code,200,result.text);self.assertEqual(self.action('memo').status_code,200)
    def export(self,format,**params):
        return self.client.get('/api/workspace/companies/atlasops/deliverable',headers=self.headers,params={'revision':self.company()['revision'],'format':format,**params})

    def test_meeting_time_context_and_calendar_escaping(self):
        response=self.action('meeting',meeting=self.meeting(title='Review, evidence;\nATTENDEE:fake@test.invalid',agenda='A'*200+'\nNew question: café'))
        self.assertEqual(response.status_code,200,response.text);m=response.json()['meetings'][0]
        self.assertEqual(m['starts_at'],'2026-10-09T09:00:00Z')
        url=f"/api/workspace/companies/atlasops/calendar?revision={response.json()['revision']}&meeting_id={m['id']}"
        out=self.client.get(url,headers=self.headers);self.assertEqual(out.status_code,200)
        unfolded=out.content.decode().replace('\r\n ','');self.assertIn('DTEND:20261009T094500Z',unfolded)
        self.assertNotIn('\r\nATTENDEE:',unfolded);self.assertIn('\\nATTENDEE:',unfolded)
        self.assertTrue(all(len(line)<=75 for line in out.content.split(b'\r\n')))
        self.assertEqual(self.client.get(url,headers=self.auth('other')).status_code,404)
        self.action('note',rationale='Another reviewer changed the research.')
        self.assertEqual(self.client.get(url,headers=self.headers).status_code,409)

    def test_meeting_rejects_unknown_context_naive_time_and_incomplete_outcome(self):
        for change in [{'claim_ids':['not-this-company']},{'memo_version':99},{'starts_at':'2026-10-09T09:00:00'},{'status':'Complete','outcome':''},{'duration_minutes':999}]:
            self.assertEqual(self.action('meeting',meeting=self.meeting(**change)).status_code,422)

    def test_meeting_completion_does_not_verify_claim_and_can_be_reopened(self):
        c=self.action('meeting',meeting=self.meeting()).json();m=c['meetings'][0]
        before=c['claims'][3]['state']
        fields={k:v for k,v in m.items() if k not in ('owner','updated_at','sequence')}
        fields.update(status='Complete',outcome='The founder promised cohort data. Claim remains conflicted.')
        c=self.action('meeting',meeting=fields).json();self.assertEqual(c['claims'][3]['state'],before);self.assertEqual(c['meetings'][0]['sequence'],1)
        fields['status']='Planned';self.assertEqual(self.action('meeting',meeting=fields).json()['meetings'][0]['sequence'],2)

    def test_profile_preview_does_not_write_or_call_provider(self):
        before=self.company()
        with patch('backend.workspace_provider.httpx.Client') as network:
            result=self.client.post('/api/workspace/companies/atlasops/profile-preview',headers=self.headers,json=self.profile())
            self.assertEqual(result.status_code,200);network.assert_not_called()
        self.assertEqual(self.company(),before)
        self.assertIn('no LinkedIn access',result.json()['method'])

    def test_profile_canonical_dedup_and_no_verification(self):
        p=self.profile();out=self.action('profile_capture',profile=p);self.assertEqual(out.status_code,200,out.text)
        c=out.json();self.assertEqual(c['people'][-1]['profile_url'],'https://www.linkedin.com/in/source-candidate')
        self.assertEqual(c['claims'][-1]['state'],'Missing');self.assertEqual(c['evidence'][-1]['confidence'],0)
        self.assertEqual(self.action('profile_capture',profile=p).status_code,409)
        p['excerpt']+=' A second dated note.';out=self.action('profile_capture',profile=p)
        self.assertEqual(len(out.json()['people']),len(c['people']))
        p['name']='A different identity';p['excerpt']+=' Different identity.'
        self.assertEqual(self.action('profile_capture',profile=p).status_code,409)

    def test_profile_url_validation_and_role_write_boundary(self):
        for url in ['https://www.linkedin.com.evil.invalid/in/name','https://user@www.linkedin.com/in/name','http://www.linkedin.com/in/name','https://www.linkedin.com/feed/','javascript:alert(1)']:
            self.assertEqual(self.action('profile_capture',profile=self.profile(profile_url=url)).status_code,422)
        self.assertEqual(self.client.post('/api/workspace/companies/atlasops/actions',headers=self.auth('read'),json={'action':'meeting','revision':1,'meeting':self.meeting()}).status_code,403)

    def test_memo_reasoning_is_a_new_frozen_version(self):
        self.freeze();before=self.company()['memos'][0]
        reasoning={'why_win':'The product wedge needs repeatable customer evidence [S01].','counter_case':'Procurement may invalidate the expansion assumption.','reversal':'Three sourced paid renewals would change this view.','source_ids':['S01'],'change_note':'Added the procurement counter-case.'}
        result=self.action('memo_reasoning',memo_version=1,reasoning=reasoning)
        self.assertEqual(result.status_code,200,result.text);c=result.json();self.assertEqual(c['memos'][0],before)
        new=c['memos'][1];self.assertEqual(new['model_version'],1);self.assertEqual(new['sources'],before['sources']);self.assertEqual(new['parent_version'],1)
        self.assertEqual(new['research_hash'],before['research_hash']);self.assertIn('ANALYST JUDGMENT',new['text'])
        reasoning['source_ids']=['S_NOT_THIS_MEMO'];self.assertEqual(self.action('memo_reasoning',memo_version=1,reasoning=reasoning).status_code,422)
        reasoning['source_ids']=[];self.assertEqual(self.action('memo_reasoning',memo_version=1,reasoning=reasoning).status_code,422)

    def test_version_bound_pdf_pptx_and_workbook(self):
        self.freeze();memo=self.company()['memos'][0]
        self.action('profile_capture',profile=self.profile(excerpt='NEWER RESEARCH MUST NOT ENTER THE OLD MEMO.'))
        pdf=self.export('pdf',memo_version=1);self.assertEqual(pdf.status_code,200);self.assertTrue(pdf.content.startswith(b'%PDF'))
        import pymupdf
        doc=pymupdf.open(stream=pdf.content,filetype='pdf');text='\n'.join(page.get_text() for page in doc)
        self.assertNotIn('NEWER RESEARCH',text);self.assertIn('Frozen source register',text)
        ppt=self.export('pptx',memo_version=1);self.assertEqual(ppt.status_code,200)
        with zipfile.ZipFile(io.BytesIO(ppt.content)) as z:
            slides=[n for n in z.namelist() if __import__('re').fullmatch(r'ppt/slides/slide\d+\.xml',n)]
            self.assertGreater(len(slides),10)
            all_text='\n'.join(' '.join(t.itertext()) for n in slides for t in ET.fromstring(z.read(n)).iter('{http://schemas.openxmlformats.org/drawingml/2006/main}t'))
            self.assertNotIn('{{',all_text);self.assertNotIn('NEWER RESEARCH',all_text);self.assertIn('FICTIONAL DEMONSTRATION',all_text)
            for n in z.namelist():
                if n.endswith('.xml') or n.endswith('.rels'):ET.fromstring(z.read(n))
        xlsx=self.export('xlsx',memo_version=1);self.assertEqual(xlsx.status_code,200)
        with zipfile.ZipFile(io.BytesIO(xlsx.content)) as z:
            root=ET.fromstring(z.read('xl/worksheets/sheet1.xml'));ns={'x':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            cell=root.find('.//x:c[@r="C6"]',ns);self.assertEqual(cell.find('x:f',ns).text,'C24')
            self.assertAlmostEqual(float(cell.find('x:v',ns).text),self.company()['models'][0]['scenarios']['Base']['moic'])
            self.assertNotIn('NEWER RESEARCH',z.read('xl/worksheets/sheet2.xml').decode())
        self.assertEqual(self.export('xlsx',memo_version=1,model_version=99).status_code,422)

    def test_export_owner_auth_revision_and_no_model_boundaries(self):
        self.assertEqual(self.export('pdf',memo_version=1).status_code,404)
        self.action('decision',disposition='Pass',rationale='Financial inputs unavailable.',trigger='Review with new primary sources.');self.action('memo')
        self.assertEqual(self.export('pdf',memo_version=1).status_code,200);self.assertEqual(self.export('xlsx',memo_version=1).status_code,422)
        url=f"/api/workspace/companies/atlasops/deliverable?format=pdf&memo_version=1&revision={self.company()['revision']}"
        self.assertEqual(self.client.get(url).status_code,401);self.assertEqual(self.client.get(url,headers=self.auth('other')).status_code,404)
        self.action('note',rationale='New research note');self.assertEqual(self.client.get(url,headers=self.headers).status_code,409)

    def test_query_respects_employer_name_and_all_recorded_people(self):
        self.action('profile_capture',profile=self.profile())
        for query,expected in [('India Google Source Candidate', ['atlasops']),('India Google no-such-founder',[]),('India founders nonexistentperson',[])]:
            result=self.client.post('/api/workspace/search',headers=self.headers,json={'query':query})
            self.assertEqual([c['id'] for c in result.json()['results']],expected)

    def test_workbook_literal_cells_cannot_become_formulas(self):
        self.action('profile_capture',profile=self.profile(name='=HYPERLINK("evil")',excerpt='=SUM(1,2) is a note and must remain literal.'))
        self.freeze();out=self.export('xlsx',memo_version=1)
        with zipfile.ZipFile(io.BytesIO(out.content)) as z:
            sheet=ET.fromstring(z.read('xl/worksheets/sheet2.xml'))
            cells=[c for c in sheet.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c') if '=SUM' in ''.join(c.itertext())]
            self.assertEqual(len(cells),1);self.assertEqual(cells[0].get('t'),'inlineStr');self.assertIsNone(cells[0].find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}f'))


if __name__=='__main__':unittest.main()
