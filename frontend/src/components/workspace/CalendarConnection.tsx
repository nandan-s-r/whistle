"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";

interface Status { available: boolean; state: string; detail: string; account_scope: string }
interface Event { uri: string; title: string; starts_at: string; duration_minutes: number; status: string; receipt: string; signature: string }
interface Preview { events: Event[]; checked_at: string; detail: string; has_more: boolean; skipped: number }
const meetingTime = (value: string) => new Date(value).toLocaleString("en-IN", {dateStyle:"medium", timeStyle:"short"});

export default function CalendarConnection() {
  const { token } = useAuth(); const { data, refresh } = useWorkspace();
  const [status, setStatus] = useState<Status | null>(null);
  const [loadedToken, setLoadedToken] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState(""); const [companyId, setCompanyId] = useState("");
  const [consent, setConsent] = useState(false); const [retain, setRetain] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [message, setMessage] = useState(""); const [imported, setImported] = useState("");
  const [attempt, setAttempt] = useState(0);
  const pending = useRef<AbortController | null>(null);
  const visible = loadedToken === token;
  useEffect(() => {
    const controller = new AbortController();
    if (token) fetch("/api/platform/calendly/status", {headers:{Authorization:"Bearer " + token}, signal:AbortSignal.any([controller.signal, AbortSignal.timeout(15000)])})
      .then(async response => { if (!response.ok) throw new Error("Could not check calendar access."); return response.json() as Promise<Status>; })
      .then(next => { if (!controller.signal.aborted) { setStatus(next); setLoadedToken(token); setPreview(null); setError(""); setConsent(false); setRetain(false); setMessage(""); setImported(""); } })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not check calendar access."); });
    return () => { controller.abort(); pending.current?.abort(); };
  }, [token, attempt]);
  async function request(path: string, body: unknown) {
    if (!token || busy) return;
    pending.current?.abort(); const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/platform/calendly/" + path, {method:"POST", headers:{Authorization:"Bearer " + token,"Content-Type":"application/json"}, body:JSON.stringify(body), signal:AbortSignal.any([controller.signal, AbortSignal.timeout(30000)])});
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Could not complete calendar import.");
      if (controller.signal.aborted) return;
      if (path === "preview") { setPreview(result); setSelected(""); setRetain(false); setImported(""); }
      else { setMessage(result.message); setImported(companyId); setRetain(false); await refresh(); }
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Calendar request failed. Retry later."); }
    finally { if (pending.current === controller) setBusy(false); }
  }
  const event = preview?.events.find(item => item.uri === selected);
  const company = data?.companies.find(item => item.id === companyId);
  const canWrite = ["analyst","partner","admin"].includes(data?.role ?? "");
  return <section className="connection-section calendar-connection" aria-label="Calendly meeting import">
    <h3>Bring a Calendly meeting into a company review</h3>
    <p>Load recent bookings, choose a meeting and select its company. Add an agenda in Whistle. Booking or importing a meeting does not record attendance or a founder reply.</p>
    {error && <p role="alert" className="auth-error">{error}</p>}
    <button className="text-link" disabled={busy} onClick={()=>setAttempt(value=>value+1)}>Check calendar access again</button>
    {visible && status ? <><p className="notice"><strong>{status.state}</strong> · {status.detail}</p>
      {!status.available && <details><summary>Private setup for an internal workspace</summary><p>An operator needs a Calendly token with read-only user/event scopes, kept in private backend settings. Bind it to this account: <code>{status.account_scope}</code>. Do not paste a token here or in chat. Public multi-account use requires per-user OAuth.</p><a className="text-link" href="https://developer.calendly.com/docs/authentication/how-to-authenticate-with-personal-access-tokens" target="_blank" rel="noopener noreferrer">Calendly setup instructions</a></details>}
      <form className="capture-form" onSubmit={e=>{e.preventDefault(); setPreview(null); void request("preview",{consent});}}>
        <label className="check-label"><input type="checkbox" required checked={consent} disabled={!status.available || busy || !canWrite} onChange={e=>setConsent(e.target.checked)}/>Read bookings from my connected Calendly account.</label>
        <button className="ws-button secondary" disabled={!status.available || busy || !canWrite}>{busy ? "Checking Calendly…" : "Load Calendly meetings"}</button>
      </form>
      {preview && <><p className="sourcing-method">Checked {meetingTime(preview.checked_at)} · {preview.detail}</p>
        {preview.has_more && <p className="notice">More meetings exist outside this first page. This is a limited preview.</p>}
        {!!preview.skipped && <p className="notice">{preview.skipped} unsupported or unrelated bookings were omitted.</p>}
        {preview.events.length ? <form className="capture-form" onSubmit={e=>{e.preventDefault(); if(event && company) void request("import",{company_slug:company.id, revision:company.revision, receipt:event.receipt, signature:event.signature, consent:retain});}}>
          <label>Meeting<select required aria-label="Calendly meeting" value={selected} onChange={e=>{setSelected(e.target.value);setRetain(false);}}><option value="">Choose a meeting</option>{preview.events.map(item=><option key={item.uri} value={item.uri}>{item.title} · {meetingTime(item.starts_at)} · {item.status}</option>)}</select></label>
          {event && <p>{event.duration_minutes} minutes · {event.status} · times displayed in your local timezone</p>}
          <label>Company<select required aria-label="Company for Calendly meeting" value={companyId} onChange={e=>{setCompanyId(e.target.value);setRetain(false);}}><option value="">Choose the company yourself</option>{data?.companies.filter(item=>item.can_write !== false).map(item=><option key={item.id} value={item.id}>{item.name}{item.fund_record ? " · shared deal" : " · personal record"}</option>)}</select></label>
          <label className="check-label"><input required type="checkbox" checked={retain} onChange={e=>setRetain(e.target.checked)}/>I may retain this selected meeting in this company record and share it with people who have access to the deal.</label>
          <button className="ws-button primary" disabled={busy || !retain || !event || !company || !canWrite}>Import selected meeting</button>
        </form> : <p>No supported bookings returned in this limited date window.</p>}
      </>}
    </> : <p role="status">Checking calendar access…</p>}
    {message && visible && <p role="status">{message} <Link className="text-link" href={`/companies/${imported}?tab=Overview#review-agenda`}>Open company review</Link></p>}
  </section>;
}
