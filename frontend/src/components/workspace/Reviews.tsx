"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { date, reviewQueue } from "@/lib/workspace";
import { filterReviews, reviewFilter, reviewFilters, reviewLabels, reviewPage, reviewsHref } from "@/lib/reviewViews";
import { Avatar, EvidenceChip, Icon } from "./Primitives";
import TodayNavigation from "./TodayNavigation";

export default function Reviews() {
  const { data } = useWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  const filter = reviewFilter(params.get("filter"));
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  if (!data) return null;
  const items = reviewQueue(data.companies);
  const shown = filterReviews(items, filter, query);
  const visible = reviewPage(shown, page);
  const companyCount = new Set(items.map(item => item.company.id)).size;
  function clearFilters() {
    setQuery(""); setPage(0); router.push("/reviews", { scroll: false });
  }
  return <div className="page-content reviews-page">
    <TodayNavigation page="reviews"/>
    <header className="reviews-heading"><div><h1>Reviews</h1><p>{items.length} {items.length === 1 ? "item" : "items"} across {companyCount} {companyCount === 1 ? "company" : "companies"}. Open a review to inspect its sources and decide the next step.</p></div><Link className="text-link" href="/">Back to Today<Icon size={14}/></Link></header>
    <section className="reviews-list" aria-label="Review work">
      <div className="reviews-controls">
        <label>Review type<select aria-label="Filter reviews" value={filter} onChange={event => { setPage(0); router.push(reviewsHref(reviewFilter(event.target.value)), { scroll: false }); }}>{reviewFilters.map(type => <option key={type} value={type}>{reviewLabels[type]} ({filterReviews(items, type).length})</option>)}</select></label>
        <label className="reviews-search">Search reviews<input type="search" aria-label="Search reviews" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder="Company, question or owner"/></label>
        {(filter !== "All items" || query) && <button className="ws-button secondary" onClick={clearFilters}>Clear filters</button>}
      </div>
      <div className="reviews-result-count" role="status">{shown.length} matching {shown.length === 1 ? "review" : "reviews"}{filter !== "All items" && ` · ${reviewLabels[filter]}`}</div>
      <div className="review-rows">{visible.items.map(item => <article className="review-work-row" key={item.id}>
        <Avatar name={item.company.name}/>
        <div className="review-work-copy"><div className="review-work-company"><span>{item.company.name}</span><EvidenceChip state={item.state}/>{item.company.illustrative && <span className="mini-label">DEMO</span>}</div><Link className="review-work-title" href={item.href}>{item.title}</Link><p>{reviewLabels[item.type]} · {item.owner ?? item.company.owner}{item.at && ` · ${date(item.at)}`}</p></div>
        <Link className="ws-button secondary review-work-open" href={item.href} aria-label={`Review ${item.company.name}: ${item.type}`}>Open review<Icon size={15}/></Link>
      </article>)}</div>
      {!shown.length && <div className="empty-state"><h2>{items.length ? "No matching reviews" : "No reviews waiting"}</h2><p>{items.length ? "Try another review type or search for a different company." : "Questions, drafts and follow-ups appear here when a company needs attention."}</p>{items.length ? <button className="ws-button secondary" onClick={clearFilters}>Show all reviews</button> : <Link className="ws-button secondary" href="/discover">Find companies<Icon size={14}/></Link>}</div>}
      {shown.length > 25 && <nav className="reviews-pagination" aria-label="Review pages"><button className="ws-button secondary" disabled={visible.page === 0} onClick={() => setPage(visible.page - 1)}>Previous</button><span>{visible.start + 1}–{visible.start + visible.items.length} of {shown.length}</span><button className="ws-button secondary" disabled={visible.page === visible.pageCount - 1} onClick={() => setPage(visible.page + 1)}>Next</button></nav>}
    </section>
    <p className="reviews-footnote">Opening a review does not mark it complete. Review its source, task or decision in the company record.</p>
  </div>;
}
