"use client";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Company, ReviewMeeting, workspaceFetch, responseErrorMessage } from "@/lib/workspace";
import { Avatar, Drawer, EvidenceChip, Icon } from "./Primitives";

export async function downloadOwned(path: string, token: string, filename: string) {
  const response = await fetch(path, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(60000) });
  if (!response.ok) { const body = await response.json().catch(() => ({ detail: "Download unavailable. Please retry." })); throw new Error(responseErrorMessage(body, "Download unavailable. Please retry.")); }
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ArtifactDownload({ company, format, memoVersion, modelVersion, label }: { company: Company; format: "pdf" | "pptx" | "xlsx"; memoVersion?: number; modelVersion?: number; label: string }) {
  const { token } = useAuth(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <div className="artifact-download"><button className="ws-button secondary" disabled={busy || !token} onClick={async () => {
    if (!token) return; setBusy(true); setError("");
    try { await downloadOwned(`/api/workspace/companies/${company.id}/deliverable?revision=${company.revision}&format=${format}${memoVersion ? `&memo_version=${memoVersion}` : ""}${modelVersion ? `&model_version=${modelVersion}` : ""}`, token, `${company.id}-${memoVersion ? `memo-v${memoVersion}` : `model-v${modelVersion}`}.${format}`); }
    catch (e) { setError(e instanceof Error ? e.message : "Download failed"); } finally { setBusy(false); }
  }}><Icon name="download" size={15} />{busy ? "Preparing…" : label}</button>{error && <p className="notice error" role="alert">{error}</p>}</div>;
}

export function PresentationStudio({ company, memoVersion, onClose }: { company: Company; memoVersion: number; onClose: () => void }) {
  const { token } = useAuth(); const [slides, setSlides] = useState<{ title: string; body: string; kicker: string; footer: string }[]>([]);
  const [slide, setSlide] = useState(0); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  return <Drawer title="Investment review presentation" onClose={onClose}>
    <p className="muted">Build an editable deck from memo v{memoVersion}. It keeps this memo&apos;s evidence and linked model. The source appendix is included.</p>
    {!slides.length && <button className="ws-button primary" disabled={busy} onClick={async () => { if (!token) return; setBusy(true); setError(""); try {
      const result = await workspaceFetch<{ slides: typeof slides }>(`/companies/${company.id}/deliverable?revision=${company.revision}&format=slides&memo_version=${memoVersion}`, token); setSlides(result.slides);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not prepare slides"); } finally { setBusy(false); } }}>{busy ? "Preparing slides…" : "Prepare presentation"}<Icon size={16} /></button>}
    {error && <p className="notice error" role="alert">{error}</p>}
    {!!slides.length && <>
      <div className="slide-stage" aria-live="polite"><span>{slides[slide].kicker}</span><h3>{slides[slide].title}</h3><p>{slides[slide].body}</p><small>{slides[slide].footer}</small></div>
      <div className="slide-controls"><button className="ws-button secondary" disabled={slide === 0} onClick={() => setSlide(slide - 1)}>Previous slide</button><span className="mono">{slide + 1} / {slides.length}</span><button className="ws-button secondary" disabled={slide === slides.length - 1} onClick={() => setSlide(slide + 1)}>Next slide</button></div>
      <label className="workspace-form">Jump to a section<select aria-label="Presentation section" value={slide} onChange={e => setSlide(Number(e.target.value))}>{slides.map((s, i) => <option key={i} value={i}>{i + 1}. {s.title}</option>)}</select></label>
      <div className="studio-export-row"><ArtifactDownload company={company} format="pptx" memoVersion={memoVersion} label="Download PowerPoint"/><ArtifactDownload company={company} format="pdf" memoVersion={memoVersion} label="Download PDF memo"/></div>
      <p className="muted">Prepared from your frozen record. Editable slides; original text and evidence states are preserved. This preview shows slide content; PowerPoint uses the Whistle presentation template.</p>
    </>}
  </Drawer>;
}

export function MemoEditor({ company, version, onClose, onSaved }: { company: Company; version: number; onClose: () => void; onSaved: (version: number) => void }) {
  const { act, busy, error } = useWorkspace(); const memo = company.memos.find(m => m.version === version)!;
  const [why, setWhy] = useState(memo.reasoning?.why_win ?? ""); const [counter, setCounter] = useState(memo.reasoning?.counter_case ?? "");
  const [reversal, setReversal] = useState(memo.reasoning?.reversal ?? ""); const [note, setNote] = useState(""); const [sources, setSources] = useState<string[]>(memo.reasoning?.source_ids ?? []);
  return <Drawer title="Write your investment view" onClose={onClose}><p className="muted">Add your judgment to memo v{version}. Save a new version with the same frozen evidence and model; the original remains available.</p>
    {error && <p className="notice error" role="alert">{error}</p>}<form className="workspace-form" onSubmit={async e => { e.preventDefault(); const saved = await act(company, { action: "memo_reasoning", memo_version: version, reasoning: { why_win: why, counter_case: counter, reversal, source_ids: sources, change_note: note } }); if (saved) onSaved(saved.memos[saved.memos.length - 1].version); }}>
      <label>Why can this company win?<textarea aria-label="Why can this company win?" required minLength={20} maxLength={4000} rows={5} value={why} onChange={e => setWhy(e.target.value)} placeholder="Connect the approved facts to your investment thesis. Cite selected sources using [S01]."/></label>
      <label>The strongest counter-case<textarea required aria-label="The strongest counter-case" minLength={20} maxLength={4000} rows={5} value={counter} onChange={e => setCounter(e.target.value)}/></label>
      <label>What would reverse your view?<textarea aria-label="What would reverse your view?" required minLength={10} maxLength={2000} value={reversal} onChange={e => setReversal(e.target.value)}/></label>
      <fieldset className="studio-choices"><legend>Evidence used in this judgment</legend>{memo.sources.map(s => <label key={s.id}><input type="checkbox" checked={sources.includes(s.id)} onChange={e => setSources(e.target.checked ? [...sources, s.id] : sources.filter(id => id !== s.id))}/><span><b className="mono">{s.id}</b> {s.title}</span></label>)}</fieldset>
      <label>What changed?<input required minLength={5} maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder="A short note for the next reviewer"/></label>
      <div className="notice">These sections are attributed analyst judgment. Saving does not verify additional facts or select an investment decision.</div>
      <button className="ws-button primary" disabled={busy}>{busy ? "Saving…" : "Approve & freeze new version"}<Icon name="check" size={16}/></button>
    </form></Drawer>;
}

function localInput(time: string) {
  const d = new Date(time); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export function MeetingEditor({ company, meeting, onClose }: { company: Company; meeting?: ReviewMeeting; onClose: () => void }) {
  const { act, busy, error } = useWorkspace(); const [title, setTitle] = useState(meeting?.title ?? `${company.name} / investment review`);
  const [kind, setKind] = useState<ReviewMeeting["kind"]>(meeting?.kind ?? "Founder call");
  const [time, setTime] = useState(meeting ? localInput(meeting.starts_at) : ""); const [duration, setDuration] = useState(meeting?.duration_minutes ?? 30);
  const [agenda, setAgenda] = useState(meeting?.agenda ?? company.claims.filter(c => c.state !== "Verified").slice(0, 3).map(c => `${c.question} [${c.id}]`).join("\n"));
  const [location, setLocation] = useState(meeting?.location ?? ""); const [claims, setClaims] = useState<string[]>(meeting?.claim_ids ?? []);
  const [memo, setMemo] = useState(meeting?.memo_version ?? 0); const [status, setStatus] = useState<ReviewMeeting["status"]>(meeting?.status ?? "Planned"); const [outcome, setOutcome] = useState(meeting?.outcome ?? "");
  return <Drawer title={meeting ? "Review meeting & outcome" : "Schedule an investment review"} onClose={onClose}>
    <div className="meeting-company"><Avatar name={company.name}/><div><strong>{company.name}</strong><span>{company.stage} · {company.geography}</span></div></div>
    {error && <p className="notice error" role="alert">{error}</p>}<form className="workspace-form" onSubmit={async e => { e.preventDefault(); if (await act(company, { action: "meeting", meeting: { id: meeting?.id ?? null, title, kind, starts_at: new Date(time).toISOString(), duration_minutes: duration, location, agenda, claim_ids: claims, memo_version: memo || null, status, outcome } })) onClose(); }}>
      <label>Meeting title<input required maxLength={160} value={title} onChange={e => setTitle(e.target.value)}/></label>
      <div className="studio-form-pair"><label>Review type<select value={kind} onChange={e => setKind(e.target.value as ReviewMeeting["kind"])}>{["Founder call", "Customer reference", "Partner review", "Investment committee", "Follow-up"].map(k => <option key={k}>{k}</option>)}</select></label><label>Duration<select value={duration} onChange={e => setDuration(Number(e.target.value))}>{Array.from(new Set([15,30,45,60,90,120,240,duration])).sort((a,b)=>a-b).map(n => <option key={n} value={n}>{n} minutes</option>)}</select></label></div>
      <label>Starts at<input aria-label="Meeting starts at" type="datetime-local" required value={time} onChange={e => setTime(e.target.value)}/><small>Your timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Calendar downloads use the same instant.</small></label>
      <label>Location or call link<input maxLength={300} value={location} onChange={e => setLocation(e.target.value)} placeholder="Add a room or meeting URL"/></label>
      <label>Agenda<textarea aria-label="Meeting agenda" required maxLength={4000} rows={5} value={agenda} onChange={e => setAgenda(e.target.value)}/></label>
      <fieldset className="studio-choices"><legend>Questions to resolve</legend>{company.claims.map(c => <label key={c.id}><input type="checkbox" checked={claims.includes(c.id)} onChange={e => setClaims(e.target.checked ? [...claims, c.id] : claims.filter(id => id !== c.id))}/><span><b className="mono">{c.id}</b> {c.question}</span></label>)}</fieldset>
      <label>Memo for this review<select value={memo} onChange={e => setMemo(Number(e.target.value))}><option value={0}>No frozen memo selected</option>{company.memos.map(m => <option key={m.version} value={m.version}>Memo v{m.version}</option>)}</select></label>
      {meeting && <><label>Meeting status<select value={status} onChange={e => setStatus(e.target.value as ReviewMeeting["status"])}>{["Planned", "Complete", "Cancelled"].map(s => <option key={s}>{s}</option>)}</select></label><label>Outcome / next action<textarea aria-label="Meeting outcome" required={status === "Complete"} maxLength={4000} value={outcome} onChange={e => setOutcome(e.target.value)}/></label></>}
      <div className="notice">Saved to this company and Today. Download a calendar file after saving. Attendees are not contacted; calendar syncing is not connected.</div>
      <button className="ws-button primary" disabled={busy}>{busy ? "Saving…" : meeting ? "Save meeting outcome" : "Save meeting"}<Icon name="check" size={16}/></button>
    </form>
  </Drawer>;
}

export function MeetingBrief({ company, meeting, onClose, onEdit }: { company: Company; meeting: ReviewMeeting; onClose: () => void; onEdit: () => void }) {
  const { data } = useWorkspace();
  const canWrite = company?.can_write!==false && ["analyst", "partner", "admin"].includes(data?.role ?? "");
  const { token } = useAuth(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const claims = company.claims.filter(c => meeting.claim_ids.includes(c.id));
  return <Drawer title="Meeting preparation" onClose={onClose}><div className="meeting-company"><Avatar name={company.name}/><div><strong>{company.name}</strong><span>{meeting.kind} · {meeting.status}</span></div></div>
    <h3>{meeting.title}</h3><p>{new Date(meeting.starts_at).toLocaleString()} · {meeting.duration_minutes} minutes</p>{meeting.location && <p>{meeting.location}</p>}
    <div className="meeting-agenda"><span className="eyebrow">YOUR AGENDA</span><p>{meeting.agenda}</p></div>
    <h3>Questions for this review</h3>{claims.map(c => <article className="meeting-question" key={c.id}><EvidenceChip state={c.state}/><h4>{c.question}</h4><p>{c.statement}</p><Link href={`/companies/${company.id}?tab=Evidence`}>Inspect evidence for {c.id}<Icon size={14}/></Link></article>)}
    {!claims.length && <p className="muted">No claims linked. Add the questions you want this meeting to resolve.</p>}
    {meeting.memo_version && <Link className="text-link" href={`/companies/${company.id}?tab=Memo&memo=${meeting.memo_version}`}>Read memo v{meeting.memo_version}<Icon size={14}/></Link>}
    {meeting.outcome && <div className="meeting-agenda"><span className="eyebrow">RECORDED OUTCOME</span><p>{meeting.outcome}</p><small>Meeting notes do not change claim verification.</small></div>}
    <div className="studio-export-row"><button className="ws-button primary" disabled={!canWrite} onClick={onEdit}>Edit meeting / record outcome</button><button className="ws-button secondary" disabled={busy} onClick={async () => { if (!token) return; setBusy(true); setError(""); try { await downloadOwned(`/api/workspace/companies/${company.id}/calendar?revision=${company.revision}&meeting_id=${meeting.id}`, token, `${company.id}-review.ics`); } catch (e) { setError(e instanceof Error ? e.message : "Calendar download failed"); } finally { setBusy(false); } }}><Icon name="download" size={15}/>{busy ? "Preparing…" : "Download calendar file"}</button></div>{error && <p role="alert" className="notice error">{error}</p>}
    <p className="muted">Owner: {meeting.owner}. Preparation uses the current evidence register; the selected memo remains frozen.</p>
  </Drawer>;
}

export function ReviewAgenda({ company, maxVisible, heading = "Review agenda" }: { company?: Company; maxVisible?: number; heading?: string }) {
  const [openedAt] = useState(() => Date.now());
  const [showAll, setShowAll] = useState(false);
  const { data } = useWorkspace(); const [create, setCreate] = useState(false); const [companyId, setCompanyId] = useState(company?.id ?? "");
  const [selected, setSelected] = useState<{ company: string; meeting: string; edit: boolean } | null>(null);
  const companies = company ? [company] : data?.companies ?? [];
  const meetings = companies.flatMap(c => (c.meetings ?? []).filter(m => m.status === "Planned").map(m => ({ company: c, meeting: m }))).sort((a,b) => a.meeting.starts_at.localeCompare(b.meeting.starts_at));
  const visibleMeetings = showAll || !maxVisible ? meetings : meetings.slice(0, maxVisible);
  const active = data?.companies.find(c => c.id === (selected?.company ?? companyId));
  const meeting = active?.meetings?.find(m => m.id === selected?.meeting);
  const canWrite = company?.can_write!==false && ["analyst", "partner", "admin"].includes(data?.role ?? "");
  return <section className="work-card review-agenda" aria-label={maxVisible ? "Meetings and follow-ups" : "Upcoming investment reviews"}><div className="card-heading"><div><span className="eyebrow">{maxVisible ? "SCHEDULE" : "UPCOMING REVIEWS"}</span><h2>{heading} <span className="count-pill">{meetings.length}</span></h2></div><button className="ws-button secondary" disabled={!canWrite} onClick={() => { setCompanyId(company?.id ?? companies[0]?.id ?? ""); setCreate(true); }}><Icon name="today" size={16}/>Schedule review</button></div>
    {visibleMeetings.map(({ company: c, meeting: m }) => <button key={`${c.id}:${m.id}`} className="agenda-row" onClick={() => setSelected({ company: c.id, meeting: m.id, edit: false })}><span className="agenda-date"><b>{new Date(m.starts_at).toLocaleDateString(undefined,{day:"2-digit"})}</b><span>{new Date(m.starts_at).toLocaleDateString(undefined,{month:"short"})}</span></span><div><strong>{m.title}</strong><span>{c.name} · {m.kind} · {new Date(m.starts_at).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}{new Date(m.starts_at).getTime() + m.duration_minutes*60000 < openedAt ? " · Outcome overdue" : ""}</span></div><span className="agenda-question-count">{m.claim_ids.length} questions</span><Icon size={16}/></button>)}
    {!!maxVisible && meetings.length > maxVisible && <div className="today-meetings-toggle"><button className="text-link" onClick={() => setShowAll(!showAll)}>{showAll ? "Show fewer meetings" : `Show all ${meetings.length} meetings`}</button></div>}
    {!meetings.length && <div className="agenda-empty"><Icon name="today" size={26}/><div><strong>No meetings planned</strong><p>Schedule a founder call, customer reference or partner review. Keep the questions and outcome with the company.</p></div></div>}
    {company && (company.meetings ?? []).some(m => m.status !== "Planned") && <details className="meeting-history"><summary>Past & cancelled reviews</summary>{company.meetings.filter(m => m.status !== "Planned").map(m => <button key={m.id} className="agenda-row" onClick={() => setSelected({company:company.id,meeting:m.id,edit:false})}><strong>{m.title}</strong><span>{m.status}</span><Icon size={16}/></button>)}</details>}
    {create && !active && <Drawer title="Choose a company for this review" onClose={() => setCreate(false)}><p className="muted">Capture a company in Discover before planning its review.</p><Link className="ws-button primary" href="/discover">Discover companies</Link></Drawer>}
    {create && active && <Drawer title="Choose a company" onClose={() => setCreate(false)}><form className="workspace-form" onSubmit={e=>{e.preventDefault();setCreate(false);setSelected({company:active.id,meeting:"",edit:true});}}><label>Review company<select aria-label="Review company" value={companyId} onChange={e=>setCompanyId(e.target.value)}>{companies.map(c=><option key={c.id} value={c.id}>{c.name}{c.illustrative?" · Demo":""}</option>)}</select></label><p className="muted">The agenda will use this company&apos;s questions and memo.</p><button className="ws-button primary">Plan this review<Icon size={16}/></button></form></Drawer>}
    {selected?.edit && active && <MeetingEditor key={selected.meeting || active.id} company={active} meeting={meeting} onClose={()=>setSelected(null)}/>}
    {selected && !selected.edit && active && meeting && <MeetingBrief company={active} meeting={meeting} onClose={()=>setSelected(null)} onEdit={()=>setSelected({...selected,edit:true})}/>}
  </section>;
}
