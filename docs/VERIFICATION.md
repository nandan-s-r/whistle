# Whistle verification — 4 October 2026

## Integration depth and original activity time — 5 October 2026

Final full backend regression: **174 passed in 46.795s**, with an explicit PyJWT 2.15.1 assertion and isolated fixtures. Twelve new calendar/activity cases cover exact account binding (including local/cloud identity separation), hybrid capability restrictions, reader/deal write permissions, read/retention consent, fixed GET-only destinations, personal-user filtering, response/date/duration bounds, minimal metadata retention, signed ten-minute previews, original activity timestamps, stale revisions, provider event changes, cancellations, duplicate import, generic errors and allowance-before-network. No existing account or research row was changed by these tests.

**15 frontend tests** pass. Scoped React lint passes after the new components and direct industry-search link; the final CSS refinement passes the **40-route** TypeScript production build. The observed crowded legacy connection forms now have aligned labels, bounded fields and 44px controls. Existing navigation, palette, supplied logo, review agenda and source/history mechanisms remain.

Actual browser checks confirm Library connection status, a collapsed catalogue of 18 services, direct navigation to `/discover?mode=sourcing` with Industry research selected, retained 13 companies in the company selector, Pipeline's explicit missing-founder-reply labels, and the optional `datetime-local` original activity field in a preserved company record. The read-only live calendar setup panel correctly refuses unavailable/local-hybrid work; no live Calendly request or save was performed. At 390px, document width is 385px, calendar controls are 44/54/44px and form controls are at least 44px. The expanded 18-row catalogue also stays within the phone viewport. Temporary viewport overrides were reset. Screenshot: `screenshots/whistle-integration-workflows.jpg`.

Firecrawl MCP balance remains -694; no charged work was attempted. The original repository's meetings page was reread using the GitHub connector. No API credential file was opened or overwritten. Final source/document credential-pattern check inspects 298 files, flags zero and skips private settings and databases. This is not a new exhaustive security scan or hosted certification. Live Calendly configuration, per-user SaaS OAuth, actual two-user cloud permissions, CRM synchronization and licensed social/funding providers remain acceptance work. See INTEGRATION_WORKFLOWS.md.

## Unified industry prompt — 5 October 2026

Final isolated backend run: **162 tests passed in 40.680s**, explicitly asserting PyJWT 2.15.1. **15 frontend tests**, scoped IndustryResearch/next.config lint and the latest TypeScript production build (40 routes) pass. New boundaries include authenticated capability flags, consumer/unknown-sector feed terms, public-only provider selection, no-source rejection, preserving public results after a provider allowance failure, overlapping independent requests, UTF-8 byte citation offsets/invalid boundaries and GitHub topic/reference filtering. Fixtures do not change the user's records or inspect private settings.

The final actual portal query, “Find AI and developer tool startups with active public projects,” returned **four Product Hunt launches** (Clair, Sente, Aperture, Singularity) among 50 feed entries and **five GitHub projects** (affaan-m/ECC, DietrichGebert/ponytail, Graphify-Labs/graphify, puppeteer/puppeteer, OpenHands/OpenHands). Product Hunt covers the latest feed and 30 days, not its whole database. GitHub exposes the query `topic:developer-tools archived:false fork:false pushed:>=2026-04-07`, ordering by stars. An earlier query returned reading/tutorial lists; the observed issue led to the final filter and regression case. These results establish successful public collection, not verified startup/founder identity or adoption.

The restarted preview retained 13 saved companies. Research results did not write companies, claims or investment decisions. Dark-theme desktop and 390px phone layouts were inspected; document scroll widths stayed within their viewports (865/870 and 385/390px). Phone research controls were at least 44px high. No new automated accessibility certification is claimed. Screenshots: `screenshots/whistle-unified-research.jpg` and `screenshots/whistle-unified-research-phone.jpg`.

The local-account status correctly reports configured Gemini with cloud sign-in required; its existing paid-provider policy was preserved. No live cloud grounded answer was obtained. Direct authenticated LinkedIn/X search is not connected; indexed public references and authorized excerpts have distinct boundaries. Firecrawl chat credits are exhausted, its runtime key is not configured, and Apollo access is plan-blocked. These are outstanding integrations, not simulated successes. No key file was opened, new account created, outbound message sent, purchase made, GitHub push or deployment performed.

## Deal sourcing — 4 October

Discover's new Deal sourcing mode targets the user's selected AI chips and semiconductor infrastructure thesis. The signed-in portal successfully fetched Product Hunt's official public feed: 50 entries inspected, zero chip text matches. Three separately labelled research snapshots (d-Matrix, Axelera AI and NeuReality) remain visible with dated source context and unanswered diligence questions. They are not live launch matches, confirmed customer enthusiasm or current investment opportunities. No existing company, claim or investment records were changed by this sourcing run.

Initial implementation validation passed 131 backend tests and 13 frontend tests. The final affected sourcing/security/platform suite passed 45 tests after the keyless public-feed allowance and two mocked X-adapter checks. The final production build generates all 39 routes and passes TypeScript; targeted React lint passes. Save behavior, receipt ownership/expiry, duplicate preservation, unreviewed evidence, retention confirmation and failure boundaries are checked in isolated fixtures. X calls are mocked: runtime access is not configured and live X acceptance remains unverified. LinkedIn supports authorized selected excerpts, with no automated scraping.

Manual browser checks confirm all three leads, original-source links, next questions, Save to research controls and the disabled X button with its explanation. The review drawer and customer-signal form have no horizontal page overflow at 390px. The default 865px desktop view has no overflow in light or dark appearance; the user's dark appearance and normal viewport are restored. Proof: [desktop sourcing](screenshots/whistle-deal-sourcing.jpg) and [phone sourcing](screenshots/whistle-deal-sourcing-phone.jpg). These are targeted rendered-page checks, not a new broad accessibility certification or first-time investor acceptance study.

Automatic approval review blocked persistent QA-account creation because it would change saved state without explicit approval. No workaround account was created; isolated fixtures verify saving instead. Private configuration contents and credentials were never displayed, edited or exposed to the browser. Full-market coverage, continuous monitoring, source licensing and hosted integration acceptance remain open. See [DEAL_SOURCING.md](DEAL_SOURCING.md).

## Clearer text colours — 4 October

The user requested easier-to-read words and sentences. Eighty-eight text rules that had inherited the orange link colour now use explicit primary, body or supporting roles across Discover, Today, Pipeline, company records, model values, source excerpts, memos, forms, research tools and ecosystem panels. Actual links/actions and selected states retain the burnt-orange/copper treatment; labelled evidence states retain their semantic colours. Light primary prose stays #242321 and supporting text #68645E. Dark headings stay #F7F5F0, body text uses #DED9D0 and supporting text #B8B0A3. Dark navigation keeps its separate readable roles.

The 39-route production build and TypeScript pass; `git diff --check` passes. Fresh audits pass 196 Axe states (theme 68, studio 64, ecosystem 64), 76 broad theme layouts and the studio/ecosystem overflow checks. No detected violations, overflow or captured page errors remain in those checked states. Representative contrast ratios: light body on white 15.70:1; light supporting text on ivory 5.39:1; dark body on surface 10.88:1; dark supporting text on raised surface 6.03:1. These numerical checks supplement the actual-page audits, rather than establishing full accessibility conformance.

The normal backend remains running. QA uses synthetic records without an external model call or reading private configuration. The user's Discover page is reloaded against the final build; neutral descriptions, supporting metadata and the nine saved company rows are confirmed in the rendered DOM. Proof: [Discover text hierarchy](screenshots/whistle-readable-discover.jpg). The earlier full workflow tests are historical and were not unnecessarily repeated for this CSS-only revision. Independent readability/usability and human accessibility acceptance remain open.

## User-requested AI chip companies — 4 October

All nine requested companies are saved through the signed-in Discover UI with one official source and company-reported claim per company. The reloaded page shows 13 total records (four existing demos plus nine research records); each requested name is unique in Research and each has one source. Current hiring and unconfirmed India locations remain explicitly unverified. No funding stage, fit score or investment approval was inferred. This is an account-data addition, with no application code or private configuration change. See [AI_CHIP_SHORTLIST.md](AI_CHIP_SHORTLIST.md) and its screenshot for provenance and bounded UI verification.

## Gemini connection check — 4 October

The running authenticated workspace metadata reports Gemini configured with gemini-3.8-flash. A small direct connection request to Google returns HTTP 200 with a candidate response. The subsequent application-format structured-draft diagnostic receives HTTP 503 / UNAVAILABLE on both the initial attempt and one retry; usable structured generation remains unverified. The local synthetic account's draft action returns 422 because hybrid mode requires cloud authentication for external provider work. That boundary is retained rather than bypassed.

Diagnostics use only fictional/empty records and print status metadata; private key values, configuration contents, tokens and generated response text are never displayed. Ordinary backend configuration remains intact. Initial restricted-network failure is resolved by the authorized network-enabled diagnostic. No claim of successful end-to-end cloud-account generation follows from the successful connectivity check.

## Simpler everyday use — 4 October

New accounts now reach Pipeline's three-field intake through “Add your first company”. Discover keeps search and company entry visible while founder tools, source journal, directory and example searches open under “Research tools”. Company pages retain their six tabs and core review/decision actions; secondary meeting, presentation and memo shortcuts open under “More tools”. Native disclosures have visible keyboard focus, responsive helper text and no additional requests, state effects or dependencies. Active dialogs remain outside the disclosures.

The final production build passes TypeScript and generates 39 routes; workspace lint and `git diff --check` pass. All 16 browser workflows pass across the full run and one corrected-test rerun: the original run passed 15, while the search-order test timed out looking for example buttons now inside the closed disclosure. Adding the same opening step a user needs fixes the test; its targeted rerun confirms a delayed response cannot replace newer search results. No application change was needed for that failure.

The studio suite passes 64 automated accessibility/layout states, including the optional tools closed/open and keyboard activation across desktop/phone and both themes. The broad theme suite passes 76 layout checks and 68 Axe states across authentication, empty workspaces, populated pages, company tabs and dialogs. Neither suite reports detected violations, overflow or captured page errors. Manual review includes the phone welcome screen and desktop Discover. React review confirms stable company identity and unchanged hook ordering. QA uses disposable synthetic accounts and process-level rules mode, without opening private configuration or making external AI requests.

The ordinary backend is restored after QA without opening private configuration. The rebuilt preview's sign-in page returns 200, and anonymous workspace access returns 401. This is a local UX improvement. Existing investment behavior and saved data remain intact; independent first-time investor observation, human accessibility acceptance, hosted performance and live integrations remain open. See [UIUX_WORKSPACE_FINISH.md](UIUX_WORKSPACE_FINISH.md).

## White logo, larger mark and alignment — 4 October

The user requested a white logo, a little more zoom and proper alignment. The shared frame grows from 44px to 48px; the supplied PNG renders at 60px inside it, with a 3px optical offset to center the diagonal whistle. This enlarges the visible artwork by approximately 36% without clipping its silhouette. A CSS white treatment removes the pale tile on charcoal sign-in/sidebar surfaces and dark public headers; light public headers retain the charcoal original for readability. The PNG bytes and browser icons remain unchanged.

Final verification: 39-route production build/TypeScript and scoped Brand lint pass. The logo audit passes 30 frame/artwork/wordmark alignment checks and 32 Axe states at 1440/1024/768/390px in both appearances across sign-in, signup, About and a synthetic empty Pipeline. No checked overflow or page errors remain. Served PNG hash equality still passes. Screenshot pixel checks confirm the logo's empty background matches the charcoal surroundings on sign-in and sidebar. A blending treatment that initially confused sidebar contrast was narrowed to the artwork there; wordmark readability now passes.

This is a local presentation change; private configuration, backend behavior and investment data were not opened or changed. Earlier full workflow results below are historical and were not repeated for the logo adjustment.

## User-approved warm palette — 4 October

The user's warm ivory/white/charcoal/stone/burnt-orange palette replaces the old blue/navy colour system across shared workspace, authentication, public pages, drawers, editors, charts and legacy styles. `palette.css` owns the light/dark roles. Existing source styles use these roles; the user-supplied logo is unchanged. See [WARM_PALETTE.md](WARM_PALETTE.md).

The palette revision passes a 39-route production build and TypeScript, workspace lint, 13 frontend Node tests and `git diff --check`. A single full Playwright run passes all 16 workflows, including sign-in, team access and revocation, source capture, decision conditions, frozen model/memo history, export, Pipeline views/mobile and appearance persistence. Tests use synthetic accounts and an isolated process-level rules provider; private configuration was not opened and external AI calls were not used.

The complete palette audit passes 236 Axe states: theme 68, studio 52, ecosystem 64, public 20 and brand 32; the theme suite also passes 76 layout checks and the brand suite 30 alignment checks with original served artwork equality. No detected accessibility violations, page overflow or captured page errors remain in those checked states. Manual visual review covered light/dark desktop Pipeline, sign-in and phone sign-in. The initial Today spotlight contrast problem and faint sign-in theme icon were corrected.

A final placeholder-only colour improvement raises sign-in hint contrast to 5.88:1 in light mode and 8.40:1 in dark mode. After that improvement, the production build and broad 76-layout/68-state theme suite pass again. The 16-workflow run and the studio/ecosystem/public audits above precede this last cosmetic adjustment; their scope is recorded rather than represented as new runs. The final brand audit also passes again: 32 Axe states and 30 alignment checks, with the original artwork served unchanged. The ordinary backend is restored after QA without opening private configuration. The local preview is served from the rebuilt production bundle; hosted performance, live integrations and independent investor usability remain unverified.

## User-supplied Whistle logo — 4 October

The user's supplied whistle artwork replaces the earlier vector symbol in the shared sign-in, signup, public-header and workspace-sidebar component. The original PNG is copied without visual edits; attachment/local-asset SHA-256 equality and served-asset equality both pass. It keeps its supplied background and square proportions. The 44px frame is centered beside the wordmark without stretching or cropping the artwork. Favicon sizes 16/32/48/64 and the 180px Apple shortcut use the same source; the SVG icon embeds those original PNG bytes.

The final production build passes TypeScript for 39 routes and workspace lint passes. `node scripts/verify-brand.cjs` passes 30 image/frame/wordmark alignment checks and 32 Axe states: sign-in, signup, About and an empty synthetic Pipeline in both themes at 1440/1024/768/390px. The phone workspace intentionally retains its existing bottom navigation without a sidebar logo; the compact tablet rail displays the new artwork. No page overflow, captured page errors or detected WCAG violations remain in these checked states. Icon routes return 200. The tablet audit caught a preexisting unlabeled Connections & settings link when its text was hidden; an explicit accessible label fixes it.

Screenshots: `screenshots/whistle-supplied-logo-login-light-1440.png`, phone/dark variants, sidebar variants and the cropped rendered wordmark `screenshots/whistle-supplied-logo-lockup-light.png`. The preview is restarted with the final build. No backend behavior, private configuration, API key, investment record, external AI request or deployment is changed. Earlier investment-workflow counts below are historical and were not unnecessarily rerun for the logo change.

## Pipeline first-use follow-up — 4 October

The user asked for a simple Pipeline for people using Whistle for the first time. Direct intake now asks for three initial fields, with extra metadata behind More company details. Empty Pipeline has a clear add action and optional instructions rather than unused filters. The optional guide explains recorded decisions, views and completed investments. New unsourced rows lead to Evidence; unknown metadata is not guessed. A partially saved addition can be retried without duplicating the company, and an existing canonical domain preserves its research and decision.

- The final production build passes TypeScript and generates 39 routes. Workspace lint passes, all 13 frontend Node tests pass, and `git diff --check` passes.
- All 16 Edge journeys pass against the final production build across the serial run and the eight-workflow rerun. The first eight passed in the final full attempt; the remaining group's shared sign-in setup encountered the real HTTP 429 cooldown. Its signup/sign-in helper now retries only after a confirmed 429 and the advertised cooldown, without changing authentication controls. All eight affected workflows then pass. These results are not described as a single uninterrupted 16-pass run.
- The new first-use journey checks sixteen accessibility/overflow states (empty Pipeline, expanded guide, quick intake and expanded details; both themes at 1440/390px). It also verifies hidden-field validation, a deliberately failed membership save, successful retry with exactly one creation, reload persistence, source/claim capture, a reasoned Watch decision and canonical-domain deduplication without research replacement.
- Screenshots include `screenshots/whistle-pipeline-intake-light-390.png`, its dark/desktop variants and `screenshots/whistle-pipeline-first-review-390.png`. Visual inspection corrected native input styling and preserved the shared 16px mobile form text. The failed-save test caught and removed a duplicate error notice.
- The final broader theme audit passes 76 layout checks and 68 automated accessibility checks across light/dark pages, empty accounts, Companies/Board, company tabs and drawers. It reports no document overflow, captured browser errors or detected WCAG violations. The sixteen new first-use states are checked separately by the journey above.

Earlier attempts are not counted as final passes: the new test initially omitted the visible mobile Next prefix and later refreshed before its return navigation completed. Those test preconditions were corrected. A separate regression attempt was stopped after a concurrent preview rebuild invalidated its stable-build precondition; the final checks use the restarted production preview.

QA uses disposable synthetic local accounts and process-level rules mode. No private Gemini configuration, real-account credential or clipboard content is inspected, and no live AI request is made. The ordinary backend configuration is restored afterward; sign-in returns 200 and anonymous workspace access returns 401. The final production preview remains running on ports 3000/8000. This improves the tested first-use journey; independent novice-investor usability, screen-reader/200% zoom acceptance, hosted performance and live integrations remain open.

## Minimal workspace direction — 4 October

The user selected “Minimal like Linear/Attio: dense deal rows, fewer panels, restrained colors.” Pipeline now opens as a searchable company register with slim decision filters. Board and People remain selectable, stored view choices remain intact, and evidence opens directly from either layout. Phone rows retain company, decision, stage, next step, evidence and owner. The fixed example thesis block is removed from the sidebar; Library retains the thesis. Demo disclosure now appears only for accounts containing illustrative records. Sign-in and empty-account copy are simpler, and Today counts use flat controls. Authentication behavior, permissions, provider settings, calculations and frozen artifacts are unchanged.

- The final production build generates 39 routes and passes TypeScript. Workspace lint and targeted login/Pipeline route lint pass without warnings. All 13 frontend Node tests pass.
- All 15 Edge browser workflows pass in one serial run. The new Pipeline flow checks query results, no-match recovery, People/Board switching, source drawers, restored focus, decision filtering and phone overflow. The existing preference test now verifies the default Companies view and explicitly selects Board before checking persistence.
- The broader theme run passes 76 layout checks and 68 automated accessibility checks, including empty accounts, company tabs and the new Board view. Final small styling/import corrections are followed by 16 focused layout checks and 24 accessibility checks against the final production build. Both report no document overflow, captured console/page errors or detected violations in the checked states.
- Final screenshots include `screenshots/whistle-pipeline-light-1440.png`, `screenshots/whistle-pipeline-dark-1440.png`, phone versions, Board versions and `screenshots/whistle-login-dark-1440.png`. They contain synthetic accounts and explicitly labelled fictional records.

Visual review caught an inherited dark card background on Today counts and a heavier-than-needed collections import on Pipeline. Both were corrected before the final checks. The newer final focused audit is invoked with `DESIGN_CHECK_MODE=minimal-final`; the ordinary theme mode retains its broader scope. Previous studio/ecosystem audit counts below are historical, not freshly rerun in this pass.

QA uses disposable local accounts and process-level rules mode. No private Gemini file, credential or clipboard content is read, and no live AI request is made. The ordinary backend configuration is restored afterward. This is a local UI change; investor feedback, screen-reader/200% zoom acceptance, hosted performance and live integrations remain open.

## Earlier workspace design finish — 4 October

The Library reading layout, first-use workspace, Discovery tools, shared typography/navigation and optional dark surfaces were revised following the user's request for a more professional interface. The PDF's later visual and navigation specifications remain the basis. See [UIUX_WORKSPACE_FINISH.md](UIUX_WORKSPACE_FINISH.md) for the design scope and retained boundaries.

Verification of this revision:

- The production build passes TypeScript and generates 39 routes. Workspace ESLint and all 13 frontend Node tests pass.
- All 14 Edge browser workflows pass in the final serial run. The new workflow checks an empty-account capture path, reference selection and reload, copy success and permission failure, document anchors and mobile navigation. Clipboard writes are replaced only in the disposable test page; the OS clipboard is never read.
- The theme audit checks 72 route/theme/width layouts and 64 accessibility states, including empty Today/Pipeline/Portfolio. There is no document overflow, captured console/page error or detected WCAG A/AA violation in these states.
- Studio checks cover 52 additional drawer/page states; ecosystem checks cover 64 more. Both report no overflow, captured page errors or detected accessibility violations. Together these scripts perform 180 automated accessibility checks.
- Saved screenshots include `screenshots/whistle-library-light-1440.png`, `screenshots/whistle-library-dark-390.png`, `screenshots/whistle-welcome-dark-1440.png` and `screenshots/whistle-today-light-1440.png`. The screenshots show synthetic accounts and labelled demonstration records.

The first theme run caught a light-theme notice contrast of 4.24:1; its text now uses the shared muted token and the repeat audit passes. Visual inspection also caught inherited dark Library borders, which were removed. A concurrent regression run had three failures: signup was confirmed blocked by its real HTTP 429 cooldown, while export-download and dependent frozen-memo checks timed out. The model tests now use the existing cooldown-aware signup helper, without relaxing authentication limits. The affected tests and the complete serial suite subsequently pass; the exact cause of the two concurrent timeouts was not established, so this is not a hosted-load/performance certification.

QA uses separate synthetic local accounts and a process-level rules-provider override. Private Gemini files and the user's credential values are not opened or displayed, and no live provider request is required. The preview's ordinary backend configuration is restored after the checks. Investment permissions, calculations and frozen-record logic were not changed by this visual revision. Real-investor feedback, screen-reader/200% zoom acceptance, live providers and hosted performance remain open.

## Private Gemini editor setup — 4 October

Repeated Notepad launches of the existing `VC Scope OS/backend.env` failed in the user's desktop despite successful existence checks. The user requested a newly created and saved settings file. A separate `LOCALAPPDATA/Whistle/Gemini Settings.txt` was created with UTF-8 encoding, `WORKSPACE_PROVIDER=gemini`, `GEMINI_MODEL=gemini-3.8-flash` and an empty `GEMINI_API_KEY=` line. The directory and file were created outside the repository/OneDrive, using create-new semantics; existing settings were not overwritten, read by the assistant or renamed. Notepad launch was requested, but successful desktop opening still requires user confirmation.

The runtime now reads only the three Gemini settings from that separate file. Explicit process settings retain priority, other private settings are unchanged, and an explicit `VC_SCOPE_PRIVATE_CONFIG` keeps its existing authority. Three isolated configuration tests pass for the allowlist, process/custom-config precedence and an empty key; Python compilation and `git diff --check` pass.

After the user saved their file, a boolean-only runtime check initially found no key and metadata showed a second file named `Gemini Settings.txt.txt`. The extra extension was corrected with native moves inside the private directory; the earlier expected file was retained as a separate backup rather than overwritten. Neither file's contents were displayed or opened in an editor by the assistant during this correction. The app's internal configuration check now reports Gemini selected, a nonempty key and the expected model, without exposing credential values. The ordinary preview API was restarted; the login page returns 200 and anonymous workspace access returns 401. No live provider call was made, so key validity and successful Gemini draft generation remain unverified.

## Follow-up integrity fix — 4 October

The user's request to resolve mistakes prompted an additional completed-investment boundary check. It found a real application/database mismatch: an authenticated owner could directly change a Closed opportunity's ownership from 0.05 to 0.9 in Supabase even though the app action rejected that edit. The synthetic reproduction rolled back.

The shared local/cloud save helper and new database triggers on personal/fund records now retain every prior Closed opportunity exactly once and unchanged. An identical Closed resave also retains its original attribution and timestamp. Legacy omitted defaults survive; active opportunities can still change, close, reorder and coexist with new rounds. A fresh investigator and a separate fresh candidate reviewer checked the narrow boundary; no concrete in-scope bypass or regression remained.

- `git diff --check` and Python compilation pass. All **114 backend tests** pass in a fresh full run; the four new helper tests and ten decision-loop tests also pass independently.
- Actual Supabase rollback checks pass **199/199** after the migration: owner isolation 12, fund access 21, provider budgets 8, frozen research 102 and completed holdings 56. The new matrix tests both an owner and a granted fund Reviewer. It rejects field rewrites, reopening, deletion, malformed collections and duplicate identity shadowing; failed writes preserve data, revision and audit. Legitimate active edits, closure, new rounds, reordering and identical resaves pass.
- Both affected Edge browser workflows pass against the refreshed API: decision/observation memory and fund access/revocation. No frontend source or dependency changed, so the immediately preceding production build, frontend unit and visual/accessibility results below were not repeated.
- The dedicated project's migration is applied as `20261004075637_protect_completed_holdings`, matching the local filename. Security/performance advisors report no WARN/ERROR. Private-table RLS and four unused indexes remain informational entries; no permissive policy or speculative index deletion was introduced.

The normal preview configuration is restored. No private Gemini file inspection or change, live AI request, deployment, purchase or outreach occurred. This verifies completed-opportunity UPDATE integrity; it does not certify source authenticity, every referenced source, privileged administrator actions or a complete correction/retention system. The Excel runner discrepancy and production release gaps below remain open. Full strategy, changed files, exact validation commands and limits are in the [managed security finding](C:/Users/srnan/.codex/state/plugins/codex-security/scans/vc-scope-os/artifacts-bee63c3d2d3e1c6077dd0dbda35c9042f758f076d2c116e679fa40cf2869fba5/findings/completed-holding-integrity.md).

## Final check requested by the user — 4 October

Verdict: the current local build passes the tested investment workflows. This does not establish readiness for a public production release or factual correctness of every investment judgment.

The story checked was: a user signs in, captures company/source context, reviews evidence and diligence, freezes a model/memo, records a decision, then reviews new observations or changed premises under the correct record permissions.

| Boundary | Result and evidence |
| --- | --- |
| Build and code checks | Production build passes TypeScript and generates 39 routes; workspace ESLint and `git diff --check` pass. |
| API/data behavior | All 110 backend tests pass in a fresh full run; all 13 frontend tests pass. |
| Browser → API → stored record → UI | All 13 Edge browser workflows pass in a fresh full run, including native downloads, reviewed drafts, monitoring, frozen history, fund access/revocation and both themes. |
| Database authorization/integrity | All 143 actual Supabase rollback checks pass again: owner isolation 12, fund access 21, provider budgets 8, frozen history 102. Synthetic fixtures are rolled back. |
| Inspected visual/accessibility states | 64 ecosystem plus 20 public-page checks pass in both themes at 1440/390px. No detected Axe violations, document overflow or captured page errors in these states; logo assets return 200. This does not substitute for human screen-reader/zoom or investor acceptance. |
| Frontend production dependency advisories | Read-only `npm audit --omit=dev --audit-level=high --json` succeeds with zero known advisories. Development dependencies, Python dependency advisories and a whole-product security certification are not covered by this result. |
| Supabase security advisor | No warning/error findings. The one informational [RLS-without-policy entry](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) is the intentionally private `vc_private.work_allowances` table; no permissive policy was added. |
| Cold start and authentication | The preview was stopped at the beginning. It was rebuilt/restarted; the sign-in page returns 200 and unauthenticated workspace access returns the expected 401. |

No new application failure was found in that earlier sweep; the follow-up above subsequently found and fixed the completed-investment database mismatch. No functional code, dependencies, private configuration or real research was changed during the earlier sweep. Test fixtures use the rules provider; no live AI request was made. The production dependency check initially could not reach the advisory endpoint from the restricted network, then succeeded with the read-only audit permission and a workspace-local cache.

The existing Excel verification limitation was investigated further without changing the exporter: all import/recalculation/link assertions complete; Node logs `exitCode: 0`, `beforeExit: 0` and `exit: 0`, while the command runner still reports code 1. This discrepancy remains visible rather than being converted into a clean command pass. Native Microsoft Excel application acceptance remains unverified.

Release gaps remain: live AI/source integrations and their data rights; real cloud Auth/API/browser/export/revocation checks; shared file/index/job permissions; complete retention/deletion and work reassignment; actual account-scale/hosted performance; AI support/usefulness evaluation; and independent investor/accessibility acceptance. Cloud fund access remains disabled by default. See [ECOSYSTEM_STATUS.md](ECOSYSTEM_STATUS.md) for the full requirement map. The local preview is restored to the ordinary backend configuration after QA; no private-key file inspection, deployment, purchase or outreach occurred.

## Ecosystem milestone — 4 October

The 31-page blueprint and the user's 30 answers are mapped to delivered behavior and remaining boundaries in [ECOSYSTEM_STATUS.md](ECOSYSTEM_STATUS.md). This is a tested local milestone; it is not a complete production ecosystem, investor acceptance or security certification. Earlier sections below retain historical counts.

- All 110 backend tests pass in the final full run. Coverage includes decision-loop, fund-access, operating-forecast, paging and frozen-history cases. An intermediate run exposed an obsolete cloud-save mock without stored record data; the fixture now supplies a valid record and specifically requires the expected stale-revision HTTP 409. All eleven platform cases also passed in the focused rerun.
- All thirteen frontend Node tests pass. The 39-route production build passes TypeScript and scoped workspace ESLint passes.
- All thirteen Edge browser workflows passed in one full run. After the final role controls, ARR-year labels and backend integrity changes, four affected workflows passed again: fund access/revocation, source-aware model comparison, out-of-order discovery responses and operating forecast/diligence review.
- The new ecosystem audit passed 64 Axe/layout checks: sixteen page/editor states, both themes and desktop/phone widths (1440/390px). No detected WCAG A/AA violations, document overflow or captured page errors occurred in those states. Desktop monitoring and phone forecasting were visually inspected. This is separate from the historical audits; counts are not combined into a fresh whole-product audit.
- Actual Supabase rollback tests passed 143 checks: twelve owner/isolation, twenty-one fund access, eight provider budgets and 102 frozen-record checks. Synthetic users and research were rolled back; no emails were delivered. After the new guard, the earlier owner/fund/budget suites passed again. The security advisor returned no warning/error findings; the private work-allowance table intentionally has no client RLS policy.
- A direct authenticated database memo rewrite was reproduced, then fixed with a shared ordered-prefix guard on personal and fund records. The original rewrite, removal, reordering and malformed history replacements are now rejected, while new versions and mutable review fields remain writable. A fresh boundary investigator and a fresh candidate reviewer checked this narrow patch. The reviewer caught the outdated mock; no in-scope bypass was found.
- The native Excel operating forecast was exported from an isolated in-memory fixture, imported through the bundled spreadsheet engine, recalculated and rendered. Year-two revenue/ARR/gross profit/contribution matched 1,800,000 / 2,640,000 / 1,440,000 / 240,000. Changing first-year ARR growth from 10% to 20% changed linked return-model ARR to 2,880,000, Base MOIC from 1.21175x to 1.32191x and Base IRR from 16.618% to 24.388%. All value/link assertions completed and the three resulting renders were inspected. The bundled engine still returns exit code 1 after this completed output without an accompanying error; this is a runtime verification limitation, not a clean command pass. Microsoft Excel application acceptance remains unverified.

The Excel import exposed prefixed OPC package XML that the engine rejected. Export serialization now uses default package namespaces without changing process-global namespace registrations; import/recalculation then completed. An automated test verifies the operating worksheet's package declaration and the return ARR cross-sheet formula. Negative gross margins, separate ARR/revenue growth, zero revenue and excessive compounded values are covered by deterministic tests.

QA used the rules provider, synthetic accounts and scoped records. No live Gemini request occurred; the private configuration file was neither read nor changed. Existing real-company research and frozen documents were preserved. The login throttle remains five attempts per minute; its 429 response now advertises a cooldown, and only the test signup helper retries that confirmed cooldown. Runtime start commands use the already intended 30-second keepalive to avoid intermittent development-proxy connection resets.

Release gates still include real cloud Auth/API/browser permissions, shared file/index/job access, licensed discovery/news feeds, OAuth synchronization, complete retention/deletion and reassignment, AI usefulness/cost evaluation, actual account-scale and hosted performance, screen-reader/zoom and independent investor acceptance. Cloud fund access remains disabled by default. No deployment, purchase or outreach occurred; remote CI and Docker execution were not observed.

## Historical milestones

## Whistle rename verification

The user renamed the product Whistle. Shared wordmark/accessibility labels, sign-in/signup, public pages, browser title, workspace footer, presentation copy, export branding and download filenames now use Whistle. Original repository/PDF references, private configuration paths, stored preferences and stable calendar UIDs retain their compatibility identifiers. Existing research and frozen records were not rewritten.

The 39-route production build passes TypeScript. Four existing targeted backend tests pass for version-bound PDF/PPTX/XLSX, export permissions, calendar escaping and current/frozen review-pack separation. The updated public audit passes 20 automated accessibility/layout checks across five pages, both themes and desktop/phone widths, asserting Whistle metadata/wordmark and absence of the former visible name. Sign-in branding was inspected visually; no overflow, captured page errors or detected accessibility violations remain in these inspected public states. The local frontend/backend preview was restarted with the updated files. No deployment or private-key inspection occurred.

## Current product assessment and risk workflow verification

PRODUCT_ASSESSMENT.md records the evidence-backed product gaps, their consequences and measurable execution gates. This milestone implements the managed risk loop from the blueprint without claiming that the remaining release gates are complete.

- All 85 backend tests pass. Four new cases cover creation, mitigation/reopening, unchanged claims and frozen memos, new memo snapshots, invalid/foreign links, forged reviewer fields, permissions, stale revisions and legacy fingerprint compatibility.
- Nine frontend regression tests pass, including independent due-risk obligations and their actual review questions.
- The final 39-route production build passes TypeScript, and scoped workspace ESLint passes.
- Ten distinct Edge browser workflows pass across a full regression run and the final targeted risk run. The full run passed the nine established workflows; the risk flow was repaired and rerun separately. It covers a frozen model/memo, a new due risk, Today deep linking, mobile source-backed mitigation, reload/filter persistence, removal of only the risk obligation, a remaining conflict obligation and unchanged earlier memo text.
- The final studio audit passes 52 Axe checks across thirteen views in both themes at 1440/390px, including open and mitigated risk editors. The workspace theme audit passes 60 page layouts and 52 Axe checks; the final public audit passes 20 layouts and 20 Axe checks. These total 80 page layouts and 124 automated accessibility checks, with no detected document overflow, captured page errors or WCAG A/AA violations in the inspected states.
- Desktop and phone risk editors were visually inspected. Native input styling found during review was brought into the shared light/dark design and the final studio audit rerun.

An intermediate risk test exposed a real close/reload race: a saved deep-linked editor could reopen before its URL changed. Closing now waits for query navigation/remount, and the final test verifies the cleared URL and reload. Test-only repairs also corrected setup that attempted a Watch memo before freezing a model, an ambiguous conflict-button locator, and inconsistent DOM text serialization in the frozen-memo assertion. The final end-to-end risk test passes without weakening those workflow requirements.

Browser writes used isolated synthetic accounts. Existing user research and frozen documents were preserved. QA temporarily selected the deterministic rules provider in the test process; the private Gemini file was not read or changed, and no live model request was made. The ordinary local backend configuration was restored after checks. No deployment, purchase or outreach occurred.

Real discovery data, claim-support evaluations, operating ARR paths, team workflows, realistic account-scale measurements, hosted operational validation and independent investor/user acceptance remain open. Automated checks do not establish screen-reader or actual browser-zoom acceptance. See PRODUCT_ASSESSMENT.md and BLUEPRINT_ACCEPTANCE.md for release gates.

## Historical blueprint, brand and language verification

All 31 pages of the original PDF were reread. The current page-by-page table in BLUEPRINT_ACCEPTANCE.md replaces the stale initial assessment; the dated milestones retain their historical counts. BRAND_AND_CONTENT.md explains the shared vector logo, copy changes, corrected public information pages, the missed return-calculation requirement and remaining release gaps.

- The final Next.js 16.3.8 production build passes TypeScript and generates 39 routes (including the new SVG and Apple icons). Scoped ESLint passes for workspace components, authentication pages/layout, the root layout and all five public information pages.
- All 81 backend tests pass after the IRR solver changes. The three model-review tests also pass after the final scenario-specific error explanation and atomic-rejection assertion. Three new analytical return cases cover an unclipped high one-year IRR, a near-total-loss rate and undefined terminal flows. Old frozen models are not recomputed.
- Eight frontend regression tests pass.
- All nine Edge browser workflows pass in one full run (1.1 minutes) after the copy/brand/calculation changes. The model flow inspects a selected older frozen version’s Base inputs, 8.26x MOIC and 61.78% IRR on mobile, excludes the newer rationale, and inspects the sensitivity cell without inventing an IRR. Other flows cover source intake, durable research, scheduling, outcomes, native artifacts, memo review, working views, keyboard controls and cross-tab themes.
- After the final phone-header and calculation-heading CSS adjustment, the production build and all three visual/accessibility audits pass again: 60 workspace page layouts plus 20 public page layouts; 52 theme + 44 studio + 20 public Axe checks = 116 automated accessibility checks. No document overflow, captured page errors or detected WCAG A/AA violations remain in these checks. The studio audit includes the new calculation drawer in both themes at desktop/phone widths.
- The public audit also verifies the five information pages return 200, shared brand/accessibility labels and navigation are present, obsolete fabricated claims are absent, and SVG/ICO/Apple assets load. Desktop/phone sign-in, public pages and calculation drawers were visually inspected.

An intermediate public audit exposed inherited white heading text on the light canvas. Explicit theme text colors repaired it. An intermediate full browser run hit the existing sign-in limiter while other signup audits ran concurrently; the isolated full rerun passed after restarting the owned local test service. No rate-limit protection was weakened. Visual review then caught hidden mobile wordmark and excessive empty header space; both were fixed and re-audited.

Reproduce with:
```powershell
.\venv\Scripts\python.exe -m unittest discover -s tests -v
node --experimental-strip-types --test frontend/tests/*.test.mjs
node scripts/verify-theme.cjs
node scripts/verify-studio.cjs
node scripts/verify-public.cjs
# From frontend, with the running local preview:
$env:E2E_BROWSER_CHANNEL='msedge'
npm run test:e2e
npm run build
```

Synthetic accounts alone were used for browser writes. Existing user research, sources, decisions and frozen documents were preserved. Private Gemini configuration was not opened; no new credential, live provider request, cloud mutation, deployment, purchase or outreach was required. The final preview remains running at http://127.0.0.1:3000/ with its backend on port 8000.

The real flagship investment case, independently reviewed financial inputs, operating ARR paths, editable risks, outcome learning, fuller relationship workflows and task planning remain open. Actual browser zoom, screen-reader and timed novice/investor acceptance are not established by automated audits. Live/hosted integrations and final hosted privacy/contact/deletion arrangements are also unverified. These results do not establish a finished portfolio-ready release.

## Historical verification

The sections below preserve earlier milestone evidence; their counts and pending statements are historical.

## Latest quality and model review checks

The current production build passes TypeScript for 37 routes and `npm run lint:workspace` passes. All 78 backend tests pass; the three model-review cases were rerun after adding assertions that the new Excel export contains the new rationale while the old memo-linked export excludes it. Eight frontend tests pass, including readable validation/network/timeout messages and retained abort behavior.

Nine distinct Edge browser workflows pass across the latest full run and targeted rerun. The latest full run passed eight flows; its new model-review flow exposed an overly exact label-text locator after reload. Changing that test to the observed named combobox role required no application change. Both model-review/search flows then passed in the targeted rerun (9.5 seconds). Existing flows cover authenticated onboarding, durable research, source capture, scheduling/calendar/outcomes, diligence, frozen memo versions and native downloads, view recovery, keyboard navigation and cross-tab appearance. The new flows cover source-linked assumption notes, empty numeric input, frozen v1/v2 comparisons, persistence and selected older version at 390px, and an intentionally delayed superseded search response.

The final theme audit passes 60 layout checks and 52 automated Axe checks. The expanded studio audit passes 40 Axe checks over ten views in light/dark at 1440/390px, including both new model dialogs. No document overflow, captured browser errors or detected WCAG A/AA violations remain in those checks. An earlier run caught 14px overflow caused by adjacent frozen-model buttons; grouping the actions in a wrapping layout resolved it. Desktop/mobile model comparison and assumption-editor screenshots were visually inspected in both themes. These automated checks do not substitute for assistive-technology, actual browser-zoom or first-time investor/user validation.

Local performance measurements show approximately 40% less initial JavaScript transfer after unconfigured monitoring/analytics code was removed from the initial load path. PRODUCT_QUALITY.md records routes, bytes, timing, public product references, reproducibility and limits. The final preview runs on ports 3000 and 8000. Repeated test sign-ins triggered the existing production login limiter during an intermediate run; restarting only the local test backend reset that temporary in-memory window. No rate-limit policy was weakened.

All new account records are synthetic and isolated. Existing user records and frozen documents were preserved; only newly generated screening punctuation changes. No deployment, outbound messages, new provider credentials, provider deliveries or hosted performance/security certification occurred.

## Latest decision workspace verification

The subsequent user-requested light/dark switch is verified in `UIUX_THEME.md`: six browser workflows, 60 layout checks across both themes, 52 automated accessibility checks, the production build and scoped lint pass. Appearance is the only new stored preference; backend and evidence behavior are unchanged.

The latest production build passes TypeScript for 37 routes. All 64 backend tests, six queue tests and five Edge browser workflows pass. Seven routes at 1440/1024/768/390px yield 28 checks without document overflow. Twenty automated accessibility checks detect no violations in the inspected desktop/mobile pages, authentication, evidence drawer and account menu. `UIUX_DECISION_DESK.md` describes the changes, reproducible checks, screenshots and remaining release criteria; earlier counts below are historical.

## Current platform verification

The previous milestone checks below are historical. Current checks include 48 backend tests, six queue tests, a Next.js 16.3.8 production build with TypeScript validation and 37 routes, scoped ESLint, and 12 rollback-only permission tests on the actual new Supabase database. The security advisor has no findings; performance warnings were resolved. Persistent local research completed in the browser and saved a pending draft without changing claims or decisions.

Two Playwright flows passed against installed Edge: a new AtlasOps research job completed, saved as a draft, disabled repeated saving and remained stable over multiple five-second polls; mobile evidence capture opened/closed within a 390px viewport. The API's 30-second keep-alive setting avoids the previous five-second proxy/socket race and is included in the Docker command, CI launch and local guide. The real Locus pending draft was separately inspected in the contextual assistant; it still awaits human approval.

Private Gemini/Firecrawl and cloud-worker credentials remain absent. Real email confirmation, Storage HTTP upload, Realtime delivery, telemetry delivery, Docker execution and remote GitHub CI/CD are not established. See PLATFORM_SETUP.md. The earlier statement that no database existed is superseded by the new Supabase project and its tested RLS policies.

## Initial demonstration checks

- Production Next.js build, including TypeScript validation and all 36 routes.
- ESLint for the new workspace components, workspace API types, authentication/workspace contexts, sign-in page and authentication layout.
- All 16 backend tests: sign-in and the complete first workflow, authentication requirements, account isolation, read-only permissions, self-role escalation prevention, duplicate initialization, claim/source integrity, canonical conflict review, stale revision rejection, append-only decisions, independent financial calculations, invalid model inputs, frozen model/memo snapshots, assistant approval and search exclusions.
- Browser walkthrough: demonstration sign-in → Today → saved founder search → reason/score/source inspection → pipeline → cited screen → diligence disposition with rationale and revisit trigger → evidence and decision history.
- Browser continuation: frozen financial scenario, frozen IC memo, assistant draft approved as a separate note, and persistence after reload.
- Desktop and 390px mobile rendering. The memo export toolbar wraps on mobile; model editing is reserved for larger screens.
- Final production preview: successful sign-in, persisted Today records, and no browser console errors.

The screenshot in `screenshots/today.jpg` is captured from the running local production preview.

## Not established by these checks

No live discovery connector, external model endpoint, background monitoring connector, production database, deployment or legacy-route certification was tested. Accessibility has keyboard/focus and responsive support but has not received a comprehensive assistive-technology audit. The financial model is a simplified equity scenario, with its exclusions visible in the interface.

See `LOCAL_PREVIEW.md` for launch instructions, demonstration boundaries and provider configuration.

## Blueprint follow-up verification

After the user's PDF reminder, all 31 pages were rechecked and mapped in `BLUEPRINT_ACCEPTANCE.md`. Project working instructions now preserve the PDF as the primary source of truth.

- Five review-queue regression tests pass: independent pending drafts/conflicts, older pending runs behind newer approved runs, threshold-based portfolio alerts, screen/decision ordering, legacy screens and signal freshness.
- The backend end-to-end test passes with persisted screening creation time.
- Changed frontend files pass ESLint and TypeScript; the updated production build passes.
- Browser verification confirms a new pending draft appears in Today and opens the correct draft with Diligence page context. Draft history remains selectable, closing the drawer clears the deep-link parameter, and the queue filter displays its corresponding item.
- The demonstration now retains one pending draft for review. No approved claims or decisions were changed by that run.
- Browser console contains no errors. `screenshots/blueprint-review-queue.jpg` shows the verified local result.

The open requirements in the acceptance register remain open; these checks do not establish a complete portfolio-ready release.

Final screenshot: `screenshots/platform-draft-review.png` shows the real Locus evidence context and saved draft awaiting approval. Final browser console inspection reported no errors.

## Connected diligence and frozen review checks

- Five additional backend tests cover sourced completion/reopening without changing claim review, invalid dates and company/source links, reader denial and stale revisions, frozen task outcomes and separate memo comments, selected-version decisions, owned ZIP exports, and evidence-only Pass memos without financial models. Existing authentication, financial calculation and job tests continue to pass: 48 total.
- The sixth frontend queue test covers independent due tasks, completed/future task exclusion and task-specific deep links.
- Three Edge Playwright flows pass: durable research draft persistence; mobile evidence capture; and editable task → Today → sourced completion → frozen model/memo → version comment → review ZIP download → reopened task → changed-research warning, including the mobile task drawer. These test records are explicitly fictional.
- The final production build and scoped lint pass. Copy-only refinements to memo reasoning and the empty risk register were checked in the real-record browser after the three-flow run.
- The actual Locus plan and evidence-only Pass memo were inspected separately. Latest downloaded package: revision 14, memo 3, ten archive entries, no frozen financial model, matching current research fingerprint. ZIP integrity and manifest versions were checked through the local authenticated API. This proves the source-based rejection case; it does not prove missing financials or independent founder verification.
- Edge's UI download test passed. The IAB download-event interception timed out without returning a file path; the local API export provides the inspected real archive. The final IAB console has no captured errors. `screenshots/connected-diligence.png` shows the saved plan.

No new cloud migrations, business-record writes, deployment, external provider requests or paid-service changes were required for this milestone. PDF/XLSX export, live integrations and the blueprint's independent research/user acceptance criteria remain open.

## UI and UX redesign checks — 3 October 2026

The 37-route production build and TypeScript pass, with zero scoped workspace ESLint errors or warnings. The three Edge flows passed after the main redesign; later copy, metric-link and CSS refinements were checked manually in the final production preview. Saved searches, two-active-advanced-filters indication, source drawers, Research-only filtering, and Overview links to Evidence/Diligence/Model work. Discover has no horizontal document overflow at 390/768/1024/1440px; Library was fixed and rechecked at 390/768px. Mobile Run search is 44px high. Global search cycles focus in both directions, closes with Escape, and restores trigger focus and background scrolling. The final browser console error log is empty.

Screenshots: `screenshots/ui-discover-desktop.png` and `screenshots/ui-library-desktop.png`. Public competitor research and remaining accessibility/user-validation requirements are recorded in `UIUX_REDESIGN.md`. No deployment or live-provider validation was performed for the redesign.

## Guided exploration and frozen memo reader

All four Edge workflows pass across the full run and targeted rerun. The three existing tests passed in the full run; the additional guide test passed after correcting its exact-label locator to the observed combobox role. It verifies glossary content, native Escape/focus/scroll restoration, original saved memo text, version 1 citation scope, demo source disclosure and 390px boundaries. No application change was needed for that locator correction. The final production build and workspace lint pass; the final glossary addition is copy only. Real Locus memo versions 1 and 3 were inspected separately without writing to the company. Further viewport and final screenshot checks are recorded in `UIUX_EXPLORATION.md`.


## Sourcing and review studio verification — 3 October 2026

The final local production build generates 37 routes and passes TypeScript and scoped workspace ESLint. All 75 backend tests pass; the 11 new workflow tests were rerun after the final workbook source formatting changes and pass. Six review-queue tests pass. New backend cases cover owned/read-only boundaries, stale revisions, UTC scheduling, linked-question/memo integrity, outcome/reopening, escaped UTF-8 calendar fields, profile validation/identity/deduplication, manual preview without network or writes, new frozen memo reasoning/citation scope, version-bound PDF/PowerPoint/Excel and literal spreadsheet text.

The final source/theme styling passed 60 layout and 52 automated Axe checks, with no document overflow, browser errors or detected WCAG A/AA violations. The additional studio audit passes 32 checks over eight views at desktop/phone widths in both themes: Discover, founder research, source journal, people map, meeting brief/editor, memo editor and prepared presentation. All testing uses isolated fictional accounts. Earlier full-flow runs exposed keyboard timing/focus preconditions; shortcut listeners now attach before paint, and the test establishes the interactive All items queue before pressing J/K. The isolated shortcut journey passes. The final full browser result is appended below.

Artifact checks use a synthetic frozen AtlasOps record. The PowerPoint package integrity tool reports pass (22 slides, zero structural findings); all 22 rendered slides and the three-page PDF were inspected. The workbook's recalculated MOIC/IRR match the independently tested app scenarios; doubling the editable base ARR doubles MOIC and raises IRR, leaving other scenarios unchanged. The Model and full Sources previews were inspected. Native input styles are unlocked, formula cells protected, and native validation rules present. Source text remains literal, including formula-like strings. The bundled artifact renderer produced its images and completed numeric assertions but exits with status 1 during its runtime lifecycle; that helper command is not counted as a passing command. These checks do not establish native Microsoft Office execution or accessibility of Office documents.

No live model/search/LinkedIn/financial-data feed, calendar synchronization, outreach, hosted release or publication is established by these checks. Real-record financial validation, two-user timed acceptance, assistive-technology/browser zoom and hosted platform checks remain open. See UIUX_REVIEW_STUDIO.md and BLUEPRINT_ACCEPTANCE.md.


Final full Edge run: **7 passed (1.7 minutes)**. It includes the new source capture → meeting/calendar/outcome → model → memo v1 deep link → analyst v2 → PowerPoint/PDF/Excel download → reload journey, durable research jobs, mobile capture, sourced diligence and selected review ZIP, frozen-source exploration, navigation/keyboard/view recovery and light/dark cross-tab persistence. The final production preview is running on port 3000 with the updated backend on port 8000. No deployment occurred.

## Industry research, returning accounts and security containment — 5 October 2026

The final isolated backend run passes **153 tests**, including three token-migration boundaries, returning-account persistence, concurrency allowances, stored-record containment and sourcing authorization. This run explicitly asserts use of PyJWT 2.15.1; earlier ambient-package checks are not counted as verification of the pinned candidate. **15 frontend tests** pass. The latest production build passes TypeScript and generates **40 routes**; scoped frontend lint passes. The missing generic `npm test` script was followed by the actual `node --test tests/*.test.mjs` command. No new full browser automation or automated accessibility certification is claimed for this increment.

A full run initially failed the five-active-jobs test with six total admissions. A returning-account test had entered startup without isolating the startup database or disabling the embedded daemon worker. A leaked worker could complete synthetic jobs and free active slots during the later test. The fixture now uses its own startup engine/session factory and external worker mode, and asserts the worker was not started. The two tests pass together, and the corrected full suite passes. Independent instrumentation plus ten fresh SQLite concurrency fixtures preserved five queued admissions. Production admission code was left unchanged; PostgreSQL concurrency was traced but not executed locally.

The security review validated an authorized shared-record availability boundary. Invalid required fields, domain/time semantics, frozen consumer shapes and finite-number coercions are now separated into safe quarantine metadata; valid workspace/search/intake records remain available. Direct invalid-record consumers return a safe repair response. Reader/outsider permissions, retained history and fund access administration remain covered. No existing damaged row was overwritten or deleted. A fresh final containment reviewer was stopped by a cybersecurity content filter after identifying the finite-number gap; parent regression tests close that gap, but complete independent review remains unavailable.

The resolved Python advisory audit initially found the `ecdsa` advisory through `python-jose`. The affected EC signing operation was not demonstrated as reachable in Whistle's HS256/cloud-auth paths. All three requirement sets now use PyJWT[crypto] 2.15.1 instead. Final resolved API/development audit: **55 packages, zero known advisories, no ecdsa**. A fresh independent read-only source review found no token-migration bypass or regression. Frontend production audit: zero known advisories. The final source/filename credential check inspected **293 files**, flagged none and never opened private settings, key files or databases. It is not a Git-history or exhaustive secret audit. The global Python environment was not modified.

Browser checks confirm Discover → Deal sourcing → Industry research, optional research controls, clear provider consent, five actual public GitHub references, retained 13 existing companies after restart, explicit last founder response versus source capture, and portfolio holdings separated from approvals. Industry controls have 44px touch targets; Discover/Pipeline/Portfolio did not overflow at the tested normal viewport, and research did not overflow at 390px. Public provider references remain unverified leads; no company, claim or decision was automatically saved. Screenshots: `screenshots/whistle-industry-research.jpg` and `screenshots/whistle-industry-research-phone.jpg`.

Supabase metadata checks confirm a healthy project, RLS on all 11 application tables, a private 20MiB evidence bucket, and no anonymous/authenticated table grants on private allowance tables. Those metadata checks do not establish actual two-user hosted requests. Cloud signup/confirmation/reset, grounded Gemini cloud answers, live worker/storage/telemetry and authorized licensed integrations remain acceptance gates. Firecrawl chat credits are exhausted and its runtime key is not configured; X/Apollo/LinkedIn/calendar synchronization are not established. No credential file was opened, no persistent QA account created, no user records migrated, and no GitHub push or Vercel deployment occurred. See RELEASE_READINESS.md for operator steps and remaining production gates.


## Integration status and admission cross-check — 5 October 2026

Pages 5–10, 15 and 26–30: all 18 catalogue entries were checked against account policy and runtime configuration. Misleading connection/index/worker labels were corrected. Shared capability checks reject unavailable jobs before persistence, and connection/file/job failures load independently. Cloud Compose now aligns API and worker job storage. No hosted permission was broadened.

The full isolated backend suite passes 184 tests with pinned PyJWT 2.15.1; 15 frontend tests, scoped lint and the 40-route production build pass. A live semiconductor search reached both official public Product Hunt/GitHub adapters; it produced no matching recent Product Hunt launches and unverified repository references. Supabase metadata confirms a healthy project, RLS/policies on all 11 application tables, private evidence storage and deliberately restricted internal allowances. Gemini requires cloud sign-in; Firecrawl has no app runtime key and separate chat credits are exhausted. Live cloud login/recovery, two-user HTTP isolation, calendar, storage, indexing/worker delivery, telemetry and hosted/container performance remain separate acceptance gates. Full findings and screenshot: INTEGRATION_CROSSCHECK.md. This does not complete every PDF release criterion or certify production security.

## Sign-in feedback and logo navigation — 5 October 2026

The returning-user failure was diagnosed using only the named account's confirmation/block status and sign-in timestamps, plus aggregate provider error codes and HTTP statuses. Earlier failed password grants returned `email_not_confirmed`; later grants succeeded. The browser reached the authenticated homepage and retained the session after the local frontend restart. No password, saved browser credential, private settings content, token or authentication request body was inspected or changed.

Cloud sign-in now distinguishes email confirmation, invalid credentials, throttling, network/timeouts, account restrictions and email-service restrictions using safe error-code guidance. An unconfirmed-email failure offers user-triggered confirmation resend; recovery also uses safe guidance. Unknown provider messages are never rendered. Email input is trimmed without changing the password. Switching modes hides/clears the password and dismisses stale feedback; mode changes are disabled while a request is pending. No confirmation email or recovery request was sent during this verification.

Every shared Whistle logo now links to `/`, including authentication/public screens, with an accessible home label and a Go to homepage tooltip. A real browser click from Library returned to the authenticated Today homepage. Navigation preserved the existing logo asset, alignment and account records.

Verification: all 20 frontend tests pass, including five auth feedback cases; scoped lint and the final 40-route production build/TypeScript pass. The local website was restarted with the final build. Screenshot: `screenshots/logo-home-verified.png`. Live confirmation resend and password recovery delivery were not exercised; their UI uses the documented Supabase methods. Backend code and cloud security settings were unchanged by this fix.

## Native dropdown readability — 5 October 2026

The user-reported Discover Geography/Stage menu issue was reproduced in computed styles: native options inherited ivory text with a transparent background, allowing Windows to draw a white popup behind them. The shared palette now supplies an explicit, paired option/optgroup foreground and background in both themes. Dedicated inherited tokens keep option colors paired even inside dark chrome. Existing native selection, keyboard behavior, filters and layout remain.

The final 40-route production build/TypeScript passes. A fresh authenticated Discover tab checks 33 option items in each theme: minimum computed text/background contrast is 14.04:1 in dark mode and 15.70:1 in light mode. Geography India and Stage Seed selections were exercised and restored to All without running or saving a search. Dark mode was restored. No records or account permissions changed. The local preview is running with the updated build; a previously cached in-app error tab required a fresh preview tab. Screenshot: `screenshots/dropdown-contrast-verified.png`. The browser screenshot API does not include the operating-system popup itself; the evidence combines the corrected option colors, contrast measurements and successful native selections, rather than claiming a screenshot of the Windows popup.

## Today overview and separate Reviews — 5 October 2026

The previous Today controls changed an inline queue or selected a preview rather than opening work. Its category strip and tall inner queue required extra scrolling. Following the user's explicit choice, `/reviews` now owns the complete queue. Today has a daily overview with four linked counts, three directly openable priorities, meetings/follow-ups and a five-record pipeline snapshot. A contextual Daily overview / Reviews navigation retains the five main destinations; workspace search can also find Reviews. Company guidance remains available in an optional disclosure.

Reviews offers category selection with counts, company/question/owner search, direct title and Open review links, clear/no-match recovery, category URLs that survive refresh, and 25-item pages. Opening a review does not mutate its record or resolve its obligation. Existing claim, draft, task, risk, condition and monitoring destinations are retained. The conflict metric explicitly counts companies with conflicts, rather than claiming to count individual conflicting claims.

Verification: all 23 frontend unit tests pass, including category URL handling, combined case-insensitive search, independent obligations and a 57-item pagination fixture with no omissions/duplicates. Scoped lint passes for changed components, route/helper and affected browser specifications. The final production build/TypeScript passes with 41 routes. Existing browser specifications were updated for the new destination; their account-creating suites were not rerun against the live account/backend.

Read-only browser checks on the existing authenticated account confirm seven reviews across four companies, four conflict rows, AtlasOps searches returning one filtered conflict or two unfiltered obligations, zero-result recovery, empty draft categories and retained URL filtering after refresh. Open review navigates to AtlasOps Evidence; Schedule review opens the company chooser and was closed without saving. Both Today and Reviews remain within a 390px viewport in light/dark mode; review links and filter inputs have at least 44px height. Theme and viewport were restored. The final local preview was restarted; screenshots are `screenshots/today-overview-verified.png` and `screenshots/reviews-page-verified.png`.

No company records, accounts, credentials, permissions or integration settings were changed. Meeting expansion beyond five, pagination beyond 25 in a live account, and independent first-time-investor acceptance remain unobserved. Backend security, provider delivery and hosted acceptance were not rerun by this UI change.
