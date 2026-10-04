import unittest
import io
import zipfile
import test_review_workflows as fixtures

class ModelReviewTests(unittest.TestCase):
 setUp=fixtures.ReviewWorkflowTests.setUp
 tearDown=fixtures.ReviewWorkflowTests.tearDown
 auth=fixtures.ReviewWorkflowTests.auth
 company=fixtures.ReviewWorkflowTests.company
 action=fixtures.ReviewWorkflowTests.action
 freeze=fixtures.ReviewWorkflowTests.freeze
 export=fixtures.ReviewWorkflowTests.export

 def test_source_linked_assumption_notes_preserve_frozen_history(self):
  self.freeze();original=self.company()['models'][0]
  inputs={**original['inputs'],'arr':original['inputs']['arr']/2}
  result=self.action('model',inputs=inputs,rationale='Conservative scenario with the same equity mechanics.',assumption_notes={'arr':{'rationale':'Deck is a current anchor; future revenue is a conservative analyst projection.','source_id':'S03'}})
  self.assertEqual(result.status_code,200,result.text)
  data=result.json();self.assertEqual(data['models'][0],original)
  note=next(a for a in data['models'][1]['assumptions'] if a['id']=='arr')
  self.assertEqual(note['source_id'],'S03');self.assertIn('analyst projection',note['rationale'])
  self.assertAlmostEqual(data['models'][1]['scenarios']['Base']['moic'],original['scenarios']['Base']['moic']/2)
  self.assertEqual(data['memos'][0]['model_version'],1)
  self.assertEqual(data['memos'][0]['sources'],original['sources'])
  self.assertEqual(self.company()['claims'],data['claims'])
  latest=self.export('xlsx',model_version=2)
  self.assertEqual(latest.status_code,200,latest.text if latest.status_code!=200 else '')
  with zipfile.ZipFile(io.BytesIO(latest.content)) as workbook:
   self.assertIn('S03 / Deck is a current anchor; future revenue is a conservative analyst projection.',workbook.read('xl/worksheets/sheet1.xml').decode())
  earlier=self.export('xlsx',memo_version=1)
  self.assertEqual(earlier.status_code,200)
  with zipfile.ZipFile(io.BytesIO(earlier.content)) as workbook:
   self.assertNotIn('future revenue is a conservative analyst projection',workbook.read('xl/worksheets/sheet1.xml').decode())

 def test_invalid_note_links_and_roles_cannot_change_models(self):
  self.freeze();before=self.company();inputs=before['models'][0]['inputs']
  for notes in [{'arr':{'rationale':'Detailed analyst projection requiring verification.','source_id':'other-source'}},{'no-such-input':{'rationale':'Detailed analyst projection requiring verification.'}},{'arr':{'rationale':'short'}}]:
   result=self.action('model',inputs=inputs,assumption_notes=notes);self.assertEqual(result.status_code,422,result.text)
   self.assertEqual(self.company(),before)
  result=self.action('model',inputs={**inputs,'years':1,'arr':1})
  self.assertEqual(result.status_code,422,result.text)
  self.assertIn('Downside scenario: IRR is undefined',result.json()['detail'])
  self.assertEqual(self.company(),before)
  result=self.client.post('/api/workspace/companies/atlasops/actions',headers=self.auth('read'),json={'action':'model','revision':before['revision'],'inputs':inputs})
  self.assertEqual(result.status_code,403)
  self.action('model',inputs={**inputs,'arr':inputs['arr']*1.1})
  result=self.client.post('/api/workspace/companies/atlasops/actions',headers=self.headers,json={'action':'model','revision':before['revision'],'inputs':inputs})
  self.assertEqual(result.status_code,409)

 def test_new_screening_text_has_correct_punctuation(self):
  result=self.action('screen');self.assertEqual(result.status_code,200)
  text=result.json()['screening'];self.assertIn('SCREENING BRIEF · AtlasOps',text)
  self.assertNotIn('\u00c2',text);self.assertNotIn('\u00e2\u20ac',text)

if __name__=='__main__':unittest.main()
