# Sourcing and review studio - 3 October 2026

This 3 October update connected founder notes, source review, diligence, financial models, memos and meeting preparation. It kept the work inside the company workspace. The warm palette later replaced the navy layout described here; the source and version-history rules still apply.

## Product changes

Discover combines a compact sourcing introduction and thesis shortcuts with the company table. Founder research / LinkedIn companion accepts an authorized public profile URL and notes, previews a deterministic verification plan, and captures a Missing claim only after explicit approval. URL canonicalization, duplicate detection and identity checks preserve the existing person record. The source journal sorts captured records, explicitly distinguishing capture date from event date; the founder map links reported backgrounds to evidence. Search recognizes known cohort phrases while preserving literal unknown names, and considers all recorded people.

Today and company Overview offer a review agenda. A meeting links company questions and a selected memo, saves an exact UTC instant from the analyst's local timezone, and retains agenda, outcome, owner and update sequence. Calendar files use stable event IDs and escaped/folded UTF-8 fields; no invitations or external messages are sent. Completion and reopening preserve the separate evidence review process.

Memo adds structured analyst judgment: why the company can win, counter-case, reversal condition, cited frozen sources and a change note. Saving appends a new version with its parent, original model and source snapshot. Cancel preserves selection; saving updates the version deep link so reload shows the saved revision. Current facts, decisions and original memo text remain independent.

The presentation panel prepares the selected frozen memo, exposes slide navigation and downloads editable PowerPoint with speaker-note references and a complete source appendix. PDF retains the full memo and frozen registry. Excel includes blue editable scenario inputs, ownership/proceeds/cash-flow/MOIC/IRR formulas, cached results, native validation, formula protection against accidental edits, and full dated source excerpts on a separate sheet. Long excerpts use continuation rows. Downloaded edits never overwrite the frozen app model. The review ZIP includes these native artifacts; evidence-only Pass cases receive no invented workbook. A 500-slide PowerPoint limit is explicit; PDF/text remain available for larger memos.

## Research used

The PDF is the authority. These primary product references informed the interaction patterns, not feature-parity claims:

- [Affinity CRM](https://www.affinity.co/product/crm): company context and preparation around the next conversation.
- [Harmonic](https://harmonic.ai/): people/company exploration and thesis-driven sourcing.
- [With Intelligence](https://www.withintelligence.com/): research context and source information.
- [Model ML workflows](https://modelml.com/product/workflows): connected research/document work.
- [Cap](https://cap.vc/): investment workflow continuity.
- [Original VC Scope repository](https://github.com/nandan-s-r/vc-scope-os): requested breadth, consolidated under the blueprint navigation.
- [LinkedIn user agreement](https://www.linkedin.com/legal/user-agreement): integration boundaries; this implementation uses user-entered notes, with no automated access.

## Verification and reproduction

Use the running production frontend on port 3000 and backend on port 8000:

```powershell
.\venv\Scripts\python.exe -m unittest discover -s tests -v
node scripts/verify-theme.cjs
node scripts/verify-studio.cjs
cd frontend
npm run build
npm run lint:workspace
node --test tests/review-queue.test.mjs
$env:E2E_BROWSER_CHANNEL='msedge'
npm run test:e2e
```

The studio checks use isolated synthetic accounts, not the user's private companies. They cover the source journal, people map, founder form, meeting brief/editor, memo editor and prepared presentation at 1440/390px in both themes. Screenshots use the `studio-*` prefix. The final build/lint, 75 backend tests, six queue tests, all seven Edge flows, 60 layout checks and 84 automated accessibility checks pass. The complete result and its limits are recorded in VERIFICATION.md.

Base templates in backend/assets were authored using the bundled artifact tool; native text/cells stay editable. scripts/build-deliverable-templates.mjs reproduces them using `@oai/artifact-tool` (or an ARTIFACT_TOOL_MODULE file URL). Pass `pptx` to create the presentation template, otherwise it creates the workbook. Production needs only the committed templates and ReportLab for PDF; no external rendering service receives records.

## Release boundaries

Working locally does not establish a production release. Discovery searches owned records; founder research is rules-based/manual. Live Gemini/search/people/funding connectors and cloud-calendar/email syncing are not configured or tested here. No scraping, messages, purchases, deployment or GitHub publication occurred. Hosted authentication/storage/telemetry, cloud-worker delivery, novice-user/timed tests, independent real-company financial review and full assistive-technology testing remain open in BLUEPRINT_ACCEPTANCE.md. Native Office applications were not used for the artifact review.
