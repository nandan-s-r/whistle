# Product quality and model review - 3 October 2026

This 3 October review covers changes to model reasoning, comparisons and the Discover-to-Memo workflow. The measurements below were taken on local servers. They explain the changes without claiming the same speed or research quality on a hosted account.

## Product references

Public primary pages were reviewed for workflow ideas:

- [Attio](https://attio.com/): reusable record context and preparation alongside CRM data. Applied as focused tools inside the existing company workspace.
- [Linear features](https://linear.app/features) and [quality](https://linear.app/quality): clear next actions and compact navigation. Applied as grouped model controls and deferred optional code, with performance measured separately.
- [Harmonic Scout guide](https://support.harmonic.ai/en/articles/11047921-scout-your-ai-research-agent): repeatable research workflows with persistent context. Applied as preserved assumption reasoning and inspectable version changes.

These are design interpretations, not claims of feature parity or access to competitors' private data. None replaces the PDF's five destinations, six company tabs or human evidence review.

## Working improvements

- Each model input can carry its own rationale and optional captured source. Notes stay in the draft until calculation freezes a new version. Source links record provenance, not verification.
- Model comparison shows changed values, reasons, source IDs and owners alongside base MOIC and annual IRR changes. Both chosen versions remain frozen. Higher modeled returns are not automatically marked as better evidence.
- Updated notes are included in the selected Excel model; older memo-linked workbooks retain their original notes and sources.
- Empty numeric inputs remain empty until supplied. Reader permissions and stale revisions are still enforced on the server.
- Discover cancels superseded searches and ignores late responses. Reset and navigation cancel outstanding work. Company lookup now uses a map instead of repeated scans.
- Validation, connection and timeout messages are readable. Newly generated screening punctuation uses proper Unicode; old frozen documents remain unchanged.
- Optional Sentry/PostHog code loads only when configured. Existing privacy filtering remains in place. This does not establish telemetry delivery.
- Frozen model actions wrap within the available width, including phones. The model input form remains desktop-focused according to the PDF's mobile scope.

## Local performance evidence

Measured with `node scripts/measure-workspace.cjs baseline` before the changes and `node scripts/measure-workspace.cjs final` afterwards. Each run signs up an isolated fictional account and measures three hard navigations per route in headless installed Edge at 1440px, against warm local production servers. Ready means the route's primary heading is visible. Resource bytes are encoded JavaScript response bytes observed in the browser, not source file size. The final run was performed separately from other test suites.

| Route | Earlier median ready | Final median ready | Earlier median JS bytes | Final median JS bytes |
| --- | ---: | ---: | ---: | ---: |
| Discover | 988 ms | 162 ms | 412,421 | 242,952 |
| Company overview | 784 ms | 238 ms | 438,262 | 264,323 |
| Model | 830 ms | 233 ms | 438,262 | 264,323 |
| Library | 614 ms | 215 ms | 418,805 | 242,952 |
| Today | 755 ms | 185 ms | 403,754 | 242,952 |

Initial JavaScript transfer falls by approximately 40–42% across these routes. The final 15 navigations show one workspace read each, zero recorded long tasks, and no captured browser errors. Timing can vary with machine load and caches; the comparison is not a controlled production benchmark. Four fictional companies, disabled optional telemetry, and a local network do not establish production latency, large-dataset performance or field Core Web Vitals. No promise of zero lag is made.

The measurements are saved locally under ignored `scratch/performance-baseline.json` and `scratch/performance-final.json`; they contain no account credentials. Reproducible UI, accessibility and regression results are recorded in VERIFICATION.md.
