"use client";
import Link from "next/link";
import { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Company } from "@/lib/workspace";
import { CompanyActivity } from "./CompanyActivity";
import { Avatar, EvidenceDrawer, Icon } from "./Primitives";
import { CompanyIntakeForm } from "./IntakeForms";
import { useViewPreference } from "./useViewPreference";

const views = ["Companies", "Board", "People"];
const states = ["Unreviewed", "Watch", "Progress to diligence", "Progress to partner", "Invest", "Pass"] as const;
const filters = ["All", ...states];
const stateLabel = (state: string) => state === "Progress to diligence" ? "Diligence" : state === "Progress to partner" ? "Partner review" : state;
const stateDescriptions: Record<string, string> = {
  Unreviewed: "Added, with no investment decision recorded yet.",
  Watch: "Keep following the company before moving ahead.",
  "Progress to diligence": "Research the claims, risks and unanswered questions.",
  "Progress to partner": "Ready for a partner to review the investment case.",
  Invest: "An investment judgment has been recorded. A completed transaction is tracked separately.",
  Pass: "Do not pursue the company now. Keep the research and reasons for later review.",
};
function nextStep(company: Company) {
  return company.sources.length
    ? { text: company.next_action || "Review the company and choose a next step", href: `/companies/${company.id}` }
    : { text: "Add the first source", href: `/companies/${company.id}?tab=Evidence` };
}
const companyMeta = (company: Company) => [company.stage, company.geography].filter(value => value && value !== "Not evidenced").join(" · ");

function EvidenceSummary({ company, inspect }: { company: Company; inspect: () => void }) {
  const conflicts = company.claims.filter(claim => claim.state === "Conflicted").length;
  const verified = company.claims.filter(claim => claim.state === "Verified").length;
  return <button className="pipeline-evidence" onClick={inspect} aria-label={`Inspect ${company.name} evidence`}>
    <span><Icon name="source" size={14}/>{company.sources.length} {company.sources.length === 1 ? "source" : "sources"}<Icon size={12}/></span>
    <small className={conflicts ? "has-conflict" : ""}>{conflicts ? `${conflicts} conflicting ${conflicts === 1 ? "claim" : "claims"}` : company.claims.length ? `${verified}/${company.claims.length} claims verified` : "No claims reviewed yet"}</small>
  </button>;
}

export default function Pipeline() {
  const { data, busy, initialize } = useWorkspace();
  const [filter, setFilter] = useViewPreference("pipeline-filter", "All", filters);
  const [view, setView] = useViewPreference("pipeline-view", "Companies", views);
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState<Company | null>(null);
  const [intake, setIntake] = useState(false);
  if (!data) return null;
  const records = data.companies.filter(company => company.in_pipeline);
  const canWrite = ["analyst", "partner", "admin"].includes(data.role);
  const term = query.trim().toLocaleLowerCase();
  const companies = records.filter(company =>
    (filter === "All" || company.disposition === filter) &&
    (!term || [company.name, company.domain, company.sector, company.owner, ...company.people.map(person => person.name)].some(value => value.toLocaleLowerCase().includes(term)))
  );
  return <div className="page-content pipeline-page">
    <header className="pipeline-heading">
      <div><h1>Pipeline</h1><p>Companies you’re considering for investment.</p></div>
      <button className="ws-button primary" disabled={!canWrite || busy} onClick={() => setIntake(true)}><Icon name="plus" size={15}/>Add company</button>
    </header>
    {!canWrite && <p className="notice">You have read-only access. A workspace reviewer can add companies and record decisions.</p>}
    <details className="pipeline-guide">
      <summary>How Pipeline works</summary>
      <ol className="pipeline-guide-steps"><li><strong>1. Add a company</strong><span>Start with its name, website and a person to research.</span></li><li><strong>2. Check the evidence</strong><span>Open the sources and record what needs a closer look.</span></li><li><strong>3. Record your view</strong><span>Open the company and choose “Record decision.” Save your reasoning and next step.</span></li></ol>
      <h2>What the decisions mean</h2>
      <dl>{states.map(state => <div key={state}><dt>{stateLabel(state)}</dt><dd>{stateDescriptions[state]}</dd></div>)}</dl>
      <p>Companies is the list view. Board groups companies by recorded decision. People shows recorded contacts. Changing a view or filter does not move a company or save a decision.</p>
    </details>
    {!!records.length && <>
    <div className="pipeline-status-tabs" role="group" aria-label="Filter pipeline by decision">
      {filters.map(state => <button key={state} aria-pressed={filter === state} className={filter === state ? "selected" : ""} onClick={() => setFilter(state)} title={state}>
        {stateLabel(state)}<span>{state === "All" ? records.length : records.filter(company => company.disposition === state).length}</span>
      </button>)}
    </div>
    <section className="pipeline-register" aria-label="Pipeline records">
      <div className="pipeline-controls collection-toolbar">
        <div className="segmented" role="group" aria-label="Pipeline view">
          {views.map(option => <button key={option} className={view === option ? "selected" : ""} aria-pressed={view === option} onClick={() => setView(option)}><Icon name={option === "Board" ? "pipeline" : option === "People" ? "people" : "list"} size={14}/>{option}</button>)}
        </div>
        <label className="pipeline-search"><Icon name="discover" size={15}/><input aria-label="Filter pipeline companies" placeholder="Filter companies…" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button onClick={() => setQuery("")} aria-label="Clear company search"><Icon name="close" size={13}/></button>}</label>
        <label className="inline-label pipeline-decision-select">Decision<select value={filter} onChange={event => setFilter(event.target.value)}>{filters.map(state => <option key={state} value={state}>{stateLabel(state)}</option>)}</select></label>
      </div>
      {view === "Board" ? <div className="pipeline-board" aria-label="Pipeline by recorded decision">
        {states.filter(state => filter === "All" || state === filter).map(state => <section className="pipeline-column" key={state} aria-label={state}>
          <header><h3>{stateLabel(state)}</h3><span>{companies.filter(company => company.disposition === state).length}</span></header>
          {companies.filter(company => company.disposition === state).map(company => <article className="pipeline-deal" key={company.id}>
            <Link href={`/companies/${company.id}`} className="pipeline-board-entity"><Avatar name={company.name}/><div><h4>{company.name}</h4><small>{companyMeta(company) || "Details not added"}{company.illustrative && " · Demo"}</small></div></Link>
            <Link className="pipeline-next-step" href={nextStep(company).href}>{nextStep(company).text}<Icon size={13}/></Link>
            <EvidenceSummary company={company} inspect={() => setDrawer(company)}/>
            <footer><span>{company.owner}</span><Link href={`/companies/${company.id}`}>Open record<Icon size={12}/></Link></footer>
          </article>)}
          {!companies.some(company => company.disposition === state) && <p className="board-empty">No companies</p>}
        </section>)}
      </div> : <div className="table-scroll">
        <table className="research-table pipeline-table">
          <thead><tr>{[view === "People" ? "Person / company" : "Company", "Sector / stage", "Decision", "Evidence", "Next step", "Owner"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{companies.map(company => <tr key={company.id}>
            <td className="pipeline-entity-cell"><Link href={`/companies/${company.id}`} className="entity-link"><Avatar name={view === "People" ? company.people[0]?.name ?? company.name : company.name}/><span><strong>{view === "People" ? company.people[0]?.name ?? "No person recorded" : company.name}</strong><small>{view === "People" ? company.name : company.domain}{company.illustrative && <span className="pipeline-demo-label">Demo</span>}</small></span></Link></td>
            <td className="pipeline-stage-cell">{company.sector === "Not evidenced" ? "Details not added" : company.sector}{companyMeta(company) && <small className="table-subtitle">{companyMeta(company)}</small>}</td>
            <td className="pipeline-decision-cell"><span className="pipeline-decision" data-decision={company.disposition}><span aria-hidden="true"/>{stateLabel(company.disposition)}</span></td>
            <td className="pipeline-evidence-cell"><EvidenceSummary company={company} inspect={() => setDrawer(company)}/></td>
            <td className="pipeline-next-cell"><Link href={nextStep(company).href}>{nextStep(company).text}</Link><CompanyActivity company={company}/></td>
            <td className="pipeline-owner-cell"><span className="pipeline-owner-mark" aria-hidden="true">{company.owner[0]}</span>{company.owner}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      {!companies.length && <div className="empty-state pipeline-empty"><Icon name="pipeline"/><h3>{query ? "No matching companies" : "No companies in this view"}</h3><p>{query ? "Try a company, person, sector or owner." : "Choose another decision filter to see your other companies."}</p><button className="ws-button secondary" onClick={() => { setQuery(""); setFilter("All"); }}>Clear filters</button></div>}
      <footer className="pipeline-register-footer"><span role="status" aria-live="polite">{companies.length} of {records.length} companies</span><span>Open a company to record or change its decision.</span></footer>
    </section>
    </>}
    {!records.length && <section className="empty-state pipeline-first-company" aria-label="Start your pipeline"><Icon name="pipeline"/><h2>Add your first company</h2><p>Choose “Add company” above. Add a source, review the open questions and record your investment view.</p>{data.companies.length ? <Link className="ws-button secondary" href="/discover">Browse saved companies<Icon size={14}/></Link> : <><button className="ws-button secondary" disabled={busy || !canWrite} onClick={() => void initialize()}>{busy ? "Preparing scenario…" : "Open demonstration scenario"}<Icon size={14}/></button><small>This adds four fictional examples to your account. Demo records stay labelled.</small></>}</section>}
    {drawer && <EvidenceDrawer company={drawer} onClose={() => setDrawer(null)}/>}
    {intake && <CompanyIntakeForm addToPipeline onClose={() => setIntake(false)} onCreated={(company) => { setIntake(false); setFilter("All"); setView("Companies"); setQuery(company.name); }}/>}
  </div>;
}
