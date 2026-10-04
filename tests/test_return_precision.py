import unittest
from backend.workspace_schema import ModelInput, calculate_model

class ReturnPrecisionTests(unittest.TestCase):
    def inputs(self, **changes):
        return ModelInput(**{'pre_money':1,'check':1,'dilution':0,'follow_on':0,'follow_on_post_money':1,'years':1,'arr':1000000,'multiple':1,**changes})

    def test_large_one_year_return_is_not_clipped(self):
        result=calculate_model(self.inputs())
        self.assertAlmostEqual(result['irr'],499999)
        self.assertAlmostEqual(-1+result['proceeds']/(1+result['irr']),0)

    def test_near_total_loss_is_not_clipped(self):
        result=calculate_model(self.inputs(pre_money=99999999,arr=1))
        self.assertAlmostEqual(result['irr'],-.99999999,places=12)

    def test_no_positive_final_cashflow_has_no_irr(self):
        for years in [1,2]:
            with self.assertRaisesRegex(ValueError,'IRR is undefined'):
                calculate_model(self.inputs(arr=1,pre_money=100,follow_on=100,follow_on_post_money=1000,years=years))

if __name__=='__main__': unittest.main()
