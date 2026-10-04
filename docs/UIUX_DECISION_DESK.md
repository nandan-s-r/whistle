# Decision workspace redesign — 3 October 2026

The latest request was to make the application less boring and easier to explore while preserving the connected investment workflow. The 31-page VC Scope Product/UIUX Blueprint v2 remains the source of truth, particularly pages 15, 19–24 and 26–30. This is a local product milestone, not a completed production release.

## Experience

- Today is a daily briefing with actual review counts, an actionable queue and a preview of the selected company/question. J/K moves keyboard focus through the queue. Its primary action opens the selected work rather than a generic landing page.
- The dark navigation includes active thesis context and direct links to actual workspace records. Five destinations and the six company tabs remain consistent with the PDF. Retired legacy-tool links and misleading availability copy were removed.
- Discover retains company tables, filters, source inspection and manual intake. Pipeline adds a board grouped by recorded decisions; its cards open the existing company record. It does not offer unsupported drag-and-drop stage changes. Missing founder details have a truthful fallback in the People view.
- Library has a clearer reading layout and addressable sections. Connections, thesis and source-policy links open their intended section.
- Company pages show the latest recorded activity. E opens evidence and M opens Memo, except when typing or another dialog is open. Evidence, diligence, model, memo, decision and monitoring remain the same connected record.
- Today, Discover, Pipeline, Library and diligence retain their view choices within the browser session, scoped to the signed-in account. The preference store contains only validated view names. Controls continue working when preference storage is blocked. Saved thesis searches remain separate durable records.
- Sign-in and signup share a simpler research story and labelled forms. Authentication validation and local/cloud distinctions remain intact. An account menu provides settings and sign-out at every viewport; Escape restores focus, and outside interaction dismisses it.
- Source and task drawers use native modal dialogs: background interaction is blocked, background scrolling is preserved/restored, Escape closes the panel, and scrolling content is keyboard focusable.
- Typography, spacing, control sizes, contrast and mobile layout were revised using the PDF palette and existing local Geist fonts. Reduced-motion preferences are respected. Demo records stay labelled and absent live integrations remain explicit.

## Public references

Only public product pages and documentation were researched; no proprietary signed-in interfaces were copied. Attio's object/list/view model informed the persistent working views ([Attio documentation](https://attio.com/help/reference/attio-101/attios-data-model/define-your-data-model-objects-lists-and-views)). Affinity's connected deal and company context informed the Pipeline/record relationship ([Affinity CRM](https://www.affinity.co/product/crm)). Harmonic's guided research pattern informed scoped questions and inspectable sources ([Harmonic Scout documentation](https://support.harmonic.ai/en/articles/11047921-scout-your-ai-research-agent)). Earlier broader references are recorded in `UIUX_REDESIGN.md` and `UIUX_EXPLORATION.md`.

## Verification

- Production build and TypeScript validation pass for 37 routes. Workspace and changed authentication/page/test files pass scoped ESLint.
- All 64 backend regression tests pass, including owner isolation, reader restrictions, immutable versions, provider privacy, webhook signatures, bounded uploads and durable provider quotas. Six frontend queue regression tests pass.
- Five Edge browser workflows cover durable research drafts; mobile evidence capture; editable diligence → Today → sourced completion → frozen model/memo → comment → owned ZIP export → reopened work; guide/frozen-source focus and original-text preservation; and shortcuts/view persistence/storage failure/mobile account controls.
- Seven workspace routes were checked at 1440, 1024, 768 and 390px: 28 combinations with no horizontal document overflow. Boards, menus and tables can scroll within their own regions. No captured browser page errors were found.
- Twenty Axe WCAG 2/2.1/2.2 A/AA checks pass with no detected violations across desktop/mobile workspace pages, desktop/mobile sign-in/signup, the evidence drawer and mobile account menu. Contrast, a missing mobile logo name, a small password toggle and an unfocusable drawer scrolling region found during review were fixed. Automated checks do not certify complete accessibility.
- Actual interface captures are in `screenshots/decision-*.png`, including Today desktop/tablet/phone, Discover, Pipeline, company, Library and signup. The local production preview is `http://127.0.0.1:3000/`; the backend stays on loopback port 8000.

Run `node scripts/verify-ui.cjs` from the repository root against the local frontend/backend to repeat the layout, keyboard, screenshot and accessibility checks. It uses installed Edge and creates a separate synthetic local account; it does not require or expose a private provider key. `DESIGN_BASE_URL` can select another local frontend address. Authentication remains rate limited, so do not run repeated account-creation suites concurrently.

## Boundaries

Human screen-reader testing, actual browser 200% zoom, two novice-user sessions and the PDF's timed investment/claim-sampling criteria remain open. Automated mobile and contrast checks do not substitute for these.

Private provider credentials, hosted email confirmation, live licensed discovery, Storage/Realtime/telemetry delivery, Docker execution and deployment remain separate unverified setup requirements. No keys were added to frontend code, and no deployment, push, paid provider request or real-company research edit was required for this redesign. PDF/XLSX exports, richer underwriting, approved prose edits and a suitable independently reviewed flagship case remain in the acceptance register.
