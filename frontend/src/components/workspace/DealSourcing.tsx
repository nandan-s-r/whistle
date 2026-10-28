"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Company, date, workspaceFetch } from "@/lib/workspace";
import { Drawer, Icon } from "./Primitives";

interface SourceNote { title: string; url: string; excerpt: string; published_on: string | null; relationship: string }
interface Candidate { id: string; name: string; domain: string; summary: string; origin: string; captured_at: string; published_at: string | null; fit: string; reasons: string[]; gaps: string[]; sources: SourceNote[]; receipt: string; signature: string }
interface Run { checked_at: string; focus: string; candidates: Candidate[]; sources: { name: string; state: string; detail: string }[]; method: string }
interface Signal { url: string; excerpt: string; relationship: string; category: string; question: string; duplicate_key: string; state: string }
const focuses = ["AI chips and semiconductor infrastructure", "AI and developer tools", "India B2B SaaS"];
const relationships = ["Unknown", "Customer-reported", "Company or maker", "Partner", "Independent reviewer"];
const IndustryResearch = dynamic(() => import("./IndustryResearch"), { loading: () => <p role="status">Opening industry research…</p> });

function CandidateReview({ candidate: c, xReady, onClose }: { candidate: Candidate; xReady: boolean; onClose: () => void }) {
  const { token } = useAuth(); const { data, refresh } = useWorkspace();
  const [domain, setDomain] = useState(c.domain); const [founder, setFounder] = useState("");
  const [url, setUrl] = useState(""); const [excerpt, setExcerpt] = useState(""); const [relationship, setRelationship] = useState("Unknown");
  const [signals, setSignals] = useState<Signal[]>([]); const [permission, setPermission] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [info, setInfo] = useState(""); const [saved, setSaved] = useState<Company | null>(null);
  const canWrite = ["analyst", "partner", "admin"].includes(data?.role ?? "");
  async function assess() {
    if (!token) return; setBusy(true); setError(""); setInfo("");
    try { const signal = await workspaceFetch<Signal>("/sourcing/signals/assess", token, { method: "POST", body: JSON.stringify({ url, excerpt, relationship }) });
      setSignals(current => current.some(s => s.duplicate_key === signal.duplicate_key) ? current : [...current, signal].slice(0, 10));
      setInfo("Excerpt added for review. Repeated text is kept once; author independence still needs checking."); setUrl(""); setExcerpt("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not assess this excerpt."); } finally { setBusy(false); }
  }
  async function xSearch() {
    if (!token) return; setBusy(true); setError(""); setInfo("");
    try { const result = await workspaceFetch<{ signals: Signal[]; coverage: string }>("/sourcing/signals/x", token, { method: "POST", body: JSON.stringify({ receipt: c.receipt, signature: c.signature }) });
      setSignals(current => [...new Map([...current, ...result.signals].map(s => [s.duplicate_key, s])).values()].slice(0, 10));
      setInfo(`${result.signals.length} posts returned. ${result.coverage}`);
    } catch (e) { setError(e instanceof Error ? e.message : "X search unavailable."); } finally { setBusy(false); }
  }
  async function save() {
    if (!token) return; setBusy(true); setError("");
    try { const result = await workspaceFetch<{ company: Company; message: string }>("/sourcing/save", token, { method: "POST", body: JSON.stringify({ receipt: c.receipt, signature: c.signature, domain, founder_name: founder.trim() || "Not evidenced", signals: signals.map(({ url, excerpt, relationship }) => ({ url, excerpt, relationship })), permitted_to_retain: permission }) });
      setSaved(result.company); setInfo(result.message); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save this candidate."); } finally { setBusy(false); }
  }
  return <Drawer title={`Review ${c.name}`} onClose={onClose}>
    <p className="muted">{c.origin} · captured {date(c.captured_at)}. This is a research lead; funding availability and investment suitability are unassessed.</p>
    <p className="sourcing-review-summary">{c.summary}</p>
    <h3>Why it fits this research</h3><ul className="sourcing-review-list">{c.reasons.map(r => <li key={r}>{r}</li>)}</ul>
    <h3>What to check next</h3><ul className="sourcing-review-list">{c.gaps.map(g => <li key={g}>{g}</li>)}</ul>
    <h3>Original sources</h3>{c.sources.map(s => <article className="sourcing-source-note" key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}<Icon size={13}/></a><p>{s.excerpt}</p><small>{s.relationship} · published {s.published_on || "date unknown"}</small></article>)}
    {!saved && <><details className="sourcing-customer-review"><summary>Check customer signals <span>Usage, complaints and interested-party statements</span></summary>
      <p className="muted">A post can suggest a question; it does not prove retention or customer obsession. Look for production workloads, repeat orders and direct customer confirmation.</p>
      <button type="button" className="ws-button secondary" disabled={!xReady || !canWrite || busy} onClick={() => void xSearch()}>Search recent X posts<Icon name="discover" size={14}/></button>
      {!xReady && <p className="muted">X search isn’t connected yet. You can review authorized excerpts below.</p>}
      <form className="workspace-form" onSubmit={e => { e.preventDefault(); void assess(); }}>
        <label>Public post or review URL<input required type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="LinkedIn, X or another public review link"/></label>
        <label>Excerpt you are authorized to retain<textarea required minLength={20} maxLength={2000} rows={4} value={excerpt} onChange={e => setExcerpt(e.target.value)}/></label>
        <label>Author relationship<select value={relationship} onChange={e => setRelationship(e.target.value)}>{relationships.map(r => <option key={r}>{r}</option>)}</select></label>
        <button className="ws-button secondary" disabled={busy || signals.length >= 10}>{busy ? "Checking…" : "Review excerpt"}</button>
      </form>
      {signals.map(s => <article className="sourcing-source-note" key={s.duplicate_key}><strong>{s.category} · unreviewed</strong><p>{s.excerpt}</p><p className="muted">{s.question}</p><a href={s.url} target="_blank" rel="noopener noreferrer">Open original post<Icon size={13}/></a><button className="text-link" onClick={() => setSignals(current => current.filter(item => item.duplicate_key !== s.duplicate_key))}>Remove from this draft</button></article>)}
    </details>
    <form className="workspace-form sourcing-save-form" onSubmit={e => { e.preventDefault(); void save(); }}>
      <label>Confirm company website<input required value={domain} readOnly={!!c.domain} maxLength={250} onChange={e => setDomain(e.target.value)} placeholder="company.com"/><small>Used to find an existing record. Product Hunt author names are not assumed to be founders.</small></label>
      <label>Founder, if known<input value={founder} maxLength={160} onChange={e => setFounder(e.target.value)} placeholder="Leave empty when not evidenced"/></label>
      {signals.length > 0 && <label className="check-label"><input type="checkbox" required checked={permission} onChange={e => setPermission(e.target.checked)}/>I have permission to retain these selected excerpts in my workspace.</label>}
      <button className="ws-button primary" disabled={!canWrite || busy}>{busy ? "Saving…" : "Save to research"}<Icon name="plus" size={15}/></button>
      <small>No investment score or decision is created. Existing company records are preserved.</small>
    </form></>}
    {error && <p className="notice error" role="alert">{error}</p>}{info && <p className="notice" role="status">{info}</p>}
    {saved && <Link className="ws-button primary" href={`/companies/${saved.id}?tab=Evidence`}>Review company evidence<Icon size={14}/></Link>}
  </Drawer>;
}

export default function DealSourcing({ initialQuery = "" }: { initialQuery?: string }) {
  const { token } = useAuth(); const { data } = useWorkspace();
  const [focus, setFocus] = useState(focuses[0]); const [keywords, setKeywords] = useState(""); const [days, setDays] = useState(30);
  const [mode, setMode] = useState("Industry research");
  const [result, setResult] = useState<Run | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [selected, setSelected] = useState<Candidate | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!token) return; const pending = new AbortController();
    workspaceFetch<Run>("/sourcing/preview", token, { signal: pending.signal }).then(setResult).catch(e => { if (!pending.signal.aborted) setError(e instanceof Error ? e.message : "Could not load research notes."); });
    return () => { pending.abort(); controller.current?.abort(); };
  }, [token]);
  const canWrite = ["analyst", "partner", "admin"].includes(data?.role ?? "");
  async function run() {
    if (!token) return; controller.current?.abort(); const pending = new AbortController(); controller.current = pending;
    setBusy(true); setError("");
    try { const next = await workspaceFetch<Run>("/sourcing/run", token, { method: "POST", body: JSON.stringify({ focus, keywords, days }), signal: AbortSignal.any([pending.signal, AbortSignal.timeout(35000)]) }); if (!pending.signal.aborted) setResult(next); }
    catch (e) { if (!pending.signal.aborted) setError(e instanceof Error ? e.message : "Could not complete sourcing."); }
    finally { if (controller.current === pending) setBusy(false); }
  }
  return <section className="deal-sourcing" aria-label="Deal sourcing">
    <div className="segmented" role="group" aria-label="Sourcing method">{["Industry research", "Launches & research notes"].map(option => <button key={option} aria-pressed={mode === option} className={mode === option ? "selected" : ""} onClick={() => setMode(option)}>{option}</button>)}</div>
    {mode === "Industry research" ? <IndustryResearch initialQuery={initialQuery} onBrowseNotes={() => setMode("Launches & research notes")}/> : <>
    <div className="deal-sourcing-heading"><div><h2>Find startups worth researching.</h2><p>Inspect launches and customer evidence. Save the candidates you want to review.</p></div><span className="record-origin">Source-backed leads</span></div>
    <form className="deal-sourcing-form" onSubmit={e => { e.preventDefault(); void run(); }}>
      <label>Research thesis<select value={focus} onChange={e => setFocus(e.target.value)}>{focuses.map(f => <option key={f}>{f}</option>)}</select></label>
      <label>Narrow by keyword<input value={keywords} maxLength={160} onChange={e => setKeywords(e.target.value)} placeholder="Optional: photonic, edge, memory…"/></label>
      <label>Launch window<select value={days} onChange={e => setDays(Number(e.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label>
      <button className="ws-button primary" disabled={!canWrite || busy}>{busy ? "Reading public feed…" : "Run sourcing"}<Icon name="discover" size={15}/></button>
    </form>
    {error && <p className="notice error" role="alert">{error}</p>}
    {result && <><div className="deal-sourcing-result-line" role="status"><strong>{result.candidates.length} research leads</strong><span>{result.focus}</span></div>
      <p className="muted sourcing-method">{result.method}</p>
      <div className="deal-leads" aria-busy={busy}>{result.candidates.map(c => <article className="deal-lead" key={c.id}><div><h3>{c.name}</h3><small>{c.origin} · captured {date(c.captured_at)}</small><p>{c.summary}</p><span className="deal-fit">{c.fit}</span><p className="deal-gap">Still to check: {c.gaps[0]}</p></div><button className="ws-button secondary" onClick={() => setSelected(c)}>Review lead<Icon size={14}/></button></article>)}</div>
      {!result.candidates.length && <div className="empty-state"><h3>No matches in this run</h3><p>The latest Product Hunt feed has limited coverage. Broaden the keyword or use a permitted sector source; no companies were invented.</p></div>}
      <details className="sourcing-coverage"><summary>Sources and coverage</summary>{result.sources.map(s => <div key={s.name}><strong>{s.name} · {s.state}</strong><p>{s.detail}</p></div>)}<small>{result.sources.some(s => s.name === "Product Hunt" && s.state !== "Not run") ? "Last run" : "Preview loaded"} {date(result.checked_at)}. No automatic monitoring or full-market coverage.</small><a href="https://www.producthunt.com/" target="_blank" rel="noopener noreferrer">Launch data from Product Hunt</a></details>
    </>}
    {selected && <CandidateReview key={selected.id} candidate={selected} xReady={result?.sources.some(s => s.name === "X customer posts" && s.state === "Configured") ?? false} onClose={() => setSelected(null)}/>}
    </>}
  </section>;
}
