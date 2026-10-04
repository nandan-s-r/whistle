# Whistle integration cross-check — 5 October 2026

Scope: the 18-entry app connection catalogue, provider account gates, job admission and deployment wiring. An installed chat MCP is separate from a Whistle runtime integration. This is a configuration/workflow review, not an exhaustive security certification or hosted acceptance.

## Current account and acceptance boundaries

The existing browser account is a **local hybrid-preview account**. Its 13 company choices remain present. No private key file was opened, no persistent test account was created and no company record was modified. Normal application startup loads private configuration; checks expose only capability booleans and safe explanatory text. No deployment, purchase, migration, outreach or permission expansion was performed.

| Catalogue entry | Result and remaining acceptance |
| --- | --- |
| Supabase Auth, RLS & Storage | Connector lists the dedicated project as ACTIVE_HEALTHY. All 11 Whistle public tables have RLS and policies. Evidence bucket is private with a 20MiB limit. Actual cloud sign-in, recovery email, file access and two-user hosted isolation remain unverified. |
| Gemini research | App reports configured, but this local hybrid account cannot run paid provider work. Grounded and supervised-model success still need a cloud-account run. Keys were not inspected. |
| Knowledge search · pgvector | Local account cannot use cloud indexing/search. Requires the supported embedding configuration, a cloud index and a matching worker for indexing. An embedding key alone no longer produces “Ready to index.” |
| Firecrawl web ingestion | App has no runtime key. Separately, the chat MCP credit check returned **−694 / 1000** with billing-period end 22 October. No charged crawl was attempted; that MCP balance does not establish an app credential or balance. |
| Apollo people data | No runtime integration. Historical chat check returned API_INACCESSIBLE on the Free plan; it is labelled a past check rather than current app connectivity. No contact enrichment performed. |
| Crunchbase · Dealroom · Tracxn | No licensed runtime feed. Entitlement and display rights remain prerequisites. |
| LinkedIn | Authorized manual references only; no direct people search, account scraping or outreach integration. |
| Product Hunt sourcing | Fixed official public-feed adapter exists. Bounded public workflow acceptance is recorded in VERIFICATION.md; commercial full-API permission is separate. Feed launches do not establish customers. |
| GitHub discovery | Fixed public repository-search adapter exists. Research references are not verified startups/founders. Runtime public search is separate from the chat GitHub connector and deployment checks. |
| Calendly meetings | Internal account-bound read-only adapter passes fixture tests. Current account requires private scope/token setup and cloud sign-in. Live booking import, ongoing synchronization and multi-customer OAuth are unverified/unimplemented. |
| Team deal access | Local membership/deal permission implementation exists. Hosted enable flag now uses the same case handling as its repository. Actual two-user cloud HTTP acceptance remains required. |
| X customer signals | Runtime access not configured. Direct recent search requires an official entitled key and allowed account. No private-account scraping. |
| Zapier | No automation or scoped integration credential connected. A session-authenticated API is no longer described as a Zapier connection. |
| Background jobs | Local embedded configuration is detected, not a worker heartbeat. Admission rejects wrong target database, missing cloud key and unsupported/production-embedded modes. Cloud Compose now explicitly aligns API, worker and scheduler to Supabase. Container execution remains unverified. |
| Sentry | Backend DSN not configured in this check. Sanitization tests pass; live event delivery has not been tested. |
| PostHog | Browser reports no project key. Curated event implementation exists; live delivery has not been tested. |
| News feeds | No dedicated licensed news-search feed selected/connected. Public source links can be reviewed manually. |
| GitHub checks & Docker | Local CI/container definitions exist; no remote workflow or container deployment was run in this increment. |

## Corrections

- Replaced overconfident connection, index and worker labels with account-aware configuration states. Added a configuration-only scope statement.
- Shared readiness checks now drive both the UI and API admission. Unsupported tasks fail before job persistence or provider requests. Knowledge configuration fails before embedding calls.
- Connections, jobs and files load independently so a failed service cannot hide successful checks. Job polling is reduced to once every 15 seconds while visible; private files and configuration are not polled repeatedly.
- Supervised company selection excludes shared records consistently, including its default. Shared-record background processing remains unavailable.
- Aligned cloud Compose API job storage with the cloud worker/scheduler. YAML wiring was parsed and asserted; this is not a running-container check.
- Stabilized two durable allowance tests with a controlled clock after a full run crossed the real minute boundary. Actual allowance behavior was not loosened.
- The live semiconductor query surfaced an irrelevant recruitment collection. Extended the existing reference-list filter to exclude obvious job directories; a transport fixture checks that real product repositories still pass.

## Verification

Final full isolated backend run: **184 tests pass in 148.755s**, using pinned PyJWT 2.15.1. Ten new tests cover false-positive connectivity, secret omission, empty cloud identity, hybrid admission, database routing, embeddings, rules fallback, hosted worker mode and fund configuration consistency. **15 frontend tests**, scoped ESLint and the **40-route** TypeScript production build pass. Source/document secret-pattern check inspected **301 files with zero flagged filenames**; private settings and database contents were excluded. This does not audit Git history or certify absence of all secrets.

Real browser inspection confirms all 18 entries, Gemini's cloud-account requirement, missing Firecrawl runtime access, disabled unavailable queue/search/file controls and all 13 existing company options. Screenshot: `screenshots/whistle-connection-crosscheck.jpg`. Provider keys were neither displayed nor requested. A live semiconductor prompt completed on both Product Hunt and GitHub: Product Hunt inspected its latest 50 feed entries with zero matching launches within 30 days. The final GitHub rerun returned five project references with the recruitment directory removed. Repository references remain unverified company/founder/customer evidence; no AI brief was fabricated without a cloud Gemini run.

Supabase advisory review returned one informational no-policy notice for `vc_private.work_allowances`. Metadata confirms RLS and no SELECT grants to `anon` or `authenticated`; access remains restricted deliberately. Four unused-index notices were retained because unused indexes on an unaccepted/low-traffic deployment do not justify removing required search/access indexes.

Primary references used to check provider/database semantics: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [private/exposed schema boundaries](https://supabase.com/docs/guides/database/tables), [Gemini structured REST outputs](https://ai.google.dev/gemini-api/docs/generate-content/structured-output?hl=en). Metadata, fixtures, configuration and live user workflows are different kinds of evidence; none substitutes for the others.
