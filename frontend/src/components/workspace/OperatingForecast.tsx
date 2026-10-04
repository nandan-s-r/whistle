"use client";
import {useState} from 'react';
import {useWorkspace} from '@/context/WorkspaceContext';
import {Company} from '@/lib/workspace';
import {Drawer,Icon} from './Primitives';

export interface OperatingProjection {
 name:string;version:number;at:string;owner:string;currency:string;base_period:string;
 base_revenue:number;base_arr:number;revenue_definition:string;arr_definition:string;expense_definition:string;
 rationale:string;source_ids:string[];method:string;
 years:{revenue_growth:number;arr_growth:number;gross_margin:number;operating_expense:number}[];
 rows:{year:number;revenue:number;arr:number;gross_profit:number;operating_expense:number;contribution:number}[];
}
const emptyYear=()=>({revenue_growth:'',arr_growth:'',gross_margin:'',operating_expense:''});
function ForecastForm({company,close}:{company:Company;close:()=>void}) {
 const {act,busy}=useWorkspace();const [years,setYears]=useState(Array.from({length:5},emptyYear));
 const [source,setSource]=useState(company.sources[0]?.id??'');
 return <Drawer title="Build an operating forecast" onClose={close}>
  <p className="muted">Keep recognized revenue and year-end ARR separate. Sources support the starting data; future growth remains your assumption. Expenses exclude cost of sales, which gross margin already captures.</p>
  <form className="ecosystem-form ecosystem-fields" onSubmit={async e=>{
   e.preventDefault();const f=new FormData(e.currentTarget);const text=(k:string)=>String(f.get(k)??'');
   if(await act(company,{action:'operating_projection',operating:{name:text('name'),currency:text('currency').toUpperCase(),base_period:text('base_period'),base_revenue:Number(f.get('base_revenue')),base_arr:Number(f.get('base_arr')),revenue_definition:text('revenue_definition'),arr_definition:text('arr_definition'),expense_definition:text('expense_definition'),rationale:text('rationale'),source_ids:[source],years:years.map(y=>({revenue_growth:Number(y.revenue_growth)/100,arr_growth:Number(y.arr_growth)/100,gross_margin:Number(y.gross_margin)/100,operating_expense:Number(y.operating_expense)}))}}))close();
  }}>
   <label>Forecast name<input aria-label="Forecast name" name="name" required maxLength={120} placeholder="Base case · renewal-led growth"/></label>
   <div className="ecosystem-grid">
    <label>Currency<input aria-label="Forecast currency" name="currency" required pattern="[A-Za-z]{3}" maxLength={3} placeholder="USD or INR"/></label>
    <label>Starting reporting period<input aria-label="Starting reporting period" name="base_period" required minLength={4} maxLength={120} placeholder="FY 2025–26"/></label>
    <label>Starting annual revenue<input aria-label="Starting annual revenue" name="base_revenue" type="number" step="any" required min={0} max={1e12}/></label>
    <label>Starting year-end ARR<input aria-label="Starting year-end ARR" name="base_arr" type="number" step="any" required min={0} max={1e12}/></label>
   </div>
   <label>Revenue definition<textarea aria-label="Revenue definition" name="revenue_definition" required minLength={20} maxLength={2000} placeholder="Recognized recurring and services revenue for the stated period; specify exclusions."/></label>
   <label>ARR definition<textarea aria-label="ARR definition" name="arr_definition" required minLength={20} maxLength={2000} placeholder="Annualized contracted recurring run rate at period end; specify cancellations and one-time revenue."/></label>
   <label>Operating expense definition<textarea aria-label="Operating expense definition" name="expense_definition" required minLength={20} maxLength={2000} placeholder="Specify the costs included, excluding costs already represented by gross margin."/></label>
   <label>Starting-data source<select aria-label="Starting-data source" required value={source} onChange={e=>setSource(e.target.value)}>{company.sources.map(s=><option key={s.id} value={s.id}>{s.id} · {s.title}</option>)}</select></label>
   <label>Forecast years<select aria-label="Forecast years" value={years.length} onChange={e=>setYears(old=>Array.from({length:Number(e.target.value)},(_,i)=>old[i]??emptyYear()))}>{Array.from({length:20},(_,i)=><option key={i+1}>{i+1}</option>)}</select></label>
   {years.map((year,i)=><fieldset className="forecast-year" key={i}><legend>Year {i+1} assumptions</legend><div className="ecosystem-grid">
    {([['revenue_growth','Revenue growth (%)',-100,500],['arr_growth','ARR growth (%)',-100,500],['gross_margin','Gross margin (%)',-500,100],['operating_expense','Operating expense',0,1e12]] as const).map(([key,label,min,max])=><label key={key}>{label}<input aria-label={`Year ${i+1} ${label}`} required type="number" step="any" min={min} max={max} value={year[key]} onChange={e=>setYears(old=>old.map((y,n)=>n===i?{...y,[key]:e.target.value}:y))}/></label>)}
   </div></fieldset>)}
   <label>Why these assumptions?<textarea aria-label="Why these forecast assumptions?" name="rationale" required minLength={20} maxLength={4000} placeholder="Explain growth, margin and cost drivers; what would invalidate the forecast?"/></label>
   <p className="notice">Operating contribution excludes financing, taxes, working capital and capital expenditure. It is not net profit or available cash. No exchange rate is assumed.</p>
   <button className="ws-button primary" disabled={busy||!source}>{busy?'Freezing forecast…':'Freeze operating forecast'}<Icon name="check" size={16}/></button>
  </form>
 </Drawer>;
}

export default function OperatingForecast({company,onUse}:{company:Company;onUse:(p:OperatingProjection)=>void}) {
 const {data}=useWorkspace();const [editing,setEditing]=useState(false);const [version,setVersion]=useState<number|null>(null);
 const projections=company.operating_models??[];const p=version===null?projections.at(-1):projections.find(v=>v.version===version);
 const writable=company.can_write!==false&&['analyst','partner','admin'].includes(data?.role??'');
 const amount=(n:number)=>n.toLocaleString(undefined,{maximumFractionDigits:2});
 return <section className="ecosystem-panel" aria-label="Operating forecast">
  <div className="section-heading"><div><span className="eyebrow">WHAT HAS TO HAPPEN</span><h2>Operating forecast</h2><p className="muted">Show how revenue, recurring run rate and costs could develop before choosing an exit value.</p></div><button className="ws-button secondary" disabled={!writable||!company.sources.length} onClick={()=>setEditing(true)}>Build a forecast<Icon name="plus" size={16}/></button></div>
  {p?<article className="work-card"><div className="section-heading"><div><h3>{p.name}</h3><p className="muted">Forecast · {p.currency} · base period {p.base_period} · {p.owner}</p></div><label className="inline-label">Frozen forecast<select aria-label="Frozen forecast" value={p.version} onChange={e=>setVersion(Number(e.target.value))}>{projections.map(v=><option key={v.version} value={v.version}>Version {v.version}</option>)}</select></label></div>
   <div className="table-scroll"><table className="research-table"><caption>Projected amounts in {p.currency}; contribution is not cash flow.</caption><thead><tr><th>Year</th><th>Revenue</th><th>Year-end ARR</th><th>Gross profit</th><th>Operating expense</th><th>Contribution</th></tr></thead><tbody>{p.rows.map(r=><tr key={r.year}><th scope="row">{r.year}</th><td>{amount(r.revenue)}</td><td>{amount(r.arr)}</td><td>{amount(r.gross_profit)}</td><td>{amount(r.operating_expense)}</td><td>{amount(r.contribution)}</td></tr>)}</tbody></table></div>
   <details><summary>Definitions, assumptions and sources</summary><p>Revenue: {p.revenue_definition}</p><p>ARR: {p.arr_definition}</p><p>Operating expense: {p.expense_definition}</p><p>{p.rationale}</p><p>{p.method}</p><p>Supporting sources: {p.source_ids.join(' · ')}</p><ol>{p.years.map((y,i)=><li key={i}>Year {i+1}: revenue growth {amount(y.revenue_growth*100)}%; ARR growth {amount(y.arr_growth*100)}%; gross margin {amount(y.gross_margin*100)}%; operating expense {amount(y.operating_expense)} {p.currency}.</li>)}</ol></details>
   <button className="ws-button secondary" disabled={!writable||p.currency!=='USD'||p.rows.at(-1)!.arr<=0||p.rows.at(-1)!.arr>1e12} onClick={()=>onUse(p)}>Use terminal ARR in return inputs<Icon size={16}/></button>
   <p className="muted">{p.currency==='USD'?'This sets ARR and the holding period. Freeze a new return model to bind this forecast.':'The return model currently uses USD. A supported FX assumption is required before linking another currency.'}</p>
  </article>:<div className="empty-state compact"><h3>Explain the business behind the return</h3><p>Start with sourced revenue and ARR, then enter the growth and expense assumptions year by year. No figures are filled in for you.</p></div>}
  {editing&&<ForecastForm company={company} close={()=>{setEditing(false);setVersion(null);}}/>}
 </section>;
}
