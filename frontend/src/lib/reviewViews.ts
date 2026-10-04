import type { ReviewCategory, ReviewItem } from "./workspace";

export const reviewFilters = ["All items", "Evidence conflict", "AI draft", "Diligence due", "Risk review", "Decision review", "Portfolio alert", "Founder signal", "Screening ready"] as const;
export type ReviewFilter = "All items" | ReviewCategory;
export const reviewLabels: Record<ReviewFilter, string> = {
  "All items": "All reviews",
  "Evidence conflict": "Evidence conflicts",
  "AI draft": "Drafts to inspect",
  "Diligence due": "Diligence due",
  "Risk review": "Risk reviews",
  "Decision review": "Decision follow-ups",
  "Portfolio alert": "Portfolio alerts",
  "Founder signal": "Founder signals",
  "Screening ready": "Ready to screen",
};
export function reviewFilter(value: string | null): ReviewFilter {
  return reviewFilters.includes(value as ReviewFilter) ? value as ReviewFilter : "All items";
}
export function reviewsHref(filter: ReviewFilter = "All items") {
  return filter === "All items" ? "/reviews" : `/reviews?filter=${encodeURIComponent(filter)}`;
}
export function filterReviews(items: ReviewItem[], filter: ReviewFilter, query = "") {
  const term = query.trim().toLocaleLowerCase();
  return items.filter(item => (filter === "All items" || item.type === filter) &&
    (!term || [item.company.name, item.title, item.type, item.owner ?? item.company.owner].join(" ").toLocaleLowerCase().includes(term)));
}
export function reviewPage(items: ReviewItem[], requestedPage: number, pageSize = 25) {
  const size = Math.max(1, Math.floor(pageSize) || 25);
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(Math.max(0, Math.floor(requestedPage) || 0), pageCount - 1);
  return { page, pageCount, start: page * size, items: items.slice(page * size, (page + 1) * size) };
}
