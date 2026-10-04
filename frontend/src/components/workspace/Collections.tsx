"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useViewPreference } from "./useViewPreference";
const Connections = dynamic(
  () => import("./Connections").then((m) => m.Connections),
  { loading: () => <p role="status">Loading connections…</p> },
);
const InvestmentMemory = dynamic(()=>import('./InvestmentMemory'));
const FundAccess = dynamic(()=>import('./FundAccess'));
import { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Company, triggerFired, date } from "@/lib/workspace";
import { companyActivity } from "@/lib/companyActivity";
import { CompanyActivity } from "./CompanyActivity";
import {
  Avatar,
  EvidenceChip,
  EvidenceDrawer,
  Icon,
  PageHeader,
} from "./Primitives";
const librarySections = ["Investment thesis", "Screening brief", "Diligence questions", "IC memo", "Source policy", "Comparable sets", "Investment memory", "Fund access", "Connections & imports"];
export function Portfolio() {
  const { data } = useWorkspace();
  const [drawer, setDrawer] = useState<Company | null>(null);
  if (!data) return null;
  const companies = data.companies.filter(
    (c) => c.portfolio,
  );
  const awaitingCompletion = data.companies.filter(c => c.disposition === "Invest" && !c.portfolio);
  return (
    <div className="page-content">
      <PageHeader
        eyebrow="INVESTMENT MONITORING"
        title="Portfolio"
        description="Compare reported performance with the assumptions behind each investment."
      />
      <div className="portfolio-grid">
        {companies.map((c) => (
          <section className="work-card portfolio-company" key={c.id}>
            <div className="card-heading">
              <Link
                className="entity-link"
                href={`/companies/${c.id}?tab=Monitor`}
              >
                <Avatar name={c.name} />
                <span>
                  <h2>{c.name}</h2>
                  <small>
                    {c.stage} · {c.sector}
                  </small>
                </span>
              </Link>
              {triggerFired(c) && <EvidenceChip state="Conflicted" />}
            </div>
            <div className="portfolio-metrics">
              {c.metrics.map((m) => (
                <button
                  key={m.id}
                  className="metric-inspect"
                  onClick={() => setDrawer(c)}
                >
                  <span>{m.label}</span>
                  <strong className="mono">
                    {m.value}
                    {m.unit === "%" ? "%" : ` ${m.unit}`}
                  </strong>
                  <small>
                    {m.expected===null?'No underwritten comparator':<>Underwritten: {m.expected}
                    {m.unit === "%" ? "%" : ` ${m.unit}`}</>}
                  </small>
                  <EvidenceChip state={m.state} />
                </button>
              ))}
            </div>
            <div className="portfolio-trigger">
              <Icon name="alert" />
              <div>
                <strong>
                  {c.triggers[0]?.label ?? "No monitoring trigger set"}
                </strong>
                <p>
                  Owner: {c.owner}. {c.illustrative ? "Figures come from a fictional founder update." : "Inspect each metric's period, definition and source before acting."}
                </p>
              </div>
            </div>
            <p className="muted sourcing-method">{companyActivity(c).period ? `Latest recorded reporting period ends ${date(companyActivity(c).period!)}` : "No reporting period recorded"} · {companyActivity(c).source ? `Source last captured ${date(companyActivity(c).source!)}` : "No source captured"}</p>
            <CompanyActivity company={c}/>
            <Link href={`/companies/${c.id}?tab=Monitor`} className="text-link">
              Investigate the change
              <Icon size={14} />
            </Link>
          </section>
        ))}
      </div>
      {companies.length === 0 && (
        <div className="work-card empty-state">
          <h3>No portfolio companies yet</h3>
          <p>Record a completed investment and its documentary source in a company’s Overview.</p>
        </div>
      )}
      {!!awaitingCompletion.length && <section className="work-card"><h2>Approved · completion not recorded</h2><p>These investment judgments are not completed holdings. Record the completed transaction and its source in Overview.</p>{awaitingCompletion.map(company => <p key={company.id}><Link className="text-link" href={`/companies/${company.id}?tab=Overview`}>{company.name} → Review transaction status</Link></p>)}</section>}
      <section className="work-card learning-card">
        <Icon name="library" />
        <div>
          <h2>Preserve the learning loop</h2>
          <p>
            Preserve the reason behind a decision and define what would change
            it. Watchlist and passed companies remain available for later review.
          </p>
          <Link href="/pipeline" className="text-link">
            Review previous decisions →
          </Link>
        </div>
      </section>
      {drawer && (
        <EvidenceDrawer company={drawer} onClose={() => setDrawer(null)} />
      )}
    </div>
  );
}
export function Library() {
  const router = useRouter();
  const search = useSearchParams();
  const [copyStatus, setCopyStatus] = useState("");
  const [savedSection, saveSection] = useViewPreference("library-section", "Investment thesis", librarySections);
  const requested = search.get("section");
  const selected = requested && librarySections.includes(requested) ? requested : savedSection;
  const setSelected = (section: string) => {
    setCopyStatus("");
    saveSection(section);
    router.replace(`/library?section=${encodeURIComponent(section)}`, { scroll: false });
  };
  const content: Record<
    string,
    {
      title: string;
      description: string;
      sections: { label: string; text: string }[];
    }
  > = {
    "Investment thesis": {
      title: "India B2B software",
      description:
        "Example mandate: early-stage software companies serving businesses in India.",
      sections: [
        {
          label: "The opportunity",
          text: "Start with a business workflow that is costly or slow. Find who owns the budget, what they use today and how they would measure a better result.",
        },
        {
          label: "Search rules",
          text: "India · pre-seed to Series A · B2B software · founder / CEO · prior consulting or major technology operator · at least two inspectable sources.",
        },
        {
          label: "What must be true",
          text: "Customers have a reason to buy now. Another customer can buy without a bespoke project. Existing customers keep using the product, and there is evidence behind the founder’s understanding of the buyer.",
        },
        {
          label: "Anti-thesis",
          text: "Check for consulting revenue counted as software, a market estimate with no customer count, sales tied to one personal relationship, or retention claims without a dated cohort.",
        },
        {
          label: "Put the thesis to work",
          text: "This is an example, not your fund’s approved mandate. Research 15–25 real companies, keep the sources and record where the thesis holds up—or breaks down.",
        },
      ],
    },
    "Screening brief": {
      title: "Screening brief",
      description: "Summarize the fit, risks, missing evidence and next step.",
      sections: [
        {
          label: "Template",
          text: "Describe the business and founder. Explain the fit with your thesis, the timing and the reported traction. Name the strongest source, the largest uncertainty and the next question. Finish with a disposition and an owner.",
        },
        {
          label: "Review discipline",
          text: "Say what the source shows and what you infer from it. A fit score is a starting point. Record why you would progress or pass, and what evidence could change that call.",
        },
      ],
    },
    "Diligence questions": {
      title: "Check the company’s claims",
      description: "Questions for founders, customers and market research.",
      sections: [
        {
          label: "Customer reference",
          text: "How long did procurement actually take? What budget did this replace? Which users expanded? What would make you cancel?",
        },
        {
          label: "Founder",
          text: "Show the acquisition and retention cohorts. Which assumption is least tested? What changed between the deck and the latest update?",
        },
        {
          label: "Market",
          text: "Who owns the budget? What does the incumbent bundle? What bottom-up customer count supports the market estimate?",
        },
      ],
    },
    "IC memo": {
      title: "Investment committee standard",
      description: "Explain your recommendation, counter-case and revisit conditions.",
      sections: [
        {
          label: "Required sections",
          text: "Lead with the recommendation. Explain the team, market, timing and route to winning. Show the reviewed evidence, return scenarios and unresolved assumptions. Include the case against, partner disagreement and what would reopen the decision.",
        },
        {
          label: "Version discipline",
          text: "Freeze the model before drafting. The memo keeps that model version and the reviewed claims and sources used at the time. Later evidence belongs in a new review.",
        },
      ],
    },
    "Source policy": {
      title: "Know where a fact came from",
      description: "A shared standard for sources, uncertainty and conflicting claims.",
      sections: [
        {
          label: "Evidence states",
          text: "Verified · Founder-reported · Calculated · AI-inferred · Missing · Conflicted. Labels and icons accompany every status.",
        },
        {
          label: "Source fields",
          text: "Original URL or file, title, capture date, excerpt, method, confidence, claim link, reviewer and review date.",
        },
        {
          label: "Conflicts",
          text: "Keep both values, dates and definitions visible. Explain the basis for choosing a value before marking the claim verified. Leave the conflict open when the evidence does not settle it.",
        },
        {
          label: "Connectors",
          text: "Use approved exports, public profile links or licensed APIs with explicit scopes. No LinkedIn scraping or automatic outreach is implemented.",
        },
      ],
    },
    "Comparable sets": {
      title: "Comparable companies",
      description: "A place for researched exit and valuation benchmarks.",
      sections: [
        {
          label: "No comparable set connected",
          text: "The demo exit multiple is an analyst assumption, not a sourced market benchmark. Add a primary-source comparable set before using the model for real underwriting.",
        },
      ],
    },
  };
  const item = content[selected];
  const copyReference = async () => {
    if (!item) return;
    try {
      await navigator.clipboard.writeText([item.title, item.description, ...item.sections.map(section => `${section.label}\n${section.text}`)].join("\n\n"));
      setCopyStatus("Reference copied");
    } catch {
      setCopyStatus("Copy unavailable. Select the document text and copy it manually.");
    }
  };
  return (
    <div className="page-content library-page">
      <PageHeader
        eyebrow="RESEARCH REFERENCES"
        title="Library"
        description="The standards you work from. The decisions you keep."
      />
      <div className="library-grid">
        <aside className="work-card library-menu">
          {[...Object.keys(content), "Investment memory", "Fund access", "Connections & imports"].map((label) => (
            <div className="library-menu-item" key={label}>
              {[
                "Investment thesis",
                "Screening brief",
                "Source policy",
                "Investment memory",
              ].includes(label) && (
                <span className="library-group-label">
                  {label === "Investment thesis"
                    ? "THESIS"
                    : label === "Screening brief"
                      ? "TEMPLATES"
                      : label === "Source policy"
                        ? "STANDARDS"
                        : "WORKSPACE"}
                </span>
              )}
              <button
                key={label}
                aria-pressed={selected === label}
                className={selected === label ? "selected" : ""}
                onClick={() => setSelected(label)}
              >
                <Icon
                  name={label === "Source policy" ? "source" : "library"}
                  size={16}
                />
                {label}
                <Icon size={14} />
              </button>
            </div>
          ))}
          <p className="muted library-menu-caption">
            Templates are starting points. Your company records hold the research.
          </p>
        </aside>
        {selected === "Fund access" ? <article className="work-card library-document"><FundAccess/></article> : selected === "Investment memory" ? <article className="work-card library-document"><InvestmentMemory/></article> : selected === "Connections & imports" ? (
          <article className="work-card library-document">
            <Connections />
          </article>
        ) : (
          <article className="work-card library-document reference-document">
            <div className="reference-topline"><span className="reference-tag">
              {selected === "Investment thesis"
                ? "Example thesis"
                : selected === "Comparable sets"
                  ? "Research required"
                  : "Reference template"}
            </span><button className="ws-button secondary copy-reference" onClick={() => void copyReference()}><Icon name="source" size={15}/>Copy reference</button></div>
            <header className="reference-heading"><span className="eyebrow">{selected}</span><h2>{item.title}</h2>
            <p className="document-lede">{item.description}</p><span className="reference-summary">{item.sections.length} sections · Read-only reference</span></header>
            <p className="copy-reference-status" role="status">{copyStatus}</p>
            <nav className="document-index" aria-label="In this document">
              {item.sections.map((section, index) => (
                <a key={section.label} href={`#library-section-${index}`}>
                  {section.label}
                </a>
              ))}
            </nav>
            {item.sections.map((section, index) => (
              <section className="reference-section" key={section.label} id={`library-section-${index}`}>
                <span className="reference-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div><h3>{section.label}</h3>
                <p>{section.text}</p></div>
              </section>
            ))}
            <div className="document-footer">
              <Icon name="source" size={14} />
              Keep your conclusions and supporting sources in the company record.
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
