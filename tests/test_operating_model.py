import copy
import io
import zipfile
from xml.etree import ElementTree as ET
import unittest
import test_review_workflows as review
from backend.operating_model import OperatingInput,operating_rows


class OperatingModelTests(unittest.TestCase):
    setUp=review.ReviewWorkflowTests.setUp
    tearDown=review.ReviewWorkflowTests.tearDown
    auth=review.ReviewWorkflowTests.auth
    company=review.ReviewWorkflowTests.company
    action=review.ReviewWorkflowTests.action
    export=review.ReviewWorkflowTests.export

    def forecast(self,**change):
        result = dict(name='Renewal-led base',currency='USD',base_revenue=1000000,base_arr=2000000,base_period='FY2025',
                    revenue_definition='Annual revenue recognized during the reporting period.',
                    arr_definition='Contracted recurring annual run rate at reporting period end.',
                    expense_definition='Operating expenses excluding cost of sales already captured in gross margin.',
                    rationale='Growth remains a reviewed assumption; no future performance is verified.',source_ids=['S03'],
                    years=[dict(revenue_growth=.2,arr_growth=.1,gross_margin=.75,operating_expense=700000),
                           dict(revenue_growth=.5,arr_growth=.2,gross_margin=.8,operating_expense=1200000)])
        return {**result,**change}

    def test_separate_growth_costs_and_zero_boundary(self):
        rows=operating_rows(OperatingInput(**self.forecast()))
        self.assertAlmostEqual(rows[-1]['revenue'],1800000);self.assertAlmostEqual(rows[-1]['arr'],2640000)
        self.assertAlmostEqual(rows[-1]['contribution'],240000)
        loss=self.forecast();loss['years'][0]['gross_margin']=-.2
        first=operating_rows(OperatingInput(**loss))[0]
        self.assertAlmostEqual(first['gross_profit'],-240000);self.assertAlmostEqual(first['contribution'],-940000)
        zero=self.forecast();zero['years'][0]['revenue_growth']=-1
        self.assertEqual(operating_rows(OperatingInput(**zero))[-1]['revenue'],0)
        large=self.forecast();large['years']=[dict(revenue_growth=5,arr_growth=5,gross_margin=1,operating_expense=0)]*20
        with self.assertRaises(ValueError):operating_rows(OperatingInput(**large))

    def test_forecast_freezes_and_return_binding_requires_same_basis(self):
        saved=self.action('operating_projection',operating=self.forecast());self.assertEqual(saved.status_code,200,saved.text)
        projection=copy.deepcopy(saved.json()['operating_models'][0])
        inputs=dict(pre_money=8000000,check=500000,dilution=.35,follow_on=350000,follow_on_post_money=20000000,years=2,arr=2640000,multiple=7)
        for changes in [{'arr':2650000},{'years':3}]:
            out=self.action('model',inputs={**inputs,**changes},operating_version=1);self.assertEqual(out.status_code,422,out.text)
        out=self.action('model',inputs=inputs,operating_version=1);self.assertEqual(out.status_code,200,out.text)
        self.assertEqual(out.json()['models'][-1]['operating_projection'],projection)
        self.assertEqual(next(a['label'] for a in out.json()['assumptions'] if a['id']=='arr'),'Year 2 ARR')
        with zipfile.ZipFile(io.BytesIO(self.export('xlsx').content)) as z:
            root=ET.fromstring(z.read('xl/worksheets/sheet3.xml'));ns={'x':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            self.assertEqual(root.find(".//x:c[@r='I14']/x:f",ns).text,'I13*(1+E14)')
            self.assertAlmostEqual(float(root.find(".//x:c[@r='K14']/x:v",ns).text),240000)
            returns=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
            self.assertEqual(returns.find(".//x:c[@r='C15']/x:f",ns).text,"'Operating forecast'!I14*1")
            self.assertIn(b'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"',z.read('[Content_Types].xml'))
            content=ET.fromstring(z.read('[Content_Types].xml'))
            self.assertTrue(any(item.get('PartName')=='/xl/worksheets/sheet3.xml' for item in content))
        self.action('operating_projection',operating=self.forecast(name='Later scenario'))
        self.assertEqual(self.company()['models'][-1]['operating_projection'],projection)
        self.assertEqual(self.company()['operating_models'][0],projection)
        self.assertEqual(self.action('operating_projection',operating=self.forecast(source_ids=['foreign'])).status_code,422)

    def test_currency_review_permissions_and_atomic_invalid_inputs(self):
        before=self.company()
        for changes in [{'base_arr':-1},{'base_arr':1e14},{'source_ids':[]},{'rationale':'short'},{'currency':'INR extra'},{'owner':'Impersonated'}]:
            out=self.action('operating_projection',operating=self.forecast(**changes));self.assertEqual(out.status_code,422,out.text);self.assertEqual(self.company(),before)
        payload={'action':'operating_projection','revision':before['revision'],'operating':self.forecast()}
        self.assertEqual(self.client.post('/api/workspace/companies/atlasops/actions',headers=self.auth('read'),json=payload).status_code,403)
        self.assertEqual(self.client.post('/api/workspace/companies/atlasops/actions',headers=self.auth('other'),json=payload).status_code,404)
        self.assertEqual(self.action('operating_projection',operating=self.forecast(currency='INR')).status_code,200)
        inputs=dict(pre_money=8000000,check=500000,dilution=.35,follow_on=350000,follow_on_post_money=20000000,years=2,arr=2640000,multiple=7)
        self.assertEqual(self.action('model',inputs=inputs,operating_version=1).status_code,422)

    def test_diligence_usefulness_is_reviewed_and_cannot_change_decision(self):
        task=dict(claim_id='C04',title='Validate purchase cycle',question='Could the enterprise buying cycle invalidate our growth plan?',owner='Reviewer',due_date='2090-01-01',
                  decision_impact='A year-long buying cycle would weaken the proposed ARR ramp.',effort_hours=3)
        out=self.action('diligence_task',diligence=task);self.assertEqual(out.status_code,200,out.text)
        task['id']=out.json()['diligence_tasks'][-1]['id'];original=self.company()['decisions']
        out=self.action('diligence_task',diligence={**task,'changed_view':'Weakened','impact_rationale':'Customer purchase timing undermines near-term forecasts.'})
        self.assertEqual(out.status_code,422,out.text)
        out=self.action('diligence_task',diligence={**task,'status':'Complete','outcome':'Customer interview confirms a longer enterprise procurement period.','source_ids':['S03'],'changed_view':'Weakened','impact_rationale':'Customer purchase timing undermines near-term forecasts.'})
        self.assertEqual(out.status_code,200,out.text);self.assertEqual(out.json()['decisions'],original)
