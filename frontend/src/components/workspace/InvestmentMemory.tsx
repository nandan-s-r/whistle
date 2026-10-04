"use client";
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useAuth} from '@/context/AuthContext';
import {useWorkspace} from '@/context/WorkspaceContext';
import {Company,date,workspaceFetch} from '@/lib/workspace';
import {personIdentity,reviewOutcomes} from '@/lib/ecosystem';
import {Drawer} from './Primitives';

interface Change {kind:string;record:string;before:unknown;after:unknown}
interface Comparison {available:boolean;baseline_revision?:number;revision:number;message:string;changes:Change[]}
const label=(value:string)=>value.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
function Value({value}:{value:unknown}) {
  if(value===null||value===undefined)return <p className="muted">Not recorded</p>;
  if(Array.isArray(value))return <p>{value.length?value.map(String).join(' · '):'None recorded'}</p>;
  if(typeof value==='object')return <dl className="premise-values">{Object.entries(value).map(([key,item])=><div key={key}><dt>{label(key)}</dt><dd><Value value={item}/></dd></div>)}</dl>;
  return <p>{String(value)}</p>;
}
export function DecisionChanges({company,decisionId,close}:{company:Company;decisionId:string;close:()=>void}) {
  const {token}=useAuth();const [result,setResult]=useState<Comparison|null>(null);const [error,setError]=useState('');
  const decision=company.decisions.find(d=>d.id===decisionId);
  useEffect(()=>{
    if(!token)return;const controller=new AbortController();
    workspaceFetch<Comparison>(`/companies/${company.id}/decisions/${decisionId}/changes`,token,{signal:controller.signal})
      .then(setResult).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Unable to compare this decision.');});
    return ()=>controller.abort();
  },[token,company.id,decisionId]);
  return <Drawer title="What changed since this decision?" onClose={close}>
    <h3>{decision?.disposition} · {date(decision?.at??'')}</h3><p>{decision?.rationale}</p>
    <p className="notice">The original decision remains unchanged. Review whether these new observations affect its rationale, price or mandate.</p>
    {error&&<p role="alert" className="auth-error">{error}</p>}
    {!result&&!error&&<p role="status">Comparing the original evidence snapshot…</p>}
    {result&&<><p>{result.message}</p>{result.available&&<p className="muted">Evidence revision {result.baseline_revision} → current revision {result.revision}</p>}
      {result.available&&!result.changes.length&&<p>No recorded premises changed in this comparison.</p>}
      {result.changes.map(change=><article className="work-card premise-change" key={`${change.kind}:${change.record}`}><h3>{change.kind} · {change.record}</h3><div className="premise-columns"><section><h4>Known then</h4><Value value={change.before}/></section><section><h4>Recorded now</h4><Value value={change.after}/></section></div></article>)}
    </>}
    <Link className="ws-button secondary" onClick={close} href={`/companies/${company.id}?tab=Monitor`}>Review decision conditions</Link>
  </Drawer>;
}
export default function InvestmentMemory() {
  const {data}=useWorkspace();const [query,setQuery]=useState('');const [limit,setLimit]=useState(30);
  const [selected,setSelected]=useState<{company:Company;decision:string}|null>(null);
  const companies=data?.companies;
  const outcomes=reviewOutcomes(companies??[]);
  const decisions=useMemo(()=>{const text=query.trim().toLowerCase();return (companies??[]).flatMap(c=>c.decisions.map(d=>({company:c,decision:d}))).filter(({company:c,decision:d})=>!text||[c.name,c.sector,d.rationale,d.objections,d.trigger,d.author,d.disposition].join(' ').toLowerCase().includes(text)).sort((a,b)=>b.decision.at.localeCompare(a.decision.at));},[companies,query]);
  const connections=useMemo(()=>{
    const groups=new Map<string,{company:Company;person:Company['people'][number]}[]>();
    for(const c of companies??[])for(const person of c.people){const identity=personIdentity(person.profile_url);if(!identity)continue;const group=groups.get(identity)??[];group.push({company:c,person});groups.set(identity,group);}
    return [...groups.values()].filter(g=>new Set(g.map(x=>x.company.id)).size>1);
  },[companies]);
  return <div className="investment-memory">
    <span className="eyebrow">REASONS WORTH REMEMBERING</span><h2>Investment memory</h2>
    <p className="document-lede">Find the original decision, its objections and the evidence that changed afterward.</p>
    <details className="work-card"><summary>Review outcomes</summary><dl className="detail-list"><div><dt>Drafts approved after review</dt><dd>{outcomes.approved} of {outcomes.reviewed} reviewed · {outcomes.pending} pending</dd></div><div><dt>Completed diligence with an assessed effect</dt><dd>{outcomes.assessed} of {outcomes.completed} completed</dd></div><div><dt>Assessed tasks that changed an investment view</dt><dd>{outcomes.changed} of {outcomes.assessed} assessed</dd></div><div><dt>Active conditions awaiting acknowledgement</dt><dd>{outcomes.unacknowledged}</dd></div></dl><p className="muted">Counts cover your accessible records, including samples when present. Approval does not measure factual accuracy. Provider costs and cost per useful task are not yet measured.</p></details>
    <label className="memory-search">Search decisions and objections<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setLimit(30);}} placeholder="A company, assumption, reviewer or rejection reason"/></label>
    <p className="muted">{decisions.length} recorded decisions · searches your accessible records</p>
    {!decisions.length&&<p className="notice">{query?'No matching decision. Try the company name or a phrase from its rationale.':'No decisions recorded yet. Capture one company and record a reasoned view to start building useful memory.'}</p>}
    {decisions.slice(0,limit).map(({company:c,decision:d})=><article className="work-card memory-decision" key={`${c.id}:${d.id}`}><span className="eyebrow">{d.disposition} · {date(d.at)}</span><h3><Link href={`/companies/${c.id}?tab=Overview`}>{c.name}</Link></h3><p>{d.rationale}</p><p className="muted">Counter-case: {d.objections||'Not recorded'}<br/>Revisit: {d.trigger}</p><div className="ecosystem-actions"><button className="ws-button secondary" onClick={()=>setSelected({company:c,decision:d.id})}>What changed?</button><Link className="source-link" href={`/companies/${c.id}?tab=Monitor`}>Review conditions</Link></div></article>)}
    {decisions.length>limit&&<button className="ws-button secondary" onClick={()=>setLimit(n=>n+30)}>Show 30 more decisions</button>}
    <h3 className="memory-connections-heading">People across companies</h3>
    <p className="muted">Matching profile links suggest a shared identity. Names alone do not merge people or establish employment.</p>
    {connections.length===0&&<p>No matching profile links across your company records yet.</p>}
    {connections.map(group=><article className="work-card" key={personIdentity(group[0].person.profile_url)}><h3>{group[0].person.name}</h3>{group.map(({company:c,person:p})=><p key={`${c.id}:${p.id}`}><Link className="source-link" href={`/companies/${c.id}?tab=Evidence`}>{c.name} · {p.role}</Link></p>)}</article>)}
    {selected&&<DecisionChanges key={`${selected.company.id}:${selected.decision}`} company={selected.company} decisionId={selected.decision} close={()=>setSelected(null)}/>}
  </div>;
}
