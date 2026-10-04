# Brand, language and blueprint review — 3 October 2026

All 31 PDF pages were reread from the original source, with relevant design and artifact pages rendered for visual inspection. The current page-by-page table in BLUEPRINT_ACCEPTANCE.md now incorporates the earlier milestones. Historical milestone counts are retained as historical evidence, not presented as the current state.

## A consistent identity

The user renamed the product **Whistle** on 3 October 2026. The shared vector mark uses two square brackets framing a central diamond, representing a focused company record with evidence at its center. The same mark appears on authentication, workspace navigation, SVG browser icon, multi-size favicon and Apple touch icon. The wordmark reads “Whistle” with the descriptive subtitle “Investment research”. It retains the blueprint’s navy, white and blue palette, and works in both themes.

Sign-in/signup, public pages, browser metadata, navigation, presentation copy, PDF/PowerPoint/review-pack branding and download filenames use Whistle. Original blueprint and repository names, private configuration paths, theme/view preferences and calendar event UIDs retain their compatibility identifiers. No saved company research or frozen memo content is rewritten by the rename.

Source: frontend/src/components/workspace/Brand.tsx and frontend/src/app/icon.svg. scripts/build-brand-icons.cjs rasterizes the authored SVG for native icon formats; it does not alter uploaded user images.

## Clear language

Headings and actions now name the work:
- “Make your next move” → “Your research desk”
- “Find a founder. Follow the signal.” → the saved-company research workflow
- “A number needs a reason.” → “Why this value?”
- “Your founder map” → “Founder directory” (it is a list, not a relationship graph)
- “Signal journal” → “Source journal” (ordered by capture date, not represented as a live news feed)
- Provider-specific sign-in labels → “Use cloud sign-in” / “Use local preview”

Authentication explains company research, evidence review and investment notes. Empty states identify the missing record and a concrete next step. Supporting descriptions distinguish saved-record search from external discovery, manual profile notes from LinkedIn access, and forecasts from verified facts. User-entered research and existing frozen memos are not rewritten.

The five public information pages share the brand and appearance controls. The old copy claimed automated sourcing/live meeting analysis, invented a support email, and asserted unestablished vendor retention, security and deletion guarantees. Those claims were removed. These pages now describe the implemented preview, browser storage and optional processing accurately; hosted legal policies/contact/deletion arrangements remain unfinished release requirements.

## A missed calculation requirement

The PDF requires every material KPI to expose its evidence or calculation. Model return cells, ownership/invested-capital summary and sensitivity cells now open “How this return is calculated”. The drawer uses the selected frozen model, preserves its source snapshot, displays the actual inputs/formulas and scenario cash flows, and explains projection uncertainty. Sensitivity cells show their stored MOIC and derived proceeds; they do not invent a stored IRR.

Tracing the calculation found two IRR edge cases. A fixed upper search bound clipped extreme valid returns, and scenarios with no positive terminal cash flow could show an invalid rate. The solver now expands its upper bound, supports smaller valid loss rates, and rejects undefined or numerically unresolvable IRR with a scenario-specific explanation. The API rejects the request before saving any new model. Old frozen models retain their original snapshots.

Independent analytical tests cover a 499,999 annual IRR, a −99.999999% rate, and undefined one/two-year terminal flows. The standard sample still returns 8.26x / 61.78% for Base.

## Remaining blueprint requirements

The acceptance register tracks every page, including:
- independently reviewed flagship company, real financial inputs, 20-founder shortlist and 15–25-company thesis;
- operating ARR paths, INR display, editable risks, assumption ranges and all-KPI provenance review;
- relationship history/warm paths, match-reason rejection, outcome learning and decision-memory search;
- richer task-specific research planning, reviewed metric extraction and partial-import recovery;
- reusable Library/configurable stage editing, undo, matching skeletons and cross-account assignments;
- claim sampling, blind top-20 ranking, actual 200% zoom/screen-reader review, two venture users and timed demo acceptance;
- hosted provider/auth/storage/worker/telemetry validation and final privacy/contact/deletion arrangements.

Fund administration and autonomous LinkedIn outreach were explicitly deferred by the blueprint; their absence is not counted as a missing core feature. No live provider call, deployment, purchase, outreach, private credential inspection or real-record mutation was required for this change.

Current reproducible results and any failed/repaired checks are recorded in VERIFICATION.md. Automated checks do not replace real investor and assistive-technology validation.
