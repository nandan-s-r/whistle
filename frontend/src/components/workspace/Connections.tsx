"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { analyticsConfigured } from "@/lib/telemetry";
import CalendarConnection from "./CalendarConnection";

interface Connection {
  name: string;
  state: string;
  detail: string;
}
interface Capability { selectable: boolean; detail: string }
interface ConnectionStatus {
  mode: string;
  connections: Connection[];
  check_scope: string;
  tasks: Record<string, Capability>;
}
interface Job {
  id: string;
  company_revision: number;
  kind: string;
  state: string;
  cancelled: boolean;
  payload: { url?: string; task: string; company_slug: string };
  result?: {
    draft?: string;
    excerpt?: string;
    url?: string;
    title?: string;
    indexed?: number;
    provider?: string;
  };
  error?: string;
  created_at: string;
}
interface StoredFile {
  name: string;
  path: string;
  id: string;
  created_at: string;
}
const tasks = [
  "Challenge this claim",
  "Find the weakest assumption",
  "Draft customer-reference questions",
  "Identify conflicting evidence",
  "Explain what changed",
];
export function Connections() {
  const { token } = useAuth();
  const { data, refresh } = useWorkspace();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [mode, setMode] = useState("");
  const [capabilities, setCapabilities] = useState<Record<string, Capability>>({});
  const [checkScope, setCheckScope] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [fileLink, setFileLink] = useState<{
    name: string;
    url: string;
  } | null>(null);
  const [company, setCompany] = useState("");
  const [kind, setKind] = useState("research_draft");
  const [task, setTask] = useState(tasks[0]);
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<
    {
      company_id: string;
      source_id: string;
      content: string;
      similarity: number;
    }[]
  >([]);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const api = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const response = await fetch("/api/platform" + path, {
        ...init,
        headers: {
          Authorization: "Bearer " + token,
          ...(init?.body instanceof FormData
            ? {}
            : { "Content-Type": "application/json" }),
          ...init?.headers,
        },
        signal: AbortSignal.timeout(30000),
      });
      const result = await response.json().catch(() => {
        throw new Error(
          "The workspace service is temporarily unavailable. Please retry.",
        );
      });
      if (!response.ok)
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : "Unable to complete this request.",
        );
      return result;
    },
    [token],
  );
  const load = useCallback(async () => {
    const [status, pending, stored] = await Promise.allSettled([
      api<ConnectionStatus>("/connections"),
      api<Job[]>("/jobs"),
      api<StoredFile[]>("/files"),
    ]);
    if (status.status === "fulfilled") {
      setConnections(status.value.connections);
      setMode(status.value.mode);
      setCapabilities(status.value.tasks);
      setCheckScope(status.value.check_scope);
    } else {
      setCapabilities({});
    }
    if (pending.status === "fulfilled") setJobs(pending.value);
    if (stored.status === "fulfilled") setFiles(stored.value);
    setLoadError([status, pending, stored].filter(r => r.status === "rejected").map(r => r.status === "rejected" && r.reason instanceof Error ? r.reason.message : "A workspace check could not complete.").join(" "));
  }, [api]);
  useEffect(() => {
    let active = true;
    const update = () =>
      load().catch((e) => {
        if (active) setLoadError(e.message);
      });
    void update();
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void api<Job[]>("/jobs").then(rows => { if (active) setJobs(rows); }).catch(e => {
        if (active) setLoadError(e.message);
      });
    }, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [load, api]);
  const selectedCompany = company || data?.companies.find(c => !c.fund_record)?.id || "";
  async function perform(operation: () => Promise<unknown>, notice: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
      await load();
      setMessage(notice);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to complete this request.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="connection-workspace">
      <span className="eyebrow">{mode || "LOADING CONNECTIONS"}</span>
      <h2>Connections & imports</h2>
      <p className="document-lede">
        Import a public page, review a research task or search saved sources.
        Imported claims need review.
      </p>
      {(error || loadError) && (
        <p className="auth-error" role="alert">
          {error || loadError}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <nav className="button-row" aria-label="Connected investment workflows"><Link className="ws-button secondary" href="/discover?mode=sourcing">Research an industry</Link><Link className="ws-button secondary" href="/pipeline">Review Pipeline</Link><Link className="ws-button secondary" href="/portfolio">Check Portfolio</Link><Link className="ws-button secondary" href="/library?section=Fund%20access">Team deal permissions</Link></nav>
      <CalendarConnection/>
      <details className="connection-section"><summary>All connections & setup · {connections.length} services</summary>
      <p>{checkScope || "Checking setup. Service credentials are never displayed."}</p>
      <div className="connection-list">
        {connections.map((connection) => (
          <section className="connection-row" key={connection.name}>
            <h3>{connection.name}</h3>
            <span className="state-pill">
              {connection.name === "PostHog"
                ? analyticsConfigured
                  ? "Configured · untested"
                  : "Needs project key"
                : connection.state}
            </span>
            <p>{connection.detail}</p>
          </section>
        ))}
      </div>
      </details>
      <section className="connection-section">
        <h3>Run a supervised task</h3>
        <p>
          Research uses the selected company’s captured sources. Imported pages
          remain unreviewed. Indexing sends source excerpts to Gemini.
        </p>
        <p role="status">{capabilities[kind]?.detail || "Checking task availability…"}</p>
        <form
          className="capture-form"
          onSubmit={(e) => {
            e.preventDefault();
            void perform(
              () =>
                api("/jobs", {
                  method: "POST",
                  body: JSON.stringify({
                    company_slug: selectedCompany,
                    kind,
                    url: kind === "web_capture" ? url : null,
                    task,
                  }),
                }),
              "Task queued. You can leave this page while it runs.",
            );
          }}
        >
          <label>
            Company
            <select
              aria-label="Company"
              required
              value={selectedCompany}
              onChange={(e) => setCompany(e.target.value)}
            >
              {!data?.companies.some(c => !c.fund_record) && (
                <option value="">Capture a company first</option>
              )}
              {data?.companies.filter(c=>!c.fund_record).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.illustrative ? " · demonstration" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Task
            <select aria-label="Task" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="research_draft">Research draft</option>
              <option value="web_capture">Capture a public web source</option>
              <option value="index_evidence">
                Index evidence for knowledge search
              </option>
            </select>
          </label>
          {kind === "research_draft" && (
            <label>
              Research question
              <select aria-label="Research question" value={task} onChange={(e) => setTask(e.target.value)}>
                {tasks.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          )}
          {kind === "web_capture" && (
            <label>
              Public source URL
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://company.com/about"
              />
            </label>
          )}
          <button
            className="ws-button primary"
            disabled={busy || !selectedCompany || !capabilities[kind]?.selectable}
          >
            Queue task
          </button>
        </form>
      </section>
      <section className="connection-section">
        <h3>Import & research queue</h3>
        {!jobs.length && (
          <p>
            No tasks queued yet. Every result will show its source or research
            scope.
          </p>
        )}
        {jobs.map((job) => (
          <article className="job-card" key={job.id}>
            <div className="job-heading">
              <strong>{job.kind.replaceAll("_", " ")}</strong>
              <span className="state-pill">
                {job.cancelled && job.state !== "Cancelled"
                  ? "Cancellation requested"
                  : job.state}
              </span>
            </div>
            <small>
              Company version {job.company_revision} ·{" "}
              {new Date(job.created_at).toLocaleString()}
            </small>
            {job.error && <p role="alert">{job.error}</p>}
            {job.result?.provider && (
              <p>{job.result.provider} · draft for review</p>
            )}
            {job.result?.url && (
              <p>
                <a href={job.result.url} target="_blank" rel="noreferrer">
                  {job.result.title || "Original source"}
                </a>
              </p>
            )}
            {(job.result?.draft || job.result?.excerpt) && (
              <pre className="import-excerpt">
                {job.result.draft || job.result.excerpt}
              </pre>
            )}
            {job.result?.indexed !== undefined && (
              <p>
                {job.result.indexed} source excerpts indexed. Claim states were
                unchanged.
              </p>
            )}
            <div className="button-row">
              {["Queued", "Running"].includes(job.state) && !job.cancelled && (
                <button
                  className="ws-button secondary"
                  disabled={busy}
                  onClick={() =>
                    void perform(
                      () => api(`/jobs/${job.id}/cancel`, { method: "POST" }),
                      "Cancellation requested.",
                    )
                  }
                >
                  Cancel task
                </button>
              )}
              {job.state === "Succeeded" && job.kind === "research_draft" && (
                <button
                  className="ws-button secondary"
                  disabled={busy || data?.companies.some((c) => c.ai_runs.some((run) => run.id === job.id))}
                  onClick={() =>
                    void perform(async () => {
                      await api(`/jobs/${job.id}/save-draft`, {
                        method: "POST",
                        body: JSON.stringify({
                          revision: data?.companies.find(
                            (c) => c.id === job.payload.company_slug,
                          )?.revision,
                        }),
                      });
                      await refresh();
                    }, "Draft saved in the company's assistant for approval.")
                  }
                >
                  {data?.companies.some((c) => c.ai_runs.some((run) => run.id === job.id)) ? "Draft saved for review" : "Save draft for review"}
                </button>
              )}
              {job.result?.excerpt && (
                <button
                  className="ws-button secondary"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(job.result!.excerpt!)
                      .then(() =>
                        setMessage(
                          "Source excerpt copied. Review it while capturing a claim in Evidence.",
                        ),
                      );
                  }}
                >
                  Copy source excerpt
                </button>
              )}
              {job.payload.company_slug && (
                <Link
                  className="ws-button secondary"
                  href={`/companies/${job.payload.company_slug}?tab=Evidence`}
                >
                  Review company evidence
                </Link>
              )}
              {job.state === "Failed" && (
                <button
                  className="ws-button secondary"
                  disabled={busy}
                  onClick={() =>
                    void perform(
                      () =>
                        api("/jobs", {
                          method: "POST",
                          body: JSON.stringify({
                            kind: job.kind,
                            ...job.payload,
                          }),
                        }),
                      "A new task was queued using the company's current version.",
                    )
                  }
                >
                  Retry task
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
      <section className="connection-section">
        <h3>Private source files</h3>
        <p>
          Store PDFs and text files in your private Supabase bucket. Files are
          kept separate from reviewed claims.
        </p>
        <label className="file-upload">
          Upload evidence · PDF or text · up to 20 MB
          <input
            type="file"
            accept="application/pdf,text/plain"
            disabled={busy || mode !== "Supabase workspace"}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const form = new FormData();
              form.append("file", file);
              void perform(
                () => api("/files", { method: "POST", body: form }),
                "File stored privately. No claims were verified.",
              );
              e.target.value = "";
            }}
          />
        </label>
        {files.map((file) => (
          <p key={file.id}>
            {file.name} · stored{" "}
            {new Date(file.created_at).toLocaleDateString()}{" "}
            <button
              className="ws-button secondary"
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  const result = await api<{ url: string }>("/files/link", {
                    method: "POST",
                    body: JSON.stringify({ path: file.path }),
                  });
                  setFileLink({ name: file.name, url: result.url });
                }, "Private viewing link prepared for 60 seconds.")
              }
            >
              Prepare viewing link
            </button>
          </p>
        ))}
        {fileLink && (
          <p>
            <a href={fileLink.url} target="_blank" rel="noreferrer">
              Open {fileLink.name}
            </a>{" "}
            · link expires in one minute
          </p>
        )}
      </section>
      <section className="connection-section">
        <h3>Search your knowledge</h3>
        <p>
          Search returns source excerpts and similarity, with no automatic fact
          verification.
        </p>
        <form
          className="capture-form"
          onSubmit={(e) => {
            e.preventDefault();
            void perform(async () => {
              const result = await api<{ matches: typeof matches }>(
                "/knowledge/search",
                { method: "POST", body: JSON.stringify({ query }) },
              );
              setMatches(result.matches);
            }, "Knowledge search complete.");
          }}
        >
          <label>
            Research question
            <input
              minLength={3}
              maxLength={1000}
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What evidence supports founder experience?"
            />
          </label>
          <button
            className="ws-button secondary"
            disabled={busy || !capabilities.knowledge_search?.selectable}
          >
            Search indexed evidence
          </button>
        </form>
        {matches.map((match, index) => (
          <article className="job-card" key={index}>
            <strong>
              {match.source_id} · {Math.round(match.similarity * 100)}%
              similarity
            </strong>
            <p>{match.content}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
