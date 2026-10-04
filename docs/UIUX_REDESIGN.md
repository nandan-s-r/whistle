# UI and UX redesign — 3 October 2026

The user rejected the large headline, repeated founder cards and icon-only navigation in the previous screenshot. The redesign treats VC Scope as a daily research tool: view controls first, a compact working canvas, inspectable evidence, and progressive detail. The 31-page product blueprint remains authoritative, particularly pages 15, 19–20 and 26–30.

## Public product research

These are public product previews and published product descriptions. No paid competitor account, proprietary workflow, signup or trial was used.

| Reference | Inspected material | Applied pattern |
| --- | --- | --- |
| [Affinity](https://www.affinity.co/product/crm) | Browser-inspected Top Founders sheet preview with status, owner, last-contact columns and a separate relationship context panel | Stable company rows, consistent columns, contextual source inspection and expandable record details |
| [Harmonic](https://harmonic.ai/) | Public descriptions of granular company/people filters, structured research and organized opportunity tracking | Search and filters beside the company universe; working Research/Watchlist views and sort controls. Its standalone CDN screenshot was blocked by the browser policy and was not retrieved |
| [Dealroom](https://newsletter.dealroom.co/hubfs/Dealroom%20Best%20Practices.pdf) | Published search/list workflow guide | Saved searches remain accessible beside current view controls |
| [Taghash](https://taghash.io/products/portfolio-management) | Published connected portfolio/company/ownership/document workflow | Keep each company's context and evidence in one record across all six company tabs |
| [Model ML](https://llms.modelml.com/data-room-to-structured-findings) | Published Grid/structured analysis and verifiable work-product architecture | Preserve source-to-artifact work and contextual review instead of replacing the research canvas with a chat page |

These patterns informed an original interface; competitor visual assets, product claims, proprietary data and branding are not included in VC Scope.

## Implemented

- Discover replaces the tall founder-card feed with a company table. Company, founder, stage/location, evidence and actions have consistent positions. A single-line description expands into full context, reasons, ownership and next action. Smaller screens preserve stage/location in the compact record layout.
- Working All companies, Research and Watchlist views separate manual records from fictional examples. Demo labels remain on each synthetic company. Sorting by recency, fit or source count works; the score still opens its explanation and source counts open the evidence drawer.
- Quick thesis controls and progressive advanced filters keep the canvas visible. Unapplied changes are explicitly announced. Saved searches, reset, save and manual intake retain their functionality. Public-web discovery remains explicitly unconnected.
- Today uses a direct review title and the actual first queue item as its primary action. The illustrative thesis is a restrained reference panel; the continuation panel points to current company research. Promotional headlines were removed from Pipeline, Portfolio and Library.
- A consistent typography, spacing, table, control and drawer layer applies across the workspace. Geist Sans and Mono are self-hosted; external Google font imports were removed. The official redistribution license accompanies the locally bundled assets. The PDF's neutral canvas/dark rail and semantic palette are retained.
- Collapsed laptop/tablet navigation keeps visible destination labels, with a usable sign-out control. Mobile retains the five labelled bottom destinations. Library now has grouped references, explicit sample/standard labels and working in-document links.
- Global search traps keyboard focus, locks background scroll and restores focus to its trigger on close. Source drawers retain their existing review and keyboard behavior.
- Company pages use direct section names. The summary's verified-claim, risk and return metrics open Evidence, Diligence and Model respectively; missing inputs remain explicit.

## Verification

- The final 37-route production build, TypeScript validation and scoped workspace ESLint pass. The three existing Edge end-to-end flows passed after the main redesign: durable research draft persistence, mobile evidence capture, and the connected diligence/frozen-review/export workflow. Subsequent changes were copy, metric navigation and responsive CSS; those were inspected in the final production browser.
- Manual checks confirmed Research-only filtering, source inspection, saved-search application, its two-active-advanced-filters indicator, reset, and all three company summary destinations. No real company research was changed during these UI checks.
- Discover has no document overflow at 390, 768, 1024 and 1440px. Library has no document overflow at 390 and 768px, and its menu scrolls inside its own row. Mobile Run search measures 44px high. A mobile Library overflow found during review was fixed and rechecked.
- Global search's forward/backward focus wrap, Escape, focus restoration and background scroll restoration were verified. The final browser error log was empty.
- Actual local screenshots: `screenshots/ui-discover-desktop.png` and `screenshots/ui-library-desktop.png`. These are running-interface captures, not mockups.

## Remaining work

The subsequent guided exploration, interactive Today spotlight and frozen memo reader are described in `UIUX_EXPLORATION.md`, including additional public research of WithAI/Multiplier, Attio, Granola, Linear, Clay, Hebbia and Quartr.

The layout redesign does not connect external data, independently verify founder biographies, certify legacy routes or complete the blueprint release. Saved working-state persistence, the remaining keyboard shortcuts, full assistive-technology review and a five-minute test with two venture users remain open. See BLUEPRINT_ACCEPTANCE.md for non-UI milestones.
