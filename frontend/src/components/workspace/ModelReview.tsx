"use client";
import { useState } from "react";
import { Company, FrozenModel, ModelInputs, money, date } from "@/lib/workspace";
import { Drawer, Icon } from "./Primitives";

export function ModelComparison({ company, selectedVersion, onClose }: { company: Company; selectedVersion: number; onClose: () => void }) {
  const [newVersion, setNewVersion] = useState(selectedVersion);
  const [oldVersion, setOldVersion] = useState(company.models.filter(m => m.version !== selectedVersion).at(-1)?.version ?? selectedVersion);
  const newer = company.models.find(m => m.version === newVersion)!;
  const older = company.models.find(m => m.version === oldVersion)!;
  const changed = company.assumptions.filter(a => older.inputs[a.id as keyof ModelInputs] !== newer.inputs[a.id as keyof ModelInputs] || JSON.stringify(older.assumptions.filter(x => x.id === a.id).map(x => [x.rationale, x.source_id, x.owner])) !== JSON.stringify(newer.assumptions.filter(x => x.id === a.id).map(x => [x.rationale, x.source_id, x.owner])));
  const value = (model: FrozenModel, key: string) => {
    const n = model.inputs[key as keyof ModelInputs];
    return key === "dilution" ? `${(n * 100).toFixed(1)}%` : key === "multiple" ? `${n.toFixed(2)}x` : key === "years" ? `${n} years` : money(n);
  };
  return <Drawer title="Compare frozen models" onClose={onClose}>
    <p className="muted">See how your assumptions and returns changed. Both versions stay frozen; this comparison does not update either model.</p>
    <div className="studio-form-pair workspace-form"><label>From version<select aria-label="Comparison from version" value={oldVersion} onChange={e => setOldVersion(Number(e.target.value))}>{company.models.map(m => <option key={m.version} value={m.version}>Version {m.version} · {date(m.at)}</option>)}</select></label><label>To version<select aria-label="Comparison to version" value={newVersion} onChange={e => setNewVersion(Number(e.target.value))}>{company.models.map(m => <option key={m.version} value={m.version}>Version {m.version} · {date(m.at)}</option>)}</select></label></div>
    {oldVersion === newVersion ? <div className="notice">Select two different versions to see what changed.</div> : <>
      <div className="comparison-heading"><span className="eyebrow">BASE CASE / V{oldVersion} → V{newVersion}</span><h3>The effect on returns</h3></div>
      <div className="comparison-returns">{[{label:"MOIC",before:older.scenarios.Base.moic,after:newer.scenarios.Base.moic,unit:"x"},{label:"Annual IRR",before:older.scenarios.Base.irr*100,after:newer.scenarios.Base.irr*100,unit:"%"}].map(r => <div key={r.label}><span>{r.label}</span><strong>{r.before.toFixed(2)}{r.unit}<Icon size={16}/>{r.after.toFixed(2)}{r.unit}</strong><small>{r.after === r.before ? "No numerical change" : `${r.after > r.before ? "+" : ""}${(r.after-r.before).toFixed(2)} ${r.unit === "%" ? "percentage points" : "turns"}`}</small></div>)}</div>
      <h3>{changed.length} assumption{changed.length === 1 ? "" : "s"} changed</h3>
      {!changed.length && <p className="muted">Inputs, provenance and assumption notes match across these versions.</p>}
      {changed.map(a => { const before=older.assumptions.find(x=>x.id===a.id);const after=newer.assumptions.find(x=>x.id===a.id);return <article className="comparison-assumption" key={a.id}><h4>{a.label}</h4><div className="studio-form-pair"><div><span className="eyebrow">VERSION {oldVersion}</span><strong>{value(older,a.id)}</strong><p>{before?.rationale ?? "No frozen rationale recorded"}</p><small>{before?.source_id ?? "Analyst assumption"} · {before?.owner ?? older.owner}</small></div><div><span className="eyebrow">VERSION {newVersion}</span><strong>{value(newer,a.id)}</strong><p>{after?.rationale ?? "No frozen rationale recorded"}</p><small>{after?.source_id ?? "Analyst assumption"} · {after?.owner ?? newer.owner}</small></div></div></article>; })}
      <p className="studio-boundary">USD scenarios, with the model&apos;s exclusions preserved. A higher modeled return does not establish stronger evidence or a better investment.</p>
    </>}
  </Drawer>;
}

export interface AssumptionNote { rationale: string; source_id: string | null }
export function AssumptionEditor({ company, id, note, onSave, onClose }: { company: Company; id: string; note?: AssumptionNote; onSave: (note: AssumptionNote) => void; onClose: () => void }) {
  const assumption=company.assumptions.find(a=>a.id===id)!;
  const [rationale,setRationale]=useState(note?.rationale ?? assumption.rationale);
  const [source,setSource]=useState(note ? note.source_id ?? "" : assumption.source_id ?? "");
  return <Drawer title="Explain this assumption" onClose={onClose}><span className="eyebrow">{assumption.label}</span><h3>Why this value?</h3><p className="muted">Explain your scenario and optionally link a captured source. The note stays in your draft until you calculate and freeze a new model.</p><form className="workspace-form" onSubmit={e=>{e.preventDefault();onSave({rationale,source_id:source || null});}}><label>Assumption rationale<textarea aria-label="Assumption rationale" required minLength={10} maxLength={1000} rows={6} value={rationale} onChange={e=>setRationale(e.target.value)}/></label><label>Supporting captured source<select aria-label="Assumption source" value={source} onChange={e=>setSource(e.target.value)}><option value="">Analyst assumption / no direct source</option>{company.sources.map(s=><option key={s.id} value={s.id}>{s.id} · {s.title}</option>)}</select></label><div className="notice">A source link records provenance. It does not verify this scenario or resolve a claim.</div><button className="ws-button primary">Use in model draft<Icon name="check" size={16}/></button></form></Drawer>;
}
