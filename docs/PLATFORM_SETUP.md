# Whistle platform setup

This guide covers authentication, stored research, private files, background jobs and service settings. The website and API are deployed, but several services still need credentials or live testing. [Deployment status](DEPLOYMENT.md) is the current release record. The original VC Scope name remains in the Supabase project and compatibility settings.

## Platform components

Separate Supabase project **VC Scope OS**, project reference `fwvxnnuvtisjhrvajzyw`, in **Strata Org**, Mumbai (`ap-south-1`). The connector reported $0/month at creation; future usage, paid plans and connected providers have their own charges. The previously existing Supabase project was not modified.

- Supabase Auth sign-in, signup/confirmation callback and cookie refresh through `@supabase/ssr`. Only the project URL and publishable key enter the browser. Backend authentication checks the user with Supabase; authorization uses server-managed `app_metadata.workspace_role`, never user-editable metadata. Supported roles: analyst, partner, admin, viewer; default analyst.
- Supabase/Postgres tables hold companies, saved searches, immutable audit snapshots, durable jobs and evidence embeddings. Workspace API calls forward the user's bearer token to Supabase's Data API, so RLS applies. They do not use an administrator/service key. Optimistic revision checks preserve concurrent edits; the database trigger preserves previous company snapshots.
- Private `vc-evidence` Storage bucket: PDF or UTF-8 text, 20 MB limit, immutable UUID paths under the user's auth UUID. Uploads and signed viewing links are owner scoped. Signed links expire after 60 seconds. Uploading a file does not extract or verify claims.
- pgvector 768-dimensional evidence index and HNSW cosine index. The worker indexes captured source excerpts using `gemini-embedding-001`. Search uses the same model with query task type and enforces owner RLS. Similarity scores are retrieval measures, not verification or investment scores.
- Persistent jobs expose queued/running/succeeded/failed/cancelled state, revision scope, bounded lease recovery and cancellation. Results are drafts. Saving a job draft adds it to the company's existing approval workflow; stale company versions cannot receive it. Cancellation discards pending results, but cannot undo an external request already in progress. Failed provider tasks can be retried as new jobs.
- Development uses a database-backed polling worker. Docker provides a separate API, frontend, Redis broker, Celery workers and recovery scheduler. Celery messages contain job IDs only, not user tokens or source documents.
- Sentry integrations exclude credentials, source content, request bodies, personal fields and local variable values; only error type and stack locations remain. Tracing/replay are disabled. PostHog captures selected workflow action names with ephemeral anonymous identifiers; autocapture, replay and page tracking are disabled. No telemetry service is active until its configuration is supplied.
- GitHub workflow defines backend checks, frontend build/lint/audit, Playwright checks, a production API image build, and SQL policy checks on an isolated pgvector database. The release passed the application and database jobs in GitHub. See DEPLOYMENT.md for the tested revision and current hosted checks.

## Enter credentials privately

Use a private file outside the repository, such as `%LOCALAPPDATA%/VC Scope OS/backend.env` on Windows. Create its parent folder if needed. Do not paste keys into chat, research excerpts, client code or tracked files.

| Private backend variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Research drafts and source embeddings |
| `GEMINI_MODEL` | A generation model available to your Google project |
| `SUPABASE_SERVICE_ROLE_KEY` | The private cloud worker's server-side service-role JWT; never browser accessible |
| `FIRECRAWL_API_KEY` | App runtime public-page ingestion; the chat connector's credential is not automatically available to the app |
| `SENTRY_DSN` | Optional backend/worker error destination |

Supabase's publishable key is designed to be public and is protected by RLS. It is different from the private worker/service-role key. Gemini receives its own key in an authentication header; source excerpts/claims are sent to Google only for the task the user runs. Web capture sends the selected public URL to Firecrawl. Indexing sends selected source excerpts to Google. No external model or crawler request occurs simply by opening a company.

Optional frontend variables: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_SENTRY_DSN`. These are browser configuration identifiers, not private Gemini/service keys. Enter them locally or through your host's configuration; rebuild the frontend after changing them.

Local preview uses `AUTH_PROVIDER=hybrid`: existing manual records remain local, while a Supabase sign-in opens a separate cloud workspace. Local accounts are not linked to cloud accounts merely because their emails match. There is no silent transfer of local company records to Supabase. Production requires `backend.main:app` and `AUTH_PROVIDER=supabase`; all legacy business routes are retired in both API entry points.

## Security boundaries

No shared accounts are installed on startup. Existing accounts using the former shared password are quarantined without deleting their research; local operators can recover an account with `python -m scripts.reset_local_password EMAIL`. Passwords are entered privately at the prompt. In this local workspace, the two former demo passwords and session-signing secret were rotated privately; new sign-in details are outside the repository in `C:/Users/srnan/AppData/Local/VC Scope OS/local-sign-in.json`.

Private file uploads authenticate before multipart parsing. The complete upload envelope is bounded to 20 MB plus 64 KB, and the file itself remains limited to 20 MB. Other API request bodies are limited to 1 MB, including actual chunked bytes. Legacy PDF rendering and shared-table CRUD cannot be reached through HTTP.

Queued work is admitted atomically by the database: at most five active tasks per owner and 100 across the workspace. Direct Supabase inserts face the same checks. Job admissions and actual provider calls each have durable owner limits of 10/minute and 100/day, and workspace limits of 60/minute and 1,000/day. Fixed windows reset at UTC minute/day boundaries. These are call-count allowances, not monetary billing caps. Quota exhaustion pauses background work until a later minute; indexing resumes previously stored chunks. In hybrid mode, paid provider work requires Supabase sign-in so local and cloud accounts cannot obtain two separate workspace allowances. Rules-based local research remains available; an explicitly isolated `AUTH_PROVIDER=local` installation uses its own durable local allowance.

The unused WhatsApp endpoint accepts only bounded, signed receipts with an explicitly configured app secret and verification token. It does not invoke AI, execute commands, write investment records, or log message contents. `run.py` binds it to loopback.

The cloud security migration is applied to the separate project. The website and API are deployed, and the API image build passed in GitHub. Running containers, worker delivery and signed-in hosted behavior still need checks.

For the cloud worker, set `JOB_DATABASE=supabase` and supply its private service-role key. A worker uses elevated database access only to process a stored job after matching company ID, owner and revision. Keep it on the server. Without this credential, cloud jobs refuse to queue with an explicit setup message.

## Auth confirmation setup

In the new project's Auth URL configuration, allow the actual frontend origin and `/auth/confirm` callback (local preview: `http://127.0.0.1:3000/auth/confirm` and `http://localhost:3000/auth/confirm`). The repository's local Supabase configuration contains these callbacks; the hosted Auth settings still require dashboard configuration. Keep email confirmation enabled for hosted signup. The callback supports PKCE confirmation codes and an email `token_hash` template. A real signup/confirmation session has not yet been tested; no user account or confirmation email was created by the agent.

Password recovery additionally requires the actual origin's `/reset-password` URL in the allowed redirects (including both local variants if used). The browser client performs the single PKCE exchange; AuthProvider retains the recovery event before the form mounts. The user enters and submits the new password privately. Cloud sign-in is the default when frontend Supabase is configured; local preview credentials/records are separate and are not automatically migrated. Hosted recovery delivery is still unverified. See RELEASE_READINESS.md.

## Docker

Local container startup has not been checked. GitHub verification builds the API image; it does not prove that the full Compose stack runs. After installing Docker, load the project URL/publishable key into your shell, set `VC_SCOPE_PRIVATE_CONFIG` to the private file, and run `docker compose up --build`. Compose binds the app/API only to localhost. The worker requires the private service-role key; optional provider credentials determine which jobs can run. `requirements-platform.txt` and the frontend lockfile pin dependencies. Private environment files, databases and uploads are excluded from image build contexts.

## External data availability

- Apollo connector is installed, but its people-search request returned `API_INACCESSIBLE` on the current Free plan. No enrichment, outreach, purchase or plan upgrade ran.
- No licensed Crunchbase, Dealroom or Tracxn funding feed was found or connected. Use authorized files/links and manually reviewed claims until licensed API access is supplied.
- LinkedIn is limited to authorized profile links/exports. No account scraping.
- Zapier can call authenticated workspace endpoints with an appropriately scoped user session. No Zapier automation or credential has been configured. There is no public unauthenticated ingestion webhook.
- Public news URLs can enter the web-source queue. No dedicated paid news-search feed is connected.
- Research orchestration uses narrow tasks, scoped company revisions, validated citations and human approval. Gemini remains the selected model; an additional OpenAI Agents SDK dependency is not required for these tasks.

## Verified boundaries

Current results are recorded in [VERIFICATION.md](VERIFICATION.md); the counts below preserve an earlier milestone.

At the earlier platform milestone, 48 backend tests passed. Twelve rollback-only checks passed on the actual new Supabase database, covering owner isolation, role escalation denial, immutable audits, private Storage visibility and scoped vector retrieval. At that milestone, the Supabase security advisor reported no findings; performance warnings were fixed, leaving informational unused-index notices expected in a fresh project. See [Supabase's unused-index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

These checks do not establish live Gemini/Firecrawl credentials, a cloud-worker run, real email confirmation, a Storage HTTP upload, hosted Realtime delivery, Sentry/PostHog delivery, container execution or remote CI/CD. Each integration's status is visible in **Library → Connections & imports**.

## Fund access - 4 October 2026

Local Library → Fund access supports fund-owned research copies, active memberships and per-deal Viewer/Reviewer grants. Only administrators manage membership/grants; administrators can see every fund record. Membership alone gives other teammates no deal access. A member's Viewer role cannot become writable through a Reviewer deal grant. Deactivation deletes deal grants and retains fund records and history; reactivation does not restore grants. A sole administrator needs another administrator before leaving.

Two migrations add the matching Supabase tables/permission helpers and move the existing provider-budget entry point behind a checked private helper. Public wrappers use caller privileges. These are applied to the dedicated project; hosted fund access still needs real-account testing. `FUND_ACCESS_ENABLED=false` remains the default. Enable only after real signed-in app/API/export/revocation checks. Personal cloud records continue under owner policies. Shared private files, vector indexes and background jobs remain unsupported; fund jobs refuse to queue.

Local migration filenames now match the versions returned by the actual project's migration history: `20261002210236`, `20261002213524`, `20261003003507`, `20261003191250`, `20261003191659`, `20261003202957`. SQL contents were preserved while aligning identifiers. Do not replay those migrations against this project or repair its history blindly. The CI database job applies them in order to an isolated database; the release database job passed against an isolated database.

The last migration protects ordered frozen model, memo, decision, observation, alert-review, viewpoint and operating-forecast histories against direct database updates. App saves preserve original legacy JSON while appending new versions. Actual rolled-back database tests cover malicious rewrites and ordinary revisions. New entries still require application validation and human review; this guard is not a certification of their truth.
