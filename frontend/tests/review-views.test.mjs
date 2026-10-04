import test from "node:test";
import assert from "node:assert/strict";
import { filterReviews, reviewFilter, reviewPage, reviewsHref } from "../src/lib/reviewViews.ts";

const items = [
  { id: "conflict", type: "Evidence conflict", title: "Compare revenue periods", company: { id: "a", name: "AtlasOps", owner: "Nandan" } },
  { id: "draft", type: "AI draft", title: "Inspect the memo draft", company: { id: "a", name: "AtlasOps", owner: "Nandan" }, owner: "Priya" },
  { id: "due", type: "Diligence due", title: "Interview a customer", company: { id: "b", name: "LedgerMesh", owner: "Nandan" } },
];

test("review URLs retain categories and safely default unknown categories", () => {
  assert.equal(reviewsHref(), "/reviews");
  for (const type of ["Evidence conflict", "AI draft", "Risk review", "Diligence due"]) {
    const url = new URL(reviewsHref(type), "http://localhost");
    assert.equal(reviewFilter(url.searchParams.get("filter")), type);
  }
  assert.equal(reviewFilter(null), "All items");
  assert.equal(reviewFilter("Unknown category"), "All items");
});

test("review search preserves separate obligations and combines owner, title and type filters", () => {
  const before = JSON.stringify(items);
  assert.deepEqual(filterReviews(items, "All items", "  ATLASops  ").map(item => item.id), ["conflict", "draft"]);
  assert.deepEqual(filterReviews(items, "AI draft", "AtlasOps").map(item => item.id), ["draft"]);
  assert.deepEqual(filterReviews(items, "All items", "priya").map(item => item.id), ["draft"]);
  assert.deepEqual(filterReviews(items, "All items", "revenue periods").map(item => item.id), ["conflict"]);
  assert.deepEqual(filterReviews(items, "All items", "diligence").map(item => item.id), ["due"]);
  assert.deepEqual(filterReviews(items, "AI draft", "LedgerMesh"), []);
  assert.deepEqual(filterReviews(items, "All items", "no such company"), []);
  assert.equal(JSON.stringify(items), before);
});

test("review pagination includes every item once and recovers from an out-of-range page", () => {
  const many = Array.from({ length: 57 }, (_, index) => ({ ...items[0], id: String(index) }));
  const pages = [0, 1, 2].map(page => reviewPage(many, page));
  assert.deepEqual(pages.map(page => page.items.length), [25, 25, 7]);
  assert.deepEqual(pages.flatMap(page => page.items.map(item => item.id)), many.map(item => item.id));
  assert.equal(reviewPage(many, 9).page, 2);
  assert.equal(reviewPage(many, -1).page, 0);
  assert.equal(reviewPage(items, 2).page, 0);
  assert.deepEqual(reviewPage([], 3), { page: 0, pageCount: 1, start: 0, items: [] });
});
