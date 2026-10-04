"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useAuth } from "@/context/AuthContext";
import { Company, DiligenceTask, calendarDate, date } from "@/lib/workspace";
import { Drawer, EvidenceChip, Icon } from "./Primitives";
import { useViewPreference } from "./useViewPreference";

const workFilters = ["Active work", "Completed", "All work"] as const;

function TaskForm({ company, task, claimId, close }: { company: Company; task?: DiligenceTask; claimId?: string; close: () => void }) {
  const { act, busy } = useWorkspace();
  const { user } = useAuth();
  const first = company.claims.find(c => c.id === (task?.claim_id ?? claimId)) ?? company.claims.find(c => c.state !== "Verified") ?? company.claims[0];
  const [claim, setClaim] = useState(first?.id ?? "");
  const [title, setTitle] = useState(task?.title ?? "");
  const [question, setQuestion] = useState(task?.question ?? first?.question ?? "");
  const [owner, setOwner] = useState(task?.owner ?? user?.name ?? company.owner);
  const [due, setDue] = useState(task?.due_date ?? calendarDate());
  const [priority, setPriority] = useState(task?.priority ?? "Medium");
  const [status, setStatus] = useState(task?.status ?? "Open");
  const [outcome, setOutcome] = useState(task?.outcome ?? "");
  const [sources, setSources] = useState(task?.source_ids ?? []);
  const [impact,setImpact]=useState(task?.decision_impact??'');
  const [effort,setEffort]=useState(task?.effort_hours?.toString()??'');
  const [effect,setEffect]=useState<NonNullable<DiligenceTask['changed_view']>>(task?.changed_view??'Not assessed');
  const [impactRationale,setImpactRationale]=useState(task?.impact_rationale??'');
  const selected = company.claims.find(c => c.id === claim);
  return <Drawer title={task ? "Review diligence work" : "Plan diligence work"} onClose={close}>
    <p className="muted">A completed task records research. Claim verification remains a separate evidence review. Assignment names describe responsibility within this workspace.</p>
    <form className="workspace-form" onSubmit={async e => {
      e.preventDefault();
      if (await act(company,{action:"diligence_task",diligence:{id:task?.id ?? null,claim_id:claim,title,question,owner,due_date:due,priority,status,outcome,source_ids:sources,decision_impact:impact,effort_hours:effort?Number(effort):null,changed_view:status==='Complete'?effect:'Not assessed',impact_rationale:status==='Complete'?impactRationale:''}})) close();
    }}>
      <label>Linked claim<select aria-label="Linked claim" required value={claim} onChange={e => {
        setClaim(e.target.value);setQuestion(company.claims.find(c=>c.id===e.target.value)?.question ?? "");
      }}>{company.claims.map(c=><option value={c.id} key={c.id}>{c.statement}</option>)}</select></label>
      {selected && <div className="notice"><EvidenceChip state={selected.state}/><p>{selected.statement}</p></div>}
      <label>Work title<input aria-label="Work title" required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Confirm the founder’s prior operating role"/></label>
      <label>Question to resolve<textarea aria-label="Question to resolve" required maxLength={2000} value={question} onChange={e=>setQuestion(e.target.value)}/></label>
      <label>What result could change the decision?<textarea aria-label="What result could change the decision?" maxLength={2000} value={impact} onChange={e=>setImpact(e.target.value)} placeholder="Describe the finding that would strengthen, weaken or reverse the investment case."/></label>
      <label>Estimated research hours<input aria-label="Estimated research hours" type="number" min={0.01} max={1000} step="any" value={effort} onChange={e=>setEffort(e.target.value)}/></label>
      <div className="intake-fields">
        <label>Work owner<input aria-label="Work owner" required maxLength={120} value={owner} onChange={e=>setOwner(e.target.value)}/></label>
        <label>Due date<input aria-label="Due date" required type="date" value={due} onChange={e=>setDue(e.target.value)}/></label>
        <label>Priority<select aria-label="Priority" value={priority} onChange={e=>setPriority(e.target.value as typeof priority)}>{["High","Medium","Low"].map(v=><option key={v}>{v}</option>)}</select></label>
        <label>Work status<select aria-label="Work status" value={status} onChange={e=>setStatus(e.target.value as typeof status)}>{["Open","Blocked","Complete"].map(v=><option key={v}>{v}</option>)}</select></label>
      </div>
      <label>Research outcome or blocker<textarea aria-label="Research outcome or blocker" required={status!=="Open"} maxLength={4000} value={outcome} onChange={e=>setOutcome(e.target.value)} placeholder="What did the source establish, and what remains uncertain?"/></label>
      {status==='Complete'&&<><label>Effect on the investment view<select aria-label="Effect on the investment view" value={effect} onChange={e=>setEffect(e.target.value as typeof effect)}>{['Not assessed','Strengthened','Weakened','Unchanged','Changed decision'].map(v=><option key={v}>{v}</option>)}</select></label><label>Why did the view change or stay the same?<textarea aria-label="Why did the view change or stay the same?" required={effect!=='Not assessed'} minLength={effect!=='Not assessed'?20:undefined} maxLength={4000} value={impactRationale} onChange={e=>setImpactRationale(e.target.value)}/></label><p className="muted">This records your assessment. A changed decision still needs its own signed review in Overview.</p></>}
      <fieldset className="outcome-sources"><legend>Outcome sources{status === "Complete" ? " · at least one required" : " · optional"}</legend>
        {company.sources.map(s=><label key={s.id} className="check-label"><input type="checkbox" checked={sources.includes(s.id)} onChange={e=>setSources(current=>e.target.checked?[...current,s.id]:current.filter(id=>id!==s.id))}/><span>{s.title}<small>{s.id} · {date(s.captured_at)}</small></span></label>)}
        {!company.sources.length && <p className="muted">Capture a source in Evidence before completing this work.</p>}
      </fieldset>
      <button className="ws-button primary" disabled={busy || !claim || (status==="Complete" && !sources.length)}>{busy?"Saving work…":"Save diligence work"}<Icon name="check" size={16}/></button>
    </form>
  </Drawer>;
}

export default function DiligencePlan({ company, inspect }: { company: Company; inspect: (claimId: string) => void }) {
  const { data } = useWorkspace();
  const router = useRouter();
  const search = useSearchParams();
  const tasks = company.diligence_tasks ?? [];
  const [edit, setEdit] = useState<{id?:string;claimId?:string}|null>(()=>tasks.some(t=>t.id===search.get("work"))?{id:search.get("work")!}:null);
  const [filter, setFilter] = useViewPreference(`diligence-filter:${company.id}`, "Active work", workFilters);
  const canWrite = company.can_write!==false && ["analyst","partner","admin"].includes(data?.role ?? "");
  const today = calendarDate();
  const active = tasks.filter(t=>t.status!=="Complete");
  const shown = filter === "All work" ? tasks : filter === "Completed" ? tasks.filter(t=>t.status==="Complete") : active;
  const close=()=>{setEdit(null);if(search.has("work"))router.replace(`/companies/${company.id}?tab=Diligence`,{scroll:false});};
  return <section className="work-card diligence-plan" aria-label="Diligence work plan">
    <div className="card-heading"><div><span className="eyebrow">RESEARCH TASKS</span><h2>Diligence work plan</h2></div><button className="ws-button primary" disabled={!canWrite || !company.claims.length} onClick={()=>setEdit({})}>Plan a task<Icon name="plus" size={16}/></button></div>
    <p className="muted">{active.length} active · {tasks.filter(t=>t.status==="Complete").length} complete. Due work appears in Today; outcomes are preserved in the next frozen memo.</p>
    <div className="queue-tabs" role="group" aria-label="Filter diligence work">{workFilters.map(value=><button aria-pressed={filter===value} className={filter===value?"selected":""} key={value} onClick={()=>setFilter(value)}>{value}</button>)}</div>
    {shown.map(t=><article className="diligence-work-row" key={t.id}>
      <div><span className={`risk-severity ${t.priority.toLowerCase()}`}>{t.priority}</span><span className="mini-label">{t.status} · {t.status!=="Complete" && t.due_date<today?"Overdue · ":""}Due {t.due_date}</span><h3>{t.title}</h3><p>{t.question}</p><small>Owner: {t.owner} · {t.claim_id} · Updated by {t.updated_by}</small>
        {t.outcome && <p className="task-outcome">{t.outcome}</p>}
        {t.decision_impact&&<p>Could change the view if: {t.decision_impact}</p>}
        {t.effort_hours!=null&&<small>Estimated effort: {t.effort_hours} hours</small>}
        {t.changed_view&&t.changed_view!=='Not assessed'&&<p>Reviewed effect: {t.changed_view}. {t.impact_rationale}</p>}
        {!!t.source_ids.length && <small>Outcome sources: {t.source_ids.join(" · ")}</small>}
      </div><div className="button-row"><button className="ws-button secondary" disabled={!canWrite} onClick={()=>setEdit({id:t.id})}>Review work</button><button className="text-link" onClick={()=>inspect(t.claim_id)}>Inspect claim & sources</button></div>
    </article>)}
    {!shown.length && <div className="empty-state compact"><h3>{filter==="Completed"?"No completed work yet":"Turn an unknown into a research task"}</h3><p>Choose a claim, record the question and assign its next check. Missing work is not evidence of low risk.</p></div>}
    <div className="diligence-question-actions"><h3>Questions still open</h3>{company.claims.filter(c=>c.state!=="Verified").map(c=><div key={c.id}><p>{c.question}<small>{c.id} · {c.state}</small></p><button className="text-link" disabled={!canWrite} onClick={()=>setEdit({claimId:c.id})}>Plan this check<Icon size={14}/></button></div>)}</div>
    {!company.claims.length && <Link className="text-link" href={`/companies/${company.id}?tab=Evidence`}>Capture the first claim and source →</Link>}
    {edit && <TaskForm company={company} task={tasks.find(t=>t.id===edit.id)} claimId={edit.claimId} close={close}/>}
  </section>;
}
