"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Company, calendarDate, date, triggerFired } from '@/lib/workspace';
import { latestObservation, sourceOrigin, repeatedSources } from '@/lib/ecosystem';
import { Drawer, EvidenceChip } from './Primitives';

type Kind='source_context'|'observation'|'condition'|'viewpoint'|'opportunity'|'affiliation'|'alert_review';
const titles:Record<Kind,string>={source_context:'Review source context',observation:'Record a metric update',condition:'Set a decision condition',viewpoint:'Record your investment view',opportunity:'Review an investment round',affiliation:'Record employment history',alert_review:'Review this alert'};
function Field({name,label,value='',type='text',required=true,minLength}: {name:string;label:string;value?:string|number;type?:string;required?:boolean;minLength?:number}) {
  return <label>{label}{type==='textarea'?<textarea aria-label={label} name={name} defaultValue={value} required={required} minLength={minLength} maxLength={4000}/>:<input aria-label={label} name={name} type={type} step={type==='number'?'any':undefined} defaultValue={value} required={required} minLength={minLength} maxLength={type==='text'?2000:undefined}/>}</label>;
}
function Select({name,label,options,value}: {name:string;label:string;options:{id:string;label:string}[];value?:string}) {
  return <label>{label}<select aria-label={label} name={name} required={!options.some(o=>o.id==='')} defaultValue={value??options[0]?.id??''}>{options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>;
}
const choices=(values:string[])=>values.map(value=>({id:value,label:value}));
function Editor({company,kind,targetId,close}: {company:Company;kind:Kind;targetId?:string;close:()=>void}) {
  const {act,busy,error,data}=useWorkspace();const {user}=useAuth();const [submitted,setSubmitted]=useState(false);
  const [metricId,setMetricId]=useState('');
  const source=company.sources.find(s=>s.id===targetId)??company.sources[0];
  const condition=company.conditions?.find(c=>c.id===targetId);
  const opportunity=company.opportunities?.find(o=>o.id===targetId);
  const observed=metricId?company.metrics.find(m=>m.id===metricId):undefined;
  const previous=metricId?latestObservation(company,metricId):undefined;
  const current=condition?latestObservation(company,condition.metric_id):undefined;
  const writable=company.can_write!==false&&['analyst','partner','admin'].includes(data?.role??'');
  const sourceOptions=company.sources.map(s=>({id:s.id,label:`${s.id} · ${s.title}`}));
  const metricOptions=company.metrics.map(m=>({id:m.id,label:`${m.label} · ${m.unit}`}));
  return <Drawer title={titles[kind]} onClose={close}>
    <p className="muted">Save your reviewed record. Evidence states and investment decisions change only through their separate review actions.</p>
    {!writable&&<div className="notice">This account has read-only access.</div>}
    <form className="workspace-form ecosystem-form" onSubmit={async e=>{
      e.preventDefault();setSubmitted(true);const f=new FormData(e.currentTarget);
      const text=(key:string)=>String(f.get(key)??'').trim();const nullable=(key:string)=>text(key)||null;
      const number=(key:string)=>Number(text(key));const optionalNumber=(key:string)=>text(key)?number(key):null;
      const sourceIds=f.getAll('source_ids').map(String);let payload:Record<string,unknown>;
      if(kind==='source_context')payload={source_id:source?.id,published_on:nullable('published_on'),observed_on:nullable('observed_on'),origin_source_id:nullable('origin_source_id'),rights:text('rights'),rights_note:text('rights_note'),availability:text('availability')};
      else if(kind==='observation')payload={metric_id:metricId||null,label:text('label'),definition:text('definition'),unit:text('unit'),currency:nullable('currency'),period_from:text('period_from'),period_to:text('period_to'),value:number('value'),expected:optionalNumber('expected'),source_id:text('source_id'),state:text('state'),rationale:text('rationale'),calculation:text('calculation'),meeting_id:nullable('meeting_id')};
      else if(kind==='condition')payload={id:condition?.id,decision_id:condition?.decision_id??text('decision_id'),metric_id:condition?.metric_id??text('metric_id'),title:text('title'),operator:text('operator'),threshold:number('threshold'),owner:text('owner'),due_date:text('due_date'),rationale:text('rationale'),status:text('status'),resolution:text('resolution'),source_ids:sourceIds};
      else if(kind==='viewpoint')payload={position:text('position'),case:text('case'),assumption:text('assumption'),resolving_question:text('resolving_question'),claim_ids:f.getAll('claim_ids').map(String),memo_version:optionalNumber('memo_version')};
      else if(kind==='opportunity')payload={id:opportunity?.id,name:text('name'),round:text('round'),stage:text('stage'),rationale:text('rationale'),approval_reference:text('approval_reference'),currency:text('currency'),invested:optionalNumber('invested'),ownership:optionalNumber('ownership'),closed_on:nullable('closed_on'),source_ids:sourceIds,rejection_reason:nullable('rejection_reason')};
      else if(kind==='affiliation')payload={person_id:text('person_id'),company_name:text('company_name'),company_domain:text('company_domain'),role:text('role'),started_on:text('started_on'),ended_on:nullable('ended_on'),source_id:text('source_id'),rationale:text('rationale')};
      else payload={condition_id:condition?.id,observation_id:current?.id,classification:text('classification'),rationale:text('rationale')};
      if(await act(company,{action:kind,[kind]:payload}))close();
    }}>
      {submitted&&error&&<p role="alert" className="auth-error">{error}</p>}
      {kind==='source_context'&&source&&<>
        <h3>{source.title}</h3><blockquote>{source.excerpt}</blockquote>
        <div className="intake-fields"><Field name="published_on" label="Publication date" type="date" value={source.published_on??''} required={false}/><Field name="observed_on" label="Observation date" type="date" value={source.observed_on??''} required={false}/></div>
        <Select name="origin_source_id" label="Repeats this original source" value={source.origin_source_id??''} options={[{id:'',label:'Origin not established / no declared dependency'},...sourceOptions.filter(s=>s.id!==source.id)]}/>
        <Select name="rights" label="Permitted use" value={source.rights??'Unknown'} options={choices(['Unknown','Private research','User supplied','Permission confirmed'])}/>
        <Field name="rights_note" label="Permission or restriction details" type="textarea" value={source.rights_note??''} required={false}/>
        <Select name="availability" label="Original link availability" value={source.availability??'Available'} options={choices(['Available','Unavailable'])}/>
        <p className="muted">The captured excerpt stays in the record if its link disappears. Recording permission does not establish a legal entitlement.</p>
      </>}
      {kind==='observation'&&<>
        <label>Metric<select value={metricId} onChange={e=>setMetricId(e.target.value)}><option value="">Create a metric definition</option>{metricOptions.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
        <div key={metricId} className="ecosystem-fields">
          <Field name="label" label="Metric name" value={observed?.label} minLength={2}/>
          <Field name="definition" label="What exactly is measured?" type="textarea" value={observed?.definition} minLength={10}/>
          <div className="intake-fields"><Field name="unit" label="Unit" value={observed?.unit??'USD'}/><Field name="currency" label="Currency code, if monetary" value={previous?.currency??''} required={false}/></div>
        </div>
        <div className="intake-fields"><Field name="period_from" label="Period starts" type="date" value={calendarDate()}/><Field name="period_to" label="Period ends" type="date" value={calendarDate()}/><Field name="value" label="Observed value" type="number"/><Field name="expected" label="Expected value, if underwritten" type="number" required={false}/></div>
        <Select name="source_id" label="Supporting source" options={sourceOptions}/><Select name="state" label="Evidence state" options={choices(['Founder-reported','Verified','Calculated'])}/>
        <Field name="rationale" label="Review basis and limitations" type="textarea" minLength={20}/><Field name="calculation" label="Inputs and formula, if calculated" type="textarea" required={false}/>
        <Select name="meeting_id" label="Related meeting, if any" options={[{id:'',label:'No meeting reference'},...company.meetings.map(m=>({id:m.id,label:m.title}))]}/>
        <p className="muted">Earlier observations remain available. A changed definition, unit or currency needs a separate metric.</p>
      </>}
      {kind==='condition'&&<>
        {!condition&&<><Select name="decision_id" label="Original decision" options={company.decisions.map(d=>({id:d.id,label:`${d.disposition} · ${date(d.at)} · ${d.rationale}`}))}/><Select name="metric_id" label="Measured metric" options={metricOptions}/></>}
        <Field name="title" label="Review condition" value={condition?.title} minLength={3}/>
        <div className="intake-fields"><Select name="operator" label="Review when value is" value={condition?.operator??'gte'} options={[{id:'lt',label:'Less than'},{id:'lte',label:'At most'},{id:'gt',label:'Greater than'},{id:'gte',label:'At least'}]}/><Field name="threshold" label="Threshold" type="number" value={condition?.threshold}/><Field name="owner" label="Review owner" value={condition?.owner??user?.name??company.owner}/><Field name="due_date" label="Next review date" type="date" value={condition?.due_date??calendarDate()}/></div>
        <Field name="rationale" label="Why would this change the investment view?" type="textarea" value={condition?.rationale} minLength={20}/>
        <Select name="status" label="Condition status" value={condition?.status??'Active'} options={choices(['Active','Resolved','Paused'])}/>
        <Field name="resolution" label="Review outcome or reason for pausing" type="textarea" value={condition?.resolution} required={false}/>
      </>}
      {kind==='viewpoint'&&<>
        <Select name="position" label="Your position" options={choices(['For','Against','Undecided'])}/>
        <Field name="case" label="Why do you hold this view?" type="textarea" minLength={20}/>
        <Field name="assumption" label="Which assumption does it depend on?" type="textarea" minLength={20}/>
        <Field name="resolving_question" label="What information could change your view?" type="textarea" minLength={10}/>
        <Select name="memo_version" label="Related frozen memo" options={[{id:'',label:'Current research; no memo selected'},...company.memos.map(m=>({id:String(m.version),label:`Memo v${m.version}`}))]}/>
        <fieldset className="outcome-sources"><legend>Claims discussed</legend>{company.claims.map(c=><label className="check-label" key={c.id}><input name="claim_ids" type="checkbox" value={c.id}/><span>{c.statement}</span></label>)}</fieldset>
      </>}
      {kind==='opportunity'&&<>
        <Field name="name" label="Opportunity name" value={opportunity?.name} minLength={3}/><Field name="round" label="Round or opportunity" value={opportunity?.round??company.stage}/>
        <Select name="stage" label="Recorded stage" value={opportunity?.stage} options={choices(['Research','Diligence','IC review','Approved','Committed','Closed','Rejected'])}/>
        <Field name="rationale" label="Review rationale" type="textarea" value={opportunity?.rationale} minLength={20}/>
        <Field name="approval_reference" label="External approval or commitment basis" type="textarea" value={opportunity?.approval_reference} required={false}/>
        <div className="intake-fields"><Field name="currency" label="Investment currency" value={opportunity?.currency??'USD'}/><Field name="invested" label="Completed investment amount" type="number" value={opportunity?.invested??''} required={false}/><Field name="ownership" label="Ownership fraction (0 to 1)" type="number" value={opportunity?.ownership??''} required={false}/><Field name="closed_on" label="Completed investment date" type="date" value={opportunity?.closed_on??''} required={false}/></div>
        <Select name="rejection_reason" label="Reason if rejected" value={opportunity?.rejection_reason??''} options={[{id:'',label:'Not rejected'},...choices(['No fit','Evidence concern','Price','Timing','No access','Lost allocation','Other'])]}/>
        <p className="muted">Approved, Committed and Closed need documentary sources. Closed also needs amount, ownership and date. This records status; it does not approve or execute a transaction.</p>
      </>}
      {kind==='affiliation'&&<>
        <Select name="person_id" label="Recorded person" options={company.people.map(p=>({id:p.id,label:p.name}))}/>
        <Field name="company_name" label="Company name"/><Field name="company_domain" label="Company domain"/><Field name="role" label="Role"/>
        <div className="intake-fields"><Field name="started_on" label="Started on" type="date"/><Field name="ended_on" label="Ended on, if known" type="date" required={false}/></div>
        <Select name="source_id" label="Employment source" options={sourceOptions}/><Field name="rationale" label="Source basis and uncertainty" type="textarea" minLength={20}/>
      </>}
      {kind==='alert_review'&&<>
        <h3>{condition?.title}</h3><p>{current?.label}: {current?.value} {current?.unit} · {current?.period_to}</p>
        <Select name="classification" label="Alert assessment" options={choices(['Incorrect','Irrelevant','Duplicate','Misleading','Reviewed'])}/><Field name="rationale" label="Why are you recording this assessment?" type="textarea" minLength={20}/>
        <p className="muted">This review applies to this observation. New observations remain eligible for review; neither the source nor investment decision is overwritten.</p>
      </>}
      {['condition','opportunity'].includes(kind)&&<fieldset className="outcome-sources"><legend>Assessment sources</legend>{company.sources.map(s=><label className="check-label" key={s.id}><input name="source_ids" type="checkbox" value={s.id} defaultChecked={(condition?.source_ids??opportunity?.source_ids??[]).includes(s.id)}/><span>{s.title}</span></label>)}</fieldset>}
      <button className="ws-button primary" disabled={!writable||busy}>{busy?'Saving…':'Save reviewed record'}</button>
    </form>
  </Drawer>;
}

export default function DecisionLoop({company,section}: {company:Company;section:'evidence'|'diligence'|'monitor'|'opportunities'}) {
  const {data,act,busy}=useWorkspace();const search=useSearchParams();
  const [editor,setEditor]=useState<{kind:Kind;id?:string}|null>(null);
  const writable=company.can_write!==false&&['analyst','partner','admin'].includes(data?.role??'');
  const open=(kind:Kind,id?:string)=>setEditor({kind,id});
  const observations=company.observations??[];const conditions=company.conditions??[];
  return <section className="ecosystem-panel">
    {section==='evidence'&&<>
      <header className="section-heading"><div><h2>Source context</h2><p className="muted">Publication, observed period and declared origin are separate from capture time.</p></div><button className="ws-button secondary" disabled={!writable||!company.sources.length} onClick={()=>open('affiliation')}>Record employment</button></header>
      {!company.sources.length&&<div className="notice">Capture a source to review its origin, dates and permitted use.</div>}
      <p className="muted">{new Set(company.sources.map(s=>sourceOrigin(company,s.id))).size} declared origin groups. Unlinked sources are not automatically independent confirmations.</p>
      {repeatedSources(company.sources).slice(0,20).map(s=><p className="notice" key={s.source}>{s.basis}: [{s.source}] may repeat [{s.original}]. <button className="text-link" disabled={!writable} onClick={()=>open('source_context',s.source)}>Review this dependency</button></p>)}
      <div className="ecosystem-grid">{company.sources.map(s=><article className="work-card" key={s.id}><h3>{s.title}</h3><p>Captured {date(s.captured_at)} · published {s.published_on??'not recorded'} · observed {s.observed_on??'not recorded'}</p><p>Origin: {s.origin_source_id??'not established'} · {s.availability??'Available'} · {s.rights??'Unknown'}</p><button className="ws-button secondary" disabled={!writable} onClick={()=>open('source_context',s.id)}>Review source context</button></article>)}</div>
      {company.people.flatMap(p=>(p.affiliations??[]).map(a=><p className="notice" key={a.id}>{p.name}: {a.role} at {a.company_name}, {a.started_on}–{a.ended_on??'end not recorded'} · [{a.source_id}]</p>))}
    </>}
    {section==='diligence'&&<>
      <header className="section-heading"><div><h2>Case and counter-case</h2><p className="muted">Record each view, its assumption and the evidence that could change it.</p></div><button className="ws-button secondary" disabled={!writable} onClick={()=>open('viewpoint')}>Record your view</button></header>
      {!company.viewpoints?.length&&<div className="notice">No individual investment views recorded. Disagreement needs an explanation; missing evidence alone does not establish misconduct.</div>}
      <div className="ecosystem-grid">{company.viewpoints?.map(v=><article className="work-card" key={v.id}><span className="eyebrow">{v.position} · {v.author}</span><h3>{v.case}</h3><p>Assumption: {v.assumption}</p><p>Could change this view: {v.resolving_question}</p><small>{v.memo_version?`Memo v${v.memo_version}`:`Research r${v.company_revision}`} · {date(v.at)}</small></article>)}</div>
      <div className="notice">Founder integrity reviews should name a material statement, its conflicting evidence and the question to resolve. Do not infer intent from an unanswered question.</div>
    </>}
    {section==='opportunities'&&<>
      <header className="section-heading"><div><h2>Investment opportunities</h2><p className="muted">Review separate rounds without replacing the company’s earlier decisions.</p></div><button className="ws-button secondary" disabled={!writable} onClick={()=>open('opportunity')}>Add an opportunity</button></header>
      {!company.opportunities?.length&&<p className="notice">No separately reviewed round recorded. An Invest disposition alone is not a completed holding.</p>}
      <div className="ecosystem-grid">{company.opportunities?.map(o=><article className="work-card" key={o.id}><span className="eyebrow">{o.round} · {o.stage}</span><h3>{o.name}</h3><p>{o.rationale}</p>{o.rejection_reason&&<p>Reason: {o.rejection_reason}</p>}{o.stage==='Closed'&&<p>{o.invested?.toLocaleString()} {o.currency} · {((o.ownership??0)*100).toFixed(2)}% ownership · {o.closed_on}</p>}<p className="muted">{o.source_ids.join(' · ')||'No documentary source selected'}</p>{o.stage!=='Closed'&&<button className="ws-button secondary" disabled={!writable} onClick={()=>open('opportunity',o.id)}>Review round</button>}</article>)}</div>
    </>}
    {section==='monitor'&&<>
      <header className="section-heading"><div><h2>Observed updates and decision conditions</h2><p className="muted">Review what changed against the definition and decision recorded at the time.</p></div><div className="ecosystem-actions"><button className="ws-button primary" disabled={!writable||!company.sources.length} onClick={()=>open('observation')}>Record metric update</button><button className="ws-button secondary" disabled={!writable||!company.decisions.length||!company.metrics.length} onClick={()=>open('condition')}>Set decision condition</button></div></header>
      {!company.sources.length&&<p className="notice">Capture a supporting source in Evidence before recording actuals.</p>}
      {!company.decisions.length&&<p className="notice">Record a decision before attaching a measurable revisit condition.</p>}
      {conditions.map(c=>{const state=company.condition_states?.[c.id]??'Missing observation';const current=latestObservation(company,c.metric_id);const review=company.alert_reviews?.find(r=>r.condition_id===c.id&&r.observation_id===current?.id&&(r.evaluation_version??1)===(c.evaluation_version??1));return <article className={`work-card condition-card ${search.get('condition')===c.id?'condition-selected':''}`} key={c.id}>
        <header><h3>{c.title}</h3><span className="evidence-chip review">{state}</span></header><p>{c.rationale}</p><p>{c.metric_definition} · review when {c.operator} {c.threshold} {c.metric_unit}</p><p>Original decision: {company.decisions.find(d=>d.id===c.decision_id)?.disposition} · {date(company.decisions.find(d=>d.id===c.decision_id)?.at??'')} · Owner: {c.owner} · Due: {c.due_date}</p>
        {current?<p>Latest observed: {current.value} {current.unit}, {current.period_from}–{current.period_to} · [{current.source_id}]</p>:<p>No dated observation captured for this metric.</p>}
        <p className="muted">{c.acknowledged_by?`Responsibility acknowledged by ${c.acknowledged_by}`:'Responsibility has not been acknowledged; no notification sent.'}</p>
        {review&&<p className="notice">{review.classification}: {review.rationale} · {review.author}</p>}
        <div className="ecosystem-actions"><button className="ws-button secondary" disabled={!writable} onClick={()=>open('condition',c.id)}>Review condition</button>{!c.acknowledged_at&&c.owner_identity===data?.actor_id&&<button className="ws-button secondary" disabled={!writable||busy} onClick={()=>void act(company,{action:'acknowledge_condition',condition_id:c.id})}>Accept review responsibility</button>}{state==='Review required'&&current&&!review&&<button className="ws-button secondary" disabled={!writable} onClick={()=>open('alert_review',c.id)}>Review alert</button>}<Link className="source-link" href={`/companies/${company.id}?tab=Overview`}>Inspect decision history</Link></div>
      </article>;})}
      <details className="work-card"><summary>Observation history ({observations.length})</summary>{observations.length===0&&<p>No dated observation history captured.</p>}{[...observations].reverse().map(o=><article className="observation-row" key={o.id}><h3>{o.label}: {o.value} {o.unit}</h3><EvidenceChip state={o.state}/><p>{o.definition} · {o.currency??'No currency'} · {o.period_from}–{o.period_to} · [{o.source_id}]</p><p>{o.rationale}</p><small>{o.recorded_by} · {date(o.recorded_at)}</small></article>)}</details>
      <div className="notice">Conditions are evaluated from saved observations. A founder-reported update needs evidence review before triggering a condition. External monitoring feeds and automatic notifications are not connected.</div>
      {company.triggers.length>0&&<p className="muted">{company.triggers.filter(t=>triggerFired(company,t.id)).length} of {company.triggers.length} existing metric thresholds crossed.</p>}
    </>}
    {editor&&<Editor key={`${editor.kind}:${editor.id??''}`} company={company} kind={editor.kind} targetId={editor.id} close={()=>setEditor(null)}/>}
  </section>;
}
