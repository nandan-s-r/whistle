"""Bounded operating forecasts; revenue and ARR are different quantities."""
import math
from pydantic import BaseModel, ConfigDict, Field


class OperatingYear(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    revenue_growth: float = Field(ge=-1, le=5)
    arr_growth: float = Field(ge=-1, le=5)
    gross_margin: float = Field(ge=-5, le=1)
    operating_expense: float = Field(ge=0, le=1e12)


class OperatingInput(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True, allow_inf_nan=False)
    name: str = Field(min_length=1, max_length=120)
    currency: str = Field(pattern=r'^[A-Z]{3}$')
    base_revenue: float = Field(ge=0, le=1e12)
    base_arr: float = Field(ge=0, le=1e12)
    base_period: str = Field(min_length=4, max_length=120)
    revenue_definition: str = Field(min_length=20, max_length=2000)
    arr_definition: str = Field(min_length=20, max_length=2000)
    expense_definition: str = Field(min_length=20, max_length=2000)
    rationale: str = Field(min_length=20, max_length=4000)
    source_ids: list[str] = Field(min_length=1, max_length=50)
    years: list[OperatingYear] = Field(min_length=1, max_length=20)


class OperatingProjection(OperatingInput):
    version: int
    at: str
    owner: str
    rows: list[dict[str, float]]
    sources: list[dict]
    method: str


METHOD = ('Forecast, not verified financial information. Revenue and year-end ARR compound independently. '
          'Gross profit = revenue × gross margin; operating contribution = gross profit − entered operating expense. '
          'Contribution is not net profit or cash flow; debt, taxes, working capital, capex and financing are excluded.')


def operating_rows(inputs: OperatingInput):
    revenue, arr = inputs.base_revenue, inputs.base_arr
    result = []
    for number, year in enumerate(inputs.years, 1):
        revenue *= 1 + year.revenue_growth
        arr *= 1 + year.arr_growth
        gross = revenue * year.gross_margin
        row = {'year':number, 'revenue':revenue, 'arr':arr, 'gross_profit':gross,
               'operating_expense':year.operating_expense, 'contribution':gross-year.operating_expense}
        if any(not math.isfinite(v) or abs(v)>1e15 for v in row.values()):
            raise ValueError('The forecast exceeds the supported numerical range. Review growth and horizon.')
        result.append(row)
    return result
