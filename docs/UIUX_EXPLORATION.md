# Approachable research experience - 3 October 2026

The 3 October design goal was to help a first-time investor find a useful starting point, inspect a source and understand a memo. The public product references below informed those choices. The notes describe that version of the interface; later navigation and colour changes are recorded separately.

## Additional public research

| Product | Public material reviewed | Applied interpretation |
| --- | --- | --- |
| [WithAI / Multiplier](https://www.multiplier.ai/) and [founder description](https://www.ycombinator.com/companies/multiplier) | Browser-inspected public process/research illustrations and published integrated-workspace description | Tell one connected research story: source, unanswered question, recorded judgment. Do not scatter work among disconnected chat interfaces |
| [Attio](https://attio.com/) | Public site, demo narrative and accessible page content. Its animated hero did not reliably render in the research browser | Use task-based destinations and contextual starting points. No claims of hands-on access to its authenticated CRM |
| [Granola](https://www.granola.ai/) and [source inspection help](https://help.granola.ai/article/ai-enhanced-notes) | Browser-inspected homepage and published note-to-source inspection behavior | Friendly language and direct evidence inspection beside useful work |
| [Linear](https://linear.app/) | Published product page and public browser navigation; animated hero was not a usable visual reference | Maintain a small set of understandable concepts and respect keyboard navigation |
| [Clay](https://university.clay.com/docs/claygent-builder) | Published builder, template, context and testing documentation | Provide clear suggested actions, explain the task, and keep live retrieval boundaries explicit |
| [Hebbia](https://www.hebbia.com/) | Published finance-focused product/work-product description | Give the investment memo an organised document canvas and source inspection, without changing its frozen content |
| [Quartr](https://quartr.com/) | Published company-research material; browser navigation timed out | Keep company research and underlying source material together. No proprietary interface or app-access claim |

Earlier research of Affinity, Harmonic, Dealroom, Taghash and Model ML is recorded in `UIUX_REDESIGN.md`. These references informed original workflow choices. No signup, purchase, consultation, newsletter submission, private app access or competitor visual asset reuse occurred.

## Implemented experience

- Today has a navy/white research spotlight driven by an actual workspace record. Visitors can switch among its captured source, unanswered research question and recorded judgment. Each view links to the corresponding company tab. Real and fictional records remain explicitly labelled.
- Review counters now filter the actual queue. Queue labels use shorter, understandable wording while preserving each item's underlying type and destination.
- Explore is available from the shared top bar. Its optional walkthrough lets the user select a real or fictional company and open Evidence, Diligence or Memo directly. Six evidence states and useful terms, including Pass/Watch, MOIC and IRR, have plain-language explanations.
- Company tabs have optional contextual explanations. Guidance does not change evidence, approve drafts, execute providers or mutate company records.
- Memo uses a document layout, named chapters and an outline. Numbered citations inspect only the selected frozen memo's sources. Switching versions preserves the document's historic source scope. The complete original saved text remains accessible and export continues to use that original text.
- Native modal dialogs provide focus containment and restoration. Background scroll is locked while inspecting the guide or a frozen source. Global command search does not open a competing overlay above these dialogs. Motion is brief and disabled for reduced-motion preferences.

## Verification

The production build validates all 37 routes and TypeScript. Workspace ESLint passes. All four Edge browser workflows passed across the full run and a targeted rerun: the three existing flows passed immediately; the new guide/frozen-citation test initially used the wrong label locator, was corrected to the visible combobox role, and passed. The new test covers definitions, Escape/focus/scroll restoration, memo version 1, original-text preservation, frozen source scope, demo disclosure and phone boundaries. The final glossary addition is copy only.

Manual inspection confirms the real Locus memo v3 and historic v1 use their saved source sets. Its acquisition citation opens the original captured excerpt and URL, with no record mutation. Desktop guide centering, phone scrolling, Explore/command-overlay separation and readable phone memo layout were checked. The full assistive-technology audit and observation of first-time venture users remain required; no claim that the age group will be impressed has been established by user testing.

Today was checked for document overflow at 390, 768, 1024 and 1440px; memo at 390, 768 and 1440px. The review counter selected six actual pending drafts. A sticky-outline overlap was fixed by keeping its links and note together; its mobile alignment was then corrected and the phone regression rechecked. The final browser error log is empty.

Final phone memo inspection: viewport 390px, document 385px, outline 351.2px. The targeted guide/frozen-citation Edge regression passed again after the sticky/mobile CSS corrections (8.0 seconds). The final production build passes. No broader test rerun was needed for these presentation-only corrections.

Screenshots are saved under `docs/screenshots/`: `exploration-guide.png`, `exploration-today.png`, and `exploration-memo.png`.
