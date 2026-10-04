# Whistle workspace finish — 4 October 2026

The user asked for a professionally designed workspace because the previous interface felt generic. The user then explicitly selected a minimal Linear/Attio direction: dense deal rows, fewer panels and restrained colors. This revision follows that choice while keeping the PDF investment workflow.

## Design basis

The PDF remains authoritative. Pages 19–20 and 26–30 were reread for the official palette, five global destinations, company tabs, primary-action hierarchy and responsive layout. The user-approved 4 October palette supersedes the PDF colours: warm ivory `#F7F5F0`, white cards `#FFFFFF`, warm charcoal navigation/text `#242321`, stone supporting text `#68645E` and burnt orange actions `#A94425`. The optional dark workspace uses warm charcoal surfaces and readable copper links. The PDF remains authoritative for workflows and navigation. Evidence states retain their labels and semantic colors.

Public first-party pages from [Attio](https://attio.com/), [Linear](https://linear.app/) and [Affinity](https://www.affinity.co/product/crm) informed the emphasis on working records, compact navigation and clear hierarchy. These were public product references, not an authenticated inspection of those applications or a claim of equivalent functionality.

## Changes

- Shared workspace typography, spacing, navigation, tables and controls have a consistent finish. Desktop navigation remains labelled, intermediate widths use a rail, and phones retain the five-destination bottom navigation.
- Library references have a reading surface, a compact outline and numbered sections. All nine Library destinations remain accessible. Reference selections retain their deep links and saved preference. Templates remain labelled as examples rather than approved fund policies.
- Copy reference writes only the selected static reference to the clipboard. Its result is announced, and permission failure offers a manual-copy fallback. The action never reads the clipboard.
- Empty Today, Pipeline and Portfolio views introduce capture, evidence review and a recorded decision. Users can enter their own research or explicitly load the four fictional demonstration records; no demonstration is loaded automatically.
- Discover has a shared research toolbar for founder notes, source journal and founder directory. Saved searches and example query actions remain, with the company list closer to the top.
- Today uses compact, actionable counts and plain-language review titles. The selection preview, source inspection, shortcuts and next-review links remain intact.
- Pipeline now defaults to a compact Companies register. Slim decision tabs replace six oversized summary tiles. Company/founder, sector/stage, recorded decision, inspectable evidence, next step and owner share each row. A local search filters company, founder, sector, domain and owner; clear/no-match states work without a provider request.
- Board and People remain available. Their saved view preference is retained, including a previously selected Board. Board cards now have separate record, next-step and evidence actions rather than nesting interactions inside one link. Phone rows stack the same record fields without horizontal scrolling.
- The fixed example thesis block was removed from the sidebar; Investment thesis remains in Library. Saved research remains accessible. The boilerplate banner is shown only when the account actually contains fictional records, with per-record demo labels retained.
- Authentication has a quieter two-surface layout and three plain workflow rows. The local/cloud sign-in switch remains explicit. Empty-account copy is shorter, and Today counts are presented as flat filter controls.

Authentication behavior, investment calculations, permissions, frozen artifacts and provider settings were not changed for this visual revision. New browser checks use disposable synthetic accounts and the rules provider; no private Gemini configuration or real-account credential is inspected.

## Verification

Final production and browser checks are recorded in `VERIFICATION.md`. The browser coverage includes empty accounts as well as populated research and editable drawers. Automated accessibility checks are useful checks of the tested states; they do not establish full accessibility conformance or novice-investor usability.

## Remaining acceptance boundaries

The 4 October text-colour follow-up corrects prose and metadata that inherited orange link styling. Light prose stays charcoal; dark headings, body copy and supporting details use distinct warm neutral roles. Company descriptions, source excerpts, financial values and draft/memo prose stay readable, with coloured attention reserved for links/actions and labelled evidence states. Fresh theme/studio/ecosystem audits and the final-build Discover screenshot are recorded in VERIFICATION.md.

This is a local UI revision. Independent investor feedback, screen-reader and 200% browser-zoom acceptance, hosted performance and live integration acceptance remain open. It does not make the ecosystem production-ready or certify the quality of investment conclusions.

## Pipeline first-use follow-up — 4 October

Pipeline now has a direct Add company action instead of sending a new user to Discover. Its initial form asks for company name, website/domain and a founder or contact; other metadata sits behind More company details. Unknown geography, sector, funding stage and role remain explicitly unevidenced rather than receiving guessed defaults. The optional How Pipeline works guide explains the three review steps, every recorded decision and the difference between a view/filter and a saved decision. Invest remains separate from a completed transaction.

An empty Pipeline omits unused decision filters and view controls, with one primary add action and an explicitly labelled demonstration option. Read-only accounts receive an explanation. Once a company is added, the Companies view opens with that company visible. Unsourced records lead directly to Evidence; other next-step links open the company record. Unknown metadata reads Details not added. People is labelled Person / company because a contact is not necessarily a founder.

A partial company/Pipeline save retains the saved identity and offers a retry; it does not create another company. Existing canonical domains reuse the company without overwriting its research or recorded decision. Hidden invalid optional-detail fields are expanded when native form validation needs them. Visual review corrected inherited native field styling in both themes; the failed-save check caught and removed a duplicated error message.

A fresh-account browser journey verifies add → failed membership save → retry → reload → source and claim → reasoned Watch decision → reload → canonical-domain duplicate. It checks sixteen light/dark desktop/phone accessibility and overflow states, plus the final phone record. The observed test-label mismatch was corrected to include the visible mobile Next prefix; application behavior was preserved. Final regression results are recorded in VERIFICATION.md. These are automated checks with synthetic accounts, not an observation of independent first-time investors.

## Simpler everyday use — 4 October

The user explicitly requested a website that is easy to understand and use. An empty account now points to Pipeline's simple company intake through “Add your first company”, rather than sending a new user through discovery controls. The guide shortcut uses plain language.

Discover's founder research, source journal, directory and example searches stay under a closed “Research tools” control. Search, company entry and result views remain directly visible. Company pages keep their six tabs, next action and Record decision visible; meeting/presentation/memo shortcuts sit under “More tools”. Native details/summary controls provide keyboard access without adding state effects, network calls or a dependency. Tool drawers remain outside the disclosure container, so closing a menu cannot hide an active dialog. The company disclosure resets for a different company and preserves its open state across updates to the same record.

No investment behavior, provider permissions, original logo, palette or saved data changes. The React best-practices review checks unchanged hook ordering, bounded rendering, native focus behavior and TypeScript signatures. The studio audit verifies both open and closed states and the retained founder/memo/presentation paths; final browser workflow and theme results are in VERIFICATION.md. Independent first-time investor observation remains a release acceptance task.
