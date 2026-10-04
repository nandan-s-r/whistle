"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useAuth } from "@/context/AuthContext";
import {
  Company,
  SearchFilters,
  defaultFilters,
  workspaceFetch,
  date,
} from "@/lib/workspace";
import { Avatar, EvidenceDrawer, Icon, PageHeader } from "./Primitives";
import { CompanyIntakeForm } from "./IntakeForms";
import { useViewPreference } from "./useViewPreference";
import SourcingStudio from "./SourcingStudio";
const DealSourcing = dynamic(() => import("./DealSourcing"));

const companyViews = ["All companies", "Research", "Watchlist"];
const companySorts = ["Recently captured", "Thesis fit", "Source count"];

const allFilters: SearchFilters = {
  ...defaultFilters,
  query: "",
  geography: "All",
  min_evidence: 0,
};
const controls: {
  key: keyof SearchFilters;
  label: string;
  options: string[];
}[] = [
  { key: "geography", label: "Geography", options: ["All", "India", "US"] },
  {
    key: "stage",
    label: "Stage",
    options: ["All", "Pre-seed", "Seed", "Series A"],
  },
  {
    key: "sector",
    label: "Sector",
    options: ["All", "B2B SaaS", "DevTools", "FinTech"],
  },
  { key: "role", label: "Current role", options: ["All", "Founder", "CEO"] },
  {
    key: "employer",
    label: "Prior employer",
    options: ["All", "MBB", "McKinsey", "BCG", "Google", "Microsoft"],
  },
  { key: "signal", label: "Founder signal", options: ["All", "New venture"] },
];

export default function Discover() {
  const router = useRouter();
  const searchRequest = useRef<AbortController | null>(null);
  useEffect(() => () => searchRequest.current?.abort(), []);
  const { data, act, busy, refresh } = useWorkspace();
  const { token } = useAuth();
  const [filters, setFilters] = useState<SearchFilters>(allFilters);
  const [applied, setApplied] = useState<SearchFilters>(allFilters);
  const [results, setResults] = useState<Company[] | null>(null);
  const [running, setRunning] = useState(false);
  const [intake, setIntake] = useState(false);
  const searchParams = useSearchParams();
  const sourcing = searchParams.get("mode") === "sourcing";
  function setSourcing(enabled:boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (enabled) params.set("mode","sourcing"); else params.delete("mode");
    router.replace("/discover" + (params.size ? "?" + params.toString() : ""), {scroll:false});
  }
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [view, setView] = useViewPreference("discover-view", "All companies", companyViews);
  const [sort, setSort] = useViewPreference("discover-sort", "Recently captured", companySorts);
  const [excluded, setExcluded] = useState<{ id: string; reasons: string[] }[]>(
    [],
  );
  const [drawer, setDrawer] = useState<{
    company: Company;
    score: boolean;
  } | null>(null);
  if (!data) return null;
  const canWrite = ["analyst", "partner", "admin"].includes(data.role);
  const dirty = JSON.stringify(filters) !== JSON.stringify(applied);
  const advancedCount = [
    filters.role !== "All",
    filters.employer !== "All",
    filters.signal !== "All",
    filters.recency_days !== 90,
    filters.min_evidence > 0,
  ].filter(Boolean).length;
  const companiesById = new Map(data.companies.map(c => [c.id, c]));
  const shown = (results ?? data.companies)
    .map((c) => companiesById.get(c.id) ?? c)
    .filter((c) =>
      view === "Research"
        ? !c.illustrative
        : view === "Watchlist"
          ? c.watchlisted
          : true,
    )
    .sort((a, b) =>
      sort === "Thesis fit"
        ? (b.fit_score ?? -1) - (a.fit_score ?? -1)
        : sort === "Source count"
          ? b.sources.length - a.sources.length
          : b.signal_at.localeCompare(a.signal_at),
    );
  const run = async (next: SearchFilters = filters) => {
    if (!token) return;
    searchRequest.current?.abort();
    const controller = new AbortController();
    searchRequest.current = controller;
    setRunning(true);
    setError("");
    try {
      const result = await workspaceFetch<{
        results: Company[];
        excluded: { id: string; reasons: string[] }[];
      }>("/search", token, { method: "POST", body: JSON.stringify(next), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(55000)]) });
      if (controller.signal.aborted) return;
      setResults(result.results);
      setExcluded(result.excluded);
      setApplied(next);
      setMessage(
        `${result.results.length} matches. Search applied to your workspace records.`,
      );
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      if (searchRequest.current === controller) setRunning(false);
    }
  };
  const reset = () => {
    searchRequest.current?.abort();
    setRunning(false);
    setFilters(allFilters);
    setApplied(allFilters);
    setResults(null);
    setExcluded([]);
    setMessage("");
    setError("");
  };
  const save = async () => {
    if (!token) return;
    setError("");
    try {
      await workspaceFetch("/searches", token, {
        method: "POST",
        body: JSON.stringify({
          name: filters.query.trim() || "My founder search",
          filters,
        }),
      });
      await refresh();
      setMessage("Search saved to your workspace.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };
  const filterControl = (f: (typeof controls)[number]) => (
    <label className="sourcing-filter" key={f.key}>
      <span>{f.label}</span>
      <select
        value={String(filters[f.key])}
        onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
      >
        {Array.from(
          new Set([
            ...f.options,
            ...data.companies.map((c) =>
              f.key === "role"
                ? c.people[0].role
                : f.key === "employer"
                  ? c.people[0].previous_employer
                  : f.key === "signal"
                    ? c.founder_signal
                    : String(c[f.key as "geography" | "sector" | "stage"]),
            ),
          ]),
        ).map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="page-content sourcing-page">
      <PageHeader
        eyebrow="COMPANY RESEARCH"
        title="Discover"
        description="Find new research leads or review companies you have saved."
        action={
          <button
            className="ws-button secondary"
            disabled={!canWrite || busy}
            onClick={() => setIntake(true)}
          >
            <Icon name="plus" size={16} />
            Add company
          </button>
        }
      />
      <div className="discover-mode" role="group" aria-label="Discover mode">
        <button className={!sourcing ? "selected" : ""} aria-pressed={!sourcing} onClick={() => setSourcing(false)}>Saved companies</button>
        <button className={sourcing ? "selected" : ""} aria-pressed={sourcing} onClick={() => setSourcing(true)}>Deal sourcing<Icon name="discover" size={14}/></button>
      </div>
      {sourcing ? <DealSourcing/> : <>
      <SourcingStudio onCapture={() => setIntake(true)} onThesis={query => { const next = { ...allFilters, query }; setFilters(next); void run(next); }}/>
      <div className="sourcing-views" role="group" aria-label="Company views">
        {["All companies", "Research", "Watchlist"].map((v) => (
          <button
            key={v}
            aria-pressed={view === v}
            className={view === v ? "selected" : ""}
            onClick={() => setView(v)}
          >
            {v}
            <span>
              {
                data.companies.filter((c) =>
                  v === "Research"
                    ? !c.illustrative
                    : v === "Watchlist"
                      ? c.watchlisted
                      : true,
                ).length
              }
            </span>
          </button>
        ))}
        <span className="sourcing-universe">Your workspace universe</span>
      </div>
      <section
        className="sourcing-controls"
        aria-label="Search and thesis filters"
      >
        <form
          className="sourcing-search"
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          <Icon name="discover" size={18} />
          <label className="sr-only" htmlFor="thesis-query">
            What are you looking for?
          </label>
          <input
            id="thesis-query"
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            placeholder="Search a thesis, founder background or company…"
          />
          <button className="ws-button primary" disabled={running}>
            {running ? "Searching…" : "Run search"}
            <Icon size={15} />
          </button>
        </form>
        <div className="sourcing-filterbar">
          {controls.slice(0, 3).map(filterControl)}
          <details className="advanced-filters">
            <summary>
              <Icon name="settings" size={15} />
              More filters
              {advancedCount > 0 && <span className="advanced-count" title={`${advancedCount} advanced filters active`}>{advancedCount}</span>}
            </summary>
            <div className="advanced-filter-panel">
              {controls.slice(3).map(filterControl)}
              <label className="sourcing-filter">
                <span>Signal recency</span>
                <select
                  value={filters.recency_days}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      recency_days: Number(e.target.value),
                    })
                  }
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </label>
              <label className="sourcing-filter">
                <span>Minimum source count</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={filters.min_evidence}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      min_evidence: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
          </details>
          <button className="text-link reset-search" onClick={reset}>
            Reset filters
          </button>
          <button
            className="ws-button secondary save-view"
            disabled={!canWrite || busy}
            onClick={() => void save()}
          >
            <Icon name="library" size={14} />
            Save search
          </button>
        </div>
        {dirty && (
          <p className="search-pending" role="status">
            <Icon name="clock" size={13} />
            Filters changed. Run search to update the results.
          </p>
        )}
      </section>
      <div className="saved-view-strip">
        <span>Saved searches</span>
        {data.searches.map((s) => (
          <button
            key={s.id}
            className="saved-view"
            onClick={() => {
              setFilters(s.filters);
              void run(s.filters);
            }}
          >
            <Icon name="library" size={13} />
            {s.name}
          </button>
        ))}
        {!data.searches.length && (
          <span className="muted">Save a thesis search to reuse it here.</span>
        )}
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button className="text-link" onClick={() => void run()}>
            Retry
          </button>
        </div>
      )}
      {message && (
        <p className="inline-success" role="status">
          <Icon name="check" size={14} />
          {message}
        </p>
      )}
      <section
        className="work-card sourcing-results"
        aria-label="Company results"
        aria-busy={running}
      >
        <div className="sourcing-results-heading">
          <h2>
            {shown.length} {shown.length === 1 ? "company" : "companies"}
            <span>
              {view === "All companies" ? "In your current view" : view}
            </span>
          </h2>
          <label className="sort-control">
            Sort by
            <select
              aria-label="Sort companies"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {["Recently captured", "Thesis fit", "Source count"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
        {running ? (
          <div
            className="sourcing-loading"
            role="status"
            aria-label="Searching company records"
          >
            {[1, 2, 3, 4].map((n) => (
              <div className="skeleton" key={n} />
            ))}
          </div>
        ) : (
          <table className="sourcing-table">
            <caption className="sr-only">
              Companies, founder backgrounds and reviewed evidence
            </caption>
            <thead>
              <tr>
                <th scope="col">Company</th>
                <th scope="col">Founder / background</th>
                <th scope="col">Stage / location</th>
                <th scope="col">Evidence</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => {
                const conflicts = c.claims.filter(
                  (q) => q.state === "Conflicted",
                ).length;
                const verified = c.claims.filter(
                  (q) => q.state === "Verified",
                ).length;
                const fullyReviewed =
                  c.claims.length > 0 && verified === c.claims.length;
                return (
                  <tr key={c.id}>
                    <td className="sourcing-company">
                      <div className="sourcing-identity">
                        <Avatar name={c.name} />
                        <div>
                          <Link
                            href={`/companies/${c.id}`}
                            className="company-name"
                          >
                            {c.name}
                            <Icon size={13} />
                          </Link>
                          <small>{c.domain}</small>
                        </div>
                      </div>
                      <p className="company-summary" title={c.description}>
                        {c.description || "Company summary not yet captured."}
                      </p>
                      <div className="row-provenance">
                        <span
                          className={
                            c.illustrative
                              ? "record-origin demo"
                              : "record-origin"
                          }
                        >
                          {c.illustrative ? "Demo" : "Manual research"}
                        </span>
                        <button
                          className="fit-inline"
                          onClick={() => setDrawer({ company: c, score: true })}
                          aria-label={`Inspect ${c.name} thesis fit: ${c.fit_score ?? "not assessed"}`}
                        >
                          {c.fit_score === null
                            ? "Fit not assessed"
                            : `Fit ${c.fit_score}`}
                          <Icon size={12} />
                        </button>
                        <details className="company-context">
                          <summary>Details</summary>
                          <div>
                            <p className="context-summary">
                              {c.description || "No company summary captured."}
                            </p>
                            <strong>Why it is in your workspace</strong>
                            <ul>
                              {c.reason_codes.map((r) => (
                                <li key={r}>{r}</li>
                              ))}
                            </ul>
                            <p>
                              <strong>Next action</strong>
                              {c.next_action}
                            </p>
                            <small>
                              Owner: {c.owner} · Captured {date(c.signal_at)}
                            </small>
                            {!c.in_pipeline && (
                              <button
                                className="text-link"
                                disabled={!canWrite || busy}
                                onClick={() =>
                                  void act(c, { action: "pipeline" })
                                }
                              >
                                Add to pipeline
                                <Icon name="plus" size={14} />
                              </button>
                            )}
                          </div>
                        </details>
                      </div>
                    </td>
                    <td className="sourcing-founder">
                      <Link href={`/companies/${c.id}`}>
                        {c.people[0].name}
                      </Link>
                      <small>{c.people[0].role}</small>
                      <span>
                        {c.people[0].previous_employer === "Not evidenced"
                          ? "Background not evidenced"
                          : `Previously ${c.people[0].previous_employer}`}
                      </span>
                      <small className="compact-company-meta">
                        {c.stage} · {c.geography}
                      </small>
                    </td>
                    <td className="sourcing-stage">
                      <span>{c.stage}</span>
                      <small>
                        {c.geography} · {c.sector}
                      </small>
                      <span className="disposition-text">{c.disposition}</span>
                    </td>
                    <td className="sourcing-evidence">
                      <button
                        className="source-link"
                        onClick={() => setDrawer({ company: c, score: false })}
                        aria-label={`Inspect ${c.name} sources`}
                      >
                        <Icon name="source" size={14} />
                        {c.sources.length} sources
                      </button>
                      <span
                        className={
                          conflicts
                            ? "review-status conflict"
                            : fullyReviewed
                              ? "review-status verified"
                              : "review-status"
                        }
                      >
                        <Icon
                          name={
                            conflicts
                              ? "alert"
                              : fullyReviewed
                                ? "check"
                                : "clock"
                          }
                          size={12}
                        />
                        {conflicts
                          ? `${conflicts} conflicts`
                          : fullyReviewed
                            ? "Claims verified"
                            : c.claims.length === 0
                              ? "No claims captured"
                              : `${c.claims.length - verified} need review`}
                      </span>
                      <small>
                        {verified}/{c.claims.length} claims verified
                      </small>
                    </td>
                    <td className="sourcing-actions">
                      <button
                        className={`icon-button ${c.watchlisted ? "watched" : ""}`}
                        disabled={!canWrite || busy}
                        aria-pressed={c.watchlisted}
                        aria-label={`${c.watchlisted ? "Remove" : "Add"} ${c.name} ${c.watchlisted ? "from" : "to"} watchlist`}
                        onClick={() => void act(c, { action: "watchlist" })}
                      >
                        <Icon name="bookmark" size={16} />
                      </button>
                      <Link
                        className="icon-button"
                        href={`/companies/${c.id}`}
                        aria-label={`Open ${c.name}`}
                      >
                        <Icon size={16} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!running && !shown.length && (
          <div className="empty-state">
            <Icon name="discover" />
            <h3>No companies in this view</h3>
            <p>
              {view === "Research"
                ? "Capture a real company and its sources to start your research."
                : view === "Watchlist"
                  ? "Save a company with the bookmark button, or change your search."
                  : "Broaden your thesis filters or capture a company."}
            </p>
            <button className="ws-button secondary" onClick={reset}>
              Reset filters
            </button>
          </div>
        )}
        <div className="sourcing-data-note">
          <Icon name="source" size={14} />
          <span>
            Saved records only. Use Deal sourcing to inspect external leads. Demo
            records are fictional.
          </span>
        </div>
      </section>
      {!!excluded.length && (
        <details className="excluded-results">
          <summary>
            {excluded.length} records excluded · inspect reasons
          </summary>
          {excluded.map((x) => (
            <p key={x.id}>
              {data.companies.find((c) => c.id === x.id)?.name ?? x.id}:{" "}
              {x.reasons.join(", ")}
            </p>
          ))}
        </details>
      )}
      </>}
      {drawer && (
        <EvidenceDrawer
          company={drawer.company}
          score={drawer.score}
          onClose={() => setDrawer(null)}
        />
      )}
      {intake && (
        <CompanyIntakeForm
          onClose={() => setIntake(false)}
          onCreated={(company) => {
            setIntake(false);
            router.push(`/companies/${company.id}?tab=Evidence`);
          }}
        />
      )}
    </div>
  );
}
