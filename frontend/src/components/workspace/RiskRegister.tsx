"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useAuth } from "@/context/AuthContext";
import { Company, RiskAssessment, calendarDate, date } from "@/lib/workspace";
import { Drawer, EvidenceChip, Icon } from "./Primitives";
import { useViewPreference } from "./useViewPreference";

const filters = ["Open risks", "Mitigated", "All risks"] as const;

function RiskEditor({company, risk, close}: {company:Company; risk?:RiskAssessment; close:()=>void}) {
  const {act,busy,error,data}=useWorkspace();const {user}=useAuth();
  const canWrite=company.can_write!==false&&["analyst","partner","admin"].includes(data?.role??"");
  const initial=company.claims.find(c=>c.id===risk?.claim_id)??company.claims.find(c=>c.state!=="Verified")??company.claims[0];
  const [claim,setClaim]=useState(initial?.id??"");const [title,setTitle]=useState(risk?.title??"");
  const [question,setQuestion]=useState(risk?.question??initial?.question??"");const [owner,setOwner]=useState(risk?.owner??user?.name??company.owner);
  const [due,setDue]=useState(risk?.due_date??calendarDate());const [severity,setSeverity]=useState(risk?.severity??"Medium");
  const [status,setStatus]=useState(risk?.status??"Open");const [rationale,setRationale]=useState(risk?.rationale??"");
  const [outcome,setOutcome]=useState(risk?.outcome??"");const [sources,setSources]=useState(risk?.source_ids??[]);
  const [submitted,setSubmitted]=useState(false);const selected=company.claims.find(c=>c.id===claim);
  return <Drawer title={risk?"Review risk":"Record a risk"} onClose={close}>
    <p className="muted">Explain the possible impact, assign its next review and link the claim it concerns. Mitigation is your assessment; it does not verify the claim. Owner names record responsibility, without sending a notification.</p>
    {!canWrite&&<p className="notice">You have read-only access. You can inspect this assessment; saving requires an analyst or partner role.</p>}
    <form className="workspace-form risk-assessment-form" onSubmit={async e=>{e.preventDefault();setSubmitted(true);if(await act(company,{action:"risk",risk:{id:risk?.id??null,title,severity,claim_id:claim,question,owner,due_date:due,rationale,status,outcome,source_ids:sources}}))close();}}>
      {submitted&&error&&<p className="auth-error" role="alert">{error}</p>}
      <label>Related claim<select aria-label="Risk claim" required value={claim} onChange={e=>{setClaim(e.target.value);setQuestion(company.claims.find(c=>c.id===e.target.value)?.question??"");}}>{company.claims.map(c=><option key={c.id} value={c.id}>{c.statement}</option>)}</select></label>
      {selected&&<div className="notice"><EvidenceChip state={selected.state}/><p>{selected.statement}</p></div>}
      <label>Risk title<input aria-label="Risk title" required minLength={3} maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Long sales cycles could delay growth"/></label>
      <label>Why this matters<textarea aria-label="Risk rationale" required minLength={20} maxLength={4000} value={rationale} onChange={e=>setRationale(e.target.value)} placeholder="Explain the impact and why you chose this severity."/></label>
      <label>Question to investigate<textarea aria-label="Risk question" required minLength={10} maxLength={2000} value={question} onChange={e=>setQuestion(e.target.value)}/></label>
      <div className="intake-fields">
        <label>Review owner<input aria-label="Risk owner" required maxLength={120} value={owner} onChange={e=>setOwner(e.target.value)}/></label>
        <label>Review date<input aria-label="Risk review date" required type="date" value={due} onChange={e=>setDue(e.target.value)}/></label>
        <label>Severity<select aria-label="Risk severity" value={severity} onChange={e=>setSeverity(e.target.value as typeof severity)}>{["High","Medium","Low"].map(v=><option key={v}>{v}</option>)}</select></label>
        <label>Assessment status<select aria-label="Risk status" value={status} onChange={e=>setStatus(e.target.value as typeof status)}>{["Open","Mitigated"].map(v=><option key={v}>{v}</option>)}</select></label>
      </div>
      <label>What changed or reduced the risk<textarea aria-label="Risk outcome" required={status==="Mitigated"} minLength={status==="Mitigated"?20:undefined} maxLength={4000} value={outcome} onChange={e=>setOutcome(e.target.value)}/></label>
      <fieldset className="outcome-sources"><legend>Assessment sources{status==="Mitigated"?" · at least one required":" · optional"}</legend>{company.sources.map(s=><label key={s.id} className="check-label"><input type="checkbox" checked={sources.includes(s.id)} onChange={e=>setSources(current=>e.target.checked?[...current,s.id]:current.filter(id=>id!==s.id))}/><span>{s.title}<small>{s.id} · {date(s.captured_at)}</small></span></label>)}{!company.sources.length&&<p className="muted">Capture a source before recording mitigation.</p>}</fieldset>
      {status==="Mitigated"&&!sources.length&&<p className="muted">Choose a source that supports your mitigation assessment.</p>}
      <button className="ws-button primary" disabled={!canWrite||busy||(status==="Mitigated"&&!sources.length)}>{busy?"Saving assessment…":"Save risk assessment"}<Icon name="check" size={16}/></button>
    </form>
  </Drawer>;
}

export default function RiskRegister({company,inspect}: {company:Company;inspect:(claim:string)=>void}) {
  const {data}=useWorkspace();const router=useRouter();const search=useSearchParams();
  const risks=company.risks;const target=search.get("risk");
  const [edit,setEdit]=useState<{id?:string}|null>(()=>target&&risks.some(r=>r.id===target)?{id:target}:null);
  const [filter,setFilter]=useViewPreference(`risk-filter:${company.id}`,"Open risks",filters);
  const canWrite=company.can_write!==false&&["analyst","partner","admin"].includes(data?.role??"");
  const open=risks.filter(r=>r.status!=="Mitigated");const shown=filter==="All risks"?risks:filter==="Mitigated"?risks.filter(r=>r.status==="Mitigated"):open;
  const close=()=>{if(target)router.replace(`/companies/${company.id}?tab=Diligence`,{scroll:false});else setEdit(null);};
  return <section className="work-card risk-register" aria-label="Risk register">
    <div className="card-heading"><div><span className="eyebrow">INVESTMENT RISKS</span><h2>Risk register</h2></div><button className="ws-button secondary" disabled={!canWrite||!company.claims.length} onClick={()=>setEdit({})}>Record a risk<Icon name="plus" size={16}/></button></div>
    <p className="muted">{open.length} open · {risks.length-open.length} mitigated. Due assessments appear in Today. An empty register does not establish low risk.</p>
    {target&&!risks.some(r=>r.id===target)&&<p role="status" className="notice">This risk is not in this company. Choose a recorded risk below.</p>}
    <div className="queue-tabs" role="group" aria-label="Filter risks">{filters.map(value=><button key={value} aria-pressed={filter===value} className={filter===value?"selected":""} onClick={()=>setFilter(value)}>{value}</button>)}</div>
    {shown.map(r=><article className="risk-review-row" key={r.id}><div><span className={`risk-severity ${r.severity.toLowerCase()}`}>{r.severity}</span><span className="mini-label">{r.status??"Open"} · {r.status!=="Mitigated"&&r.due_date<calendarDate()?"Overdue · ":""}Review {r.due_date}</span><h3>{r.title}</h3><p>{r.rationale||"Assessment rationale has not been recorded."}</p><p className="risk-question">{r.question}</p><small>{r.claim_id} · Owner: {r.owner}{r.updated_by&&` · Reviewed by ${r.updated_by}`}</small>{r.outcome&&<p>{r.outcome}</p>}{!!r.source_ids?.length&&<small>Assessment sources: {r.source_ids.join(" · ")}</small>}</div><div className="button-row"><button className="ws-button secondary" disabled={!canWrite} onClick={()=>setEdit({id:r.id})} aria-label={`Review risk: ${r.title}`}>Review risk</button><button className="text-link" onClick={()=>inspect(r.claim_id)}>Inspect claim & sources<Icon size={14}/></button></div></article>)}
    {!shown.length&&<div className="empty-state compact"><h3>{filter==="Mitigated"?"No mitigation recorded":open.length?"No risks in this view":"Assess what could change your decision"}</h3><p>{filter==="Mitigated"?"Record what changed and the source behind your assessment.":"Link a concern to a claim, explain its impact and choose its next review."}</p></div>}
    {edit&&<RiskEditor company={company} risk={risks.find(r=>r.id===edit.id)} close={close}/>}
  </section>;
}
