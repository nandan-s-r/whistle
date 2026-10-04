"use client";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { date, workspaceFetch } from "@/lib/workspace";
import { Avatar, Drawer, EvidenceChip, Icon } from "./Primitives";

interface ProfileNotes { name: string; role: string; previous_employer: string; profile_url: string; excerpt: string; question: string }
interface ReviewPlan { method: string; identity_match: string | null; steps: string[]; questions: string[]; writes: string }

function FounderResearch({ onClose }: { onClose: () => void }) {
  const { data, act, busy, error: saveError } = useWorkspace(); const { token } = useAuth();
  const [companyId, setCompanyId] = useState(data?.companies[0]?.id ?? "");
  const [fields, setFields] = useState<ProfileNotes>({ name: "", role: "Founder", previous_employer: "Not evidenced", profile_url: "", excerpt: "", question: "What primary source confirms this founder's role, employment dates and new venture?" });
  const [plan, setPlan] = useState<ReviewPlan | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  const company = data?.companies.find(c => c.id === companyId);
  const change = (key: keyof ProfileNotes, value: string) => { setFields({ ...fields, [key]: value }); setPlan(null); setSaved(false); };
  return <Drawer title="Founder research / LinkedIn companion" onClose={onClose}>
    <div className="research-method"><span className="profile-mark" aria-hidden="true">in</span><div><strong>Check a founder’s background.</strong><p>Use a profile URL and notes you are authorized to save. Compare identity, career history and the venture with primary sources.</p></div></div>
    {!company && <div className="notice">Capture a company first, then attach its founder research.</div>}
    <form className="workspace-form" onSubmit={async e => { e.preventDefault(); if (!company || !token) return; setLoading(true); setError(""); try { setPlan(await workspaceFetch<ReviewPlan>(`/companies/${company.id}/profile-preview`, token, { method: "POST", body: JSON.stringify(fields) })); } catch (e) { setError(e instanceof Error ? e.message : "Could not prepare the plan"); } finally { setLoading(false); } }}>
      <label>Company<select aria-label="Founder research company" value={companyId} onChange={e => { setCompanyId(e.target.value); setPlan(null); setSaved(false); }}>{data?.companies.map(c => <option key={c.id} value={c.id}>{c.name}{c.illustrative ? " · Demo" : ""}</option>)}</select></label>
      <label>Public LinkedIn profile<input aria-label="Public LinkedIn profile" required type="url" maxLength={500} value={fields.profile_url} placeholder="https://www.linkedin.com/in/founder-name" onChange={e => change("profile_url", e.target.value)}/></label>
      <div className="studio-form-pair"><label>Founder name<input required maxLength={120} value={fields.name} onChange={e => change("name", e.target.value)}/></label><label>Current role<input required maxLength={160} value={fields.role} onChange={e => change("role", e.target.value)}/></label></div>
      <label>Reported prior employer<input required maxLength={160} value={fields.previous_employer} onChange={e => change("previous_employer", e.target.value)}/></label>
      <label>Your profile notes<textarea aria-label="Your profile notes" required minLength={20} maxLength={4000} rows={5} value={fields.excerpt} onChange={e => change("excerpt", e.target.value)} placeholder="Record what you observed, including dates and uncertainties."/></label>
      <label>The question to verify<textarea aria-label="The question to verify" required maxLength={1000} value={fields.question} onChange={e => change("question", e.target.value)}/></label>
      {!plan && <button className="ws-button primary" disabled={loading || !company}>{loading ? "Preparing…" : "Preview research plan"}<Icon name="spark" size={16}/></button>}
    </form>
    {error && <p className="notice error" role="alert">{error}</p>}
    {saveError && <p className="notice error" role="alert">{saveError}</p>}
    {plan && <section className="profile-review"><span className="eyebrow">REVIEW BEFORE CAPTURE</span><h3>Your verification plan</h3><p className="muted">{plan.method}</p>{plan.identity_match && <p className="notice">This profile already belongs to person {plan.identity_match}. New notes keep that identity.</p>}<ol>{plan.steps.map(s => <li key={s}>{s}</li>)}</ol><h4>Questions to take forward</h4>{plan.questions.map(q => <p key={q}>{q}</p>)}<div className="notice">{plan.writes}</div>
      {!saved ? <button className="ws-button primary" disabled={busy} onClick={async () => { if (company && await act(company, { action: "profile_capture", profile: fields })) setSaved(true); }}>Capture notes for evidence review<Icon name="check" size={16}/></button> : <div className="notice" role="status"><strong>Founder notes captured.</strong> A source-linked claim now needs your review. <Link href={`/companies/${companyId}?tab=Evidence`}>Open the evidence register</Link></div>}
    </section>}
    <p className="studio-boundary">Save profile links and your own notes here. LinkedIn browsing and messages are not connected. Add public web sources through Connections.</p>
  </Drawer>;
}

export default function SourcingStudio({ onCapture, onThesis }: { onCapture: () => void; onThesis: (query: string) => void }) {
  const { data } = useWorkspace(); const [panel, setPanel] = useState<"founder" | "signals" | "people" | null>(null);
  const sources = (data?.companies ?? []).flatMap(company => company.sources.map(source => ({ company, source }))).sort((a,b) => b.source.captured_at.localeCompare(a.source.captured_at));
  const canWrite = ["analyst", "partner", "admin"].includes(data?.role ?? "");
  return <><details className="optional-tools sourcing-tool-menu"><summary>Research tools<span>Founder background, saved sources and contacts</span></summary><section className="sourcing-studio" aria-label="Sourcing studio">
    <div className="studio-tools"><button disabled={!canWrite} className="studio-tool" onClick={() => setPanel("founder")}><span className="profile-mark" aria-hidden="true">in</span><div><strong>Founder research</strong><span>Profile notes → verification plan</span></div><Icon size={17}/></button><button className="studio-tool" onClick={() => setPanel("signals")}><span className="studio-tool-icon"><Icon name="source" size={21}/></span><div><strong>Source journal</strong><span>{sources.length} captured sources, with context</span></div><Icon size={17}/></button><button className="studio-tool" onClick={() => setPanel("people")}><span className="studio-tool-icon"><Icon name="pipeline" size={21}/></span><div><strong>Founder directory</strong><span>People, backgrounds and linked companies</span></div><Icon size={17}/></button></div>
    <div className="studio-query-chips"><span>Try a search</span>{["India B2B SaaS MBB founders", "India founders", "DevTools"].map(q => <button key={q} onClick={() => onThesis(q)}>{q}<Icon size={13}/></button>)}</div>
  </section></details>
    {panel === "founder" && <FounderResearch onClose={() => setPanel(null)}/>}
    {panel === "signals" && <Drawer title="Source journal" onClose={() => setPanel(null)}><p className="muted">Sources saved to your account, ordered by capture date. The event itself may be older.</p>{sources.map(({ company: c, source: s }) => <article className="signal-entry" key={`${c.id}-${s.id}`}><span className="mono">{date(s.captured_at)} · {s.id}</span><h3>{s.title}</h3><p>{s.excerpt}</p><small>{s.illustrative ? "Fictional source" : s.method}</small><Link className="text-link" href={`/companies/${c.id}?tab=Evidence`}>{c.name} / inspect evidence<Icon size={14}/></Link></article>)}{!sources.length && <div className="empty-state"><h3>No sources saved yet</h3><p>Add a company and capture its first primary source.</p><button className="ws-button primary" disabled={!canWrite} onClick={() => { setPanel(null); onCapture(); }}>Capture company</button></div>}</Drawer>}
    {panel === "people" && <Drawer title="Founder directory" onClose={() => setPanel(null)}><p className="muted">Recorded identities and reported backgrounds. Inspect source-linked founder claims before treating employment as verified.</p>{data?.companies.flatMap(c => c.people.map(p => <article className="founder-map-row" key={`${c.id}-${p.id}`}><Avatar name={p.name}/><div><h3>{p.name}</h3><p>{p.role} · {c.name}</p><span>Reported prior employer: {p.previous_employer}</span><EvidenceChip state={c.claims.find(q => q.topic === "founder" && q.statement.includes(p.name))?.state ?? "Missing"}/><Link href={`/companies/${c.id}?tab=Evidence`}>Open company evidence<Icon size={14}/></Link>{p.profile_url && <a href={p.profile_url} target="_blank" rel="noopener noreferrer">Open public profile<Icon size={14}/></a>}</div></article>))}</Drawer>}
  </>;
}
