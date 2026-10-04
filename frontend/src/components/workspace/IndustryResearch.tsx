"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { date, workspaceFetch } from "@/lib/workspace";
import { Icon } from "./Primitives";

interface Research {
  checked_at: string; query: string; answer: string;
  citations: { title: string; url: string; supports: string }[];
  suggestions: string[];
  web_references: { title: string; url: string; excerpt: string }[];
  repositories: { name: string; url: string; description: string; stars: number; updated_at: string; search_query: string }[];
  launches: { name: string; url: string; summary: string; published_at: string; matched_terms: string }[];
  sources: { name: string; state: string; detail: string }[];
}
interface Capabilities {
  account: string; gemini: { selectable: boolean; detail: string }; firecrawl: { selectable: boolean; detail: string }; social_detail: string;
}
const examples = ["Find AI inference chip startups. Research founders, production deployments and competitors.", "Research Indian consumer brands with evidence of repeat purchases and founder experience.", "Find developer infrastructure startups with active open-source projects and paying customers.", "Research d-Matrix in depth: founders, product, customer deployments, competitors and what still needs checking."];
const widgetPolicy = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src https://www.gstatic.com data:; base-uri \'none\'; form-action \'none\'">';
function safeLink(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? value : ""; } catch { return ""; }
}

export default function IndustryResearch() {
  const { token } = useAuth(); const { data } = useWorkspace();
  const [query, setQuery] = useState(""); const [github, setGithub] = useState(true); const [consent, setConsent] = useState(false);
  const [gemini, setGemini] = useState(false); const [producthunt, setProducthunt] = useState(true);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null); const [connectionError, setConnectionError] = useState("");
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [firecrawl, setFirecrawl] = useState(false);
  const [result, setResult] = useState<Research | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const initializedSources = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!token) return;
    const pending = new AbortController();
    workspaceFetch<Capabilities>("/sourcing/research/capabilities", token, { signal: pending.signal }).then(next => {
      if (pending.signal.aborted) return;
      setCapabilities(next); setConnectionError("");
      if (!initializedSources.current) { setGemini(next.gemini.selectable); initializedSources.current = true; }
      else if (!next.gemini.selectable) setGemini(false);
      if (!next.firecrawl.selectable) setFirecrawl(false);
    }).catch(e => { if (!pending.signal.aborted) setConnectionError(e instanceof Error ? e.message : "Could not check research connections."); });
    return () => pending.abort();
  }, [token, connectionAttempt]);
  async function run() {
    if (!token || busy) return;
    controller.current?.abort(); const pending = new AbortController(); controller.current = pending;
    setBusy(true); setError(""); setResult(null);
    try {
      const next = await workspaceFetch<Research>("/sourcing/research", token, { method: "POST", body: JSON.stringify({ query, gemini, producthunt, github, firecrawl, consent }), signal: AbortSignal.any([pending.signal, AbortSignal.timeout(90000)]) });
      if (!pending.signal.aborted) setResult(next);
    } catch (e) { if (!pending.signal.aborted) setError(e instanceof Error ? e.message : "Research is unavailable. Please retry."); }
    finally { if (controller.current === pending) setBusy(false); }
  }
  return <section className="industry-research" aria-label="Industry research">
    <header><h2>What space are you exploring?</h2><p>Describe an industry or a customer problem. For a deeper profile, include a startup’s name.</p><p>Get a sourced brief on founders, products, customer usage, competitors and the questions worth asking next.</p></header>
    {connectionError ? <p className="notice error" role="alert">{connectionError} <button className="text-link" onClick={() => setConnectionAttempt(n => n + 1)}>Retry connection check</button></p> : !capabilities ? <p className="muted" role="status">Checking available research sources…</p> :
      <p className="research-account-status"><span>{capabilities.account}</span> · {capabilities.gemini.detail} {!capabilities.gemini.selectable && <Link href="/login">Cloud sign-in</Link>}</p>}
    <form onSubmit={e => { e.preventDefault(); void run(); }}>
      <label htmlFor="industry-prompt" className="sr-only">Industry research prompt</label>
      <textarea id="industry-prompt" required minLength={12} maxLength={1200} value={query} onChange={e => setQuery(e.target.value)} placeholder="Find semiconductor startups building AI inference hardware. Who are the founders, what is shipping, and which customers are using it?"/>
      <details><summary>Sources · {[gemini && "Gemini", producthunt && "Product Hunt", github && "GitHub", firecrawl && "Firecrawl"].filter(Boolean).join(", ") || "none selected"}</summary>
        <label className="check-label"><input type="checkbox" checked={gemini} disabled={!capabilities?.gemini.selectable || busy} onChange={e => setGemini(e.target.checked)}/>Gemini + Google Search · founder and startup research</label>
        <label className="check-label"><input type="checkbox" checked={producthunt} disabled={busy} onChange={e => setProducthunt(e.target.checked)}/>Product Hunt · matching recent launches</label>
        <label className="check-label"><input type="checkbox" checked={github} disabled={busy} onChange={e => setGithub(e.target.checked)}/>GitHub · public projects and repository attention</label>
        <label className="check-label"><input type="checkbox" checked={firecrawl} disabled={!capabilities?.firecrawl.selectable || busy} onChange={e => setFirecrawl(e.target.checked)}/>Firecrawl · additional public pages</label>
        <p>{capabilities?.firecrawl.detail}</p><p>{capabilities?.social_detail}</p>
      </details>
      <label className="check-label research-consent"><input required type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/>Send my public prompt to the selected research providers. Keep confidential deal details out.</label>
      <div className="research-prompt-actions"><span>{gemini ? "Founder profiles and customer evidence, with sources." : "Public leads only. Gemini is needed for an AI research brief."}</span><button className="ws-button primary" disabled={busy || !capabilities || !(gemini || producthunt || github || firecrawl) || !["analyst", "partner", "admin"].includes(data?.role ?? "")}>{busy ? "Researching public sources…" : "Research this space"}<Icon name="discover" size={15}/></button></div>
    </form>
    <details className="research-example-prompts"><summary>Try an example</summary>{examples.map(example => <button className="text-link" key={example} onClick={() => setQuery(example)}>{example}</button>)}</details>
    {error && <p className="notice error" role="alert">{error}</p>}
    {busy && <p role="status" className="muted">Searching selected sources. Each provider has a time limit; available results are kept if another source fails.</p>}
    {result && <div className="industry-research-result">
      <div className="deal-sourcing-result-line"><strong>{result.answer ? "Research brief" : "Public research leads"}</strong><span>Checked {date(result.checked_at)}</span></div>
      <p className="sourcing-method">{result.query}</p>
      {result.answer && <><p className="notice">AI research draft. Check each source before using founder, financial or customer claims. This answer is temporary and does not change company records.</p>
        <article className="research-answer"><ReactMarkdown urlTransform={safeLink} components={{a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>}}>{result.answer}</ReactMarkdown></article>
        <details className="research-citations"><summary>Inspect cited statements · {result.citations.length} references</summary>{result.citations.map((citation, i) => <div className="sourcing-source-note" key={i}><a href={citation.url} target="_blank" rel="noopener noreferrer">{citation.title}<Icon size={13}/></a><p>{citation.supports}</p><small>Provider citation; independent verification remains open.</small></div>)}</details>
        {result.suggestions.map((html, i) => <iframe key={i} title={`Google Search suggestions ${i + 1}`} className="search-suggestions" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" srcDoc={widgetPolicy + html}/>)}
        <p className="muted sourcing-method">Read the original sources. Add independently reviewed information through <Link href="/pipeline">company intake</Link>; this search answer is not imported into an investment database.</p>
      </>}
      {!!result.launches.length && <section className="research-repositories"><h3>Recent Product Hunt launches</h3><p className="sourcing-method">Launch descriptions matched industry keywords. Founder identity and customer adoption need further research.</p>{result.launches.map(launch => <article className="sourcing-source-note" key={launch.url}><a href={launch.url} target="_blank" rel="noopener noreferrer">{launch.name}<Icon size={13}/></a><p>{launch.summary}</p><small>Published {date(launch.published_at)} · {launch.matched_terms}</small></article>)}</section>}
      {!!result.repositories.length && <section className="research-repositories"><h3>Related public repositories</h3><p className="sourcing-method">Industry topics or keywords, recent activity and stars. Obvious tutorial lists are filtered. Projects and universities can still appear; company identity needs review.</p>{result.repositories.map(repo => <article className="sourcing-source-note" key={repo.url}><a href={repo.url} target="_blank" rel="noopener noreferrer">{repo.name}<Icon size={13}/></a><p>{repo.description}</p><small>{repo.stars} stars · repository updated {date(repo.updated_at)} · company identity unverified</small><small className="research-query-used">Search: {repo.search_query}</small></article>)}</section>}
      {!!result.web_references.length && <section className="research-repositories"><h3>Additional public sources · Firecrawl</h3>{result.web_references.map(source => <article className="sourcing-source-note" key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<Icon size={13}/></a><p>{source.excerpt}</p><small>Search excerpt; author independence and reuse rights unverified.</small></article>)}</section>}
      <div className="research-provider-status" role="status">{result.sources.map(source => <div key={source.name}><strong>{source.name} · {source.state}</strong><p>{source.detail}</p></div>)}</div>
      {!result.answer && !result.launches.length && !result.repositories.length && !result.web_references.length && <p className="notice">No matching results were returned. Try a simpler industry description or check the source statuses above. An empty search does not mean there are no relevant startups.</p>}
      {!result.answer && <Link className="text-link" href="/library?section=Connections%20%26%20imports">Check connections and account mode<Icon size={13}/></Link>}
    </div>}
  </section>;
}
