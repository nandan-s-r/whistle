"use client";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Company, date, reviewQueue } from "@/lib/workspace";
import { ReviewFilter, reviewLabels, reviewsHref } from "@/lib/reviewViews";
import { Avatar, EvidenceChip, EvidenceDrawer, Health, Icon } from "./Primitives";
import { ResearchSpotlight } from "./ResearchExperience";
import { ReviewAgenda } from "./ReviewStudio";
import TodayNavigation from "./TodayNavigation";

export default function Today() {
  const { data } = useWorkspace();
  const { user } = useAuth();
  const [source, setSource] = useState<Company | null>(null);
  if (!data) return null;
  const companies = data.companies;
  const items = reviewQueue(companies);
  const counts = (type: string) => items.filter(item => item.type === type).length;
  const pipeline = companies.filter(company => company.in_pipeline);
  const focus = items[0]?.company ?? companies.find(company => !company.illustrative) ?? companies[0];
  const metrics: { label: string; value: number; type: ReviewFilter; icon: string; detail: string }[] = [
    { label: "To review", value: items.length, type: "All items", icon: "today", detail: "Open all reviews" },
    { label: "Companies with conflicts", value: counts("Evidence conflict"), type: "Evidence conflict", icon: "alert", detail: "Compare conflicting claims" },
    { label: "Drafts to inspect", value: counts("AI draft"), type: "AI draft", icon: "spark", detail: "Waiting for your review" },
    { label: "Diligence due", value: counts("Diligence due"), type: "Diligence due", icon: "clock", detail: "Due today or overdue" },
  ];
  return <div className="page-content today-overview">
    <TodayNavigation page="today"/>
    <header className="briefing-header"><div><div className="briefing-dateline"><span>YOUR DAILY BRIEFING</span><span>{date(new Date().toISOString())}</span></div><h1>Your research desk</h1><p>{user?.name.split(" ")[0]}, {items.length ? `${items.length} ${items.length === 1 ? "item needs" : "items need"} review.` : "there are no items waiting for review."} Start with a review, check your meetings or open your pipeline.</p></div><Link className="ws-button primary" href="/reviews">Open reviews<Icon size={17}/></Link></header>
    <nav className="today-metrics" aria-label="Workspace priorities">{metrics.map(metric => <Link key={metric.type} className="today-metric" href={reviewsHref(metric.type)} aria-label={`${metric.label}: ${metric.value}`}><span><Icon name={metric.icon} size={16}/>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}<Icon size={14}/></small></Link>)}</nav>
    <section className="today-priorities" aria-labelledby="today-priorities-title"><div className="today-section-heading"><div><h2 id="today-priorities-title">Next reviews</h2><p>A short list for your next working session.</p></div><Link className="text-link" href="/reviews">View all {items.length} reviews<Icon size={14}/></Link></div>
      {items.slice(0, 3).map(item => <article className="today-review-row" key={item.id}><Avatar name={item.company.name}/><div><div className="today-review-company"><strong>{item.company.name}</strong><EvidenceChip state={item.state}/>{item.company.illustrative && <span className="mini-label">DEMO</span>}</div><Link className="today-review-title" href={item.href}>{item.title}</Link><p>{reviewLabels[item.type]} · {item.owner ?? item.company.owner}</p></div><Link className="ws-button secondary today-review-open" href={item.href} aria-label={`Review ${item.company.name}: ${item.type}`}>Open review<Icon size={15}/></Link></article>)}
      {!items.length && <div className="empty-state"><h3>You are up to date</h3><p>New questions, drafts and follow-ups will appear in Reviews.</p><Link className="text-link" href="/discover">Find companies<Icon size={14}/></Link></div>}
    </section>
    <ReviewAgenda maxVisible={5} heading="Meetings and follow-ups"/>
    <section className="work-card pipeline-preview"><div className="card-heading"><div><h2>Your pipeline <span className="count-pill">{pipeline.length}</span></h2></div><Link href="/pipeline" className="text-link">Open pipeline<Icon size={14}/></Link></div>
      {!!pipeline.length && <div className="table-scroll"><table className="research-table"><thead><tr><th scope="col">Company</th><th scope="col">Decision</th><th scope="col">Evidence health</th><th scope="col">Next action</th><th scope="col">Owner</th></tr></thead><tbody>{pipeline.slice(0, 5).map(company => <tr key={company.id}><td><Link href={`/companies/${company.id}`} className="entity-link"><Avatar name={company.name}/><span><strong>{company.name}</strong><small>{company.stage} · {company.sector}{company.illustrative && " · Demo"}</small></span></Link></td><td><span className="decision-pill">{company.disposition}</span></td><td><button className="health-button" onClick={() => setSource(company)} aria-label={`Inspect ${company.name} evidence`}><Health company={company}/></button></td><td className="next-action-cell">{company.next_action}</td><td><span className="owner-pill">{company.owner.split(" ")[0]}</span></td></tr>)}</tbody></table></div>}
      {pipeline.length > 5 && <p className="today-table-note">Showing 5 of {pipeline.length} companies. Open Pipeline to see every deal.</p>}
      {!pipeline.length && <div className="empty-state"><h3>No companies in your pipeline</h3><p>Open a company in Discover and add it to your pipeline.</p><Link href="/discover" className="text-link">Explore companies<Icon size={14}/></Link></div>}
    </section>
    {focus && <details className="today-walkthrough"><summary>How to review a company</summary><ResearchSpotlight key={focus.id} company={focus}/></details>}
    {source && <EvidenceDrawer company={source} onClose={() => setSource(null)}/>}
  </div>;
}
