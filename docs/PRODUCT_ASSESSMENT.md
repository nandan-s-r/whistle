# VC Scope product assessment and execution gates — 3 October 2026

## Assessment

VC Scope has a coherent local research workflow and useful preservation of evidence and decisions. It is not yet established as a production investment-research product. The main constraints are the quality of real research, completeness of the decision workflow, independent user validation and hosted operational evidence. Visual polish supports those foundations.

The target launch user should be explicit: an analyst or small early-stage venture team researching India B2B companies. The first success is a sourced company screen, a defensible financial scenario when inputs exist, and a readable investment view that another person can inspect. The PDF remains authoritative; BLUEPRINT_ACCEPTANCE.md tracks its 31 pages.

Findings below are based on the code and current local checks. Investor acceptance and production readiness require separate evidence.

## Problems and priorities

| Priority | Problem and evidence | Consequence | Required correction and acceptance |
| --- | --- | --- | --- |
| P0 | Real investment proof remains incomplete. The Locus record is a sourced Pass case; no independently reviewed flagship model with defensible financial inputs is complete. | Sample exports can look polished while investment usefulness remains unproven. | Complete a permitted, sourced real-company case; independently inspect material claims and clearly retain missing financials. Reviewer can explain the decision and inspect its basis. |
| P0 | Discovery searches saved company records using known terms. External sourcing, licensed people/funding data and approved LinkedIn access are not connected. | A user expecting new companies may search an empty account and receive no useful leads. | Make saved-record scope clear, validate manual/public-source intake, then add one authorized source with deduplication, dates and explanations. Evaluate a real 20-founder shortlist against the thesis. |
| P0 | AI citations are validated by source ID, not by whether an excerpt actually supports the statement. Live task quality/cost/latency have not been measured. | Plausible drafts may contain unsupported reasoning despite valid citations. | Build a labelled evaluation set for source support, contradictions, missing data and task usefulness. Check claim-level evidence before approving outputs. Compare configured providers on those tasks before considering fine-tuning or agent handoffs. |
| P1 | Risks were display-only. Users could not create/revise an assessment or connect its due review and mitigation to the workflow. | Concerns had no managed review loop. | Implemented this milestone: editable risks, required reasoning, owned claim/source links, dates, Today reviews, evidence-backed mitigation/reopening and frozen memo preservation. Human review of assessment quality still remains. |
| P1 | Underwriting uses a terminal ARR input and simplified equity proceeds. No annual operating revenue path, detailed cap-table rounds or preferences are modeled. | A computed return can obscure assumptions that produced revenue and ownership. | Add a source-aware ARR bridge and annual scenario assumptions; compare these to actuals. Preserve exclusions, version history and sensitivity. Do not present unsupported projections as facts. |
| P1 | GET /api/workspace loads every owned company with its sources and model/memo history. Local search iterates these records; CloudRepository.companies has no explicit range traversal. | Payload and search work grow with history; cloud result caps may make a large account incomplete. This is a code-level risk, not an observed small-account failure. | Separate list summaries from company detail/history, paginate with stable ordering, handle provider row caps and add scale fixtures. Measure responsiveness on a realistic dataset before promising low latency. |
| P1 | Assignments are display names within an account, not shared team membership or delivered notifications. Local and cloud accounts are separate. | Users may assume a colleague received work or that switching sign-in mode moves their research. | Preserve explicit account/mode boundaries. Before a team launch, implement invites, shared-workspace permissions and confirmed assignments. Verify migration/export workflows without silently moving records. |
| P1 | Hosted Auth confirmation, file HTTP access, worker recovery, provider delivery, telemetry and restoration are not certified by local tests. | Shipping prematurely could expose reliability or recovery failures that the demo does not exercise. | Complete a staging checklist with actual owner/other-account/reader requests, upload/view/download, task cancel/recovery, bounded costs, deployed smoke checks and a backup restore. Finalize hosting privacy/contact/deletion arrangements. |
| P1 | No completed two-venture-user/timed novice validation, screen-reader review or actual 200% browser-zoom audit. | A developer can understand a flow that first-time investors find confusing. | Observe two representative users completing the PDF tasks, record confusion and completion times, and fix blockers. Use keyboard and assistive technology alongside automated checks. |
| P2 | Operating actuals/rejected-company learning, relationship history, richer task plans, partial-import recovery, undo, skeletons and configurable Library/stages remain incomplete. | Several follow-on actions still stop before a useful learning/recovery loop. | Finish each inside the existing five destinations/six company tabs, with a defined trigger, owner, result and recovery path. Track acceptance per page rather than adding unrelated modules. |

## Execution sequence

1. **Prove the research case.** Build and independently review one real investment story. Close the 30-claim provenance sample and missing-information handling. Acceptance is a reviewer finding the basis for each material claim and decision.
2. **Complete decision reasoning.** The managed risk loop is now implemented locally. Next connect operating ARR assumptions, decision-specific measurable triggers, actual outcomes and rejected-company revisit rules. Preserve frozen history throughout.
3. **Evaluate assistance.** Keep rule-based/draft boundaries explicit. Use a curated task set with known source support and contradictions; measure useful accepted drafts, unsupported claims, cost and latency. Configure a private provider only through the user-controlled setup. Multi-agent orchestration and fine-tuning should follow evidence of a task gap.
4. **Validate the experience.** Run the PDF’s three clean end-to-end demonstrations, under-three-minute screen and five-minute review targets with the two venture users. Inspect actual 200% zoom and screen-reader behavior. The target times are acceptance goals, not measured results.
5. **Verify a small hosted pilot.** Complete permissions, live services, restoration, budgets, monitored failures and final hosted policies before broad sharing. Load-test list/history/search with at least 300 representative companies and repeated versions, then choose and measure a response-time budget. Deployment still requires explicit authorization.

Each item has a measurable exit. “Best” is treated as a high quality bar, not a completion claim.

## Workflow reference

Attio’s official workflow documentation connects a record, owner, due date and task, with inspectable execution. This informed the complete follow-up loop; VC Scope’s source/review/frozen-decision rules come from its PDF. [Attio workflow documentation](https://attio.com/help/reference/automations/workflows/create-a-workflow).

Harmonic describes its product around continuously collected, searchable startup information. That is a useful comparison for the unresolved discovery value, not evidence that VC Scope currently has a comparable dataset or integration. [Harmonic product introduction](https://harmonic.ai/blog/introducing-harmonic-a-better-way-to-discover-and-invest-in-startups).

## Implemented in this assessment

- Risks can be created, edited, mitigated with an explanation/source, and reopened. Each assessment has severity, rationale, linked claim, review owner/date and actual authenticated reviewer/time.
- Due open risks are independent Today obligations. Mitigation removes only that obligation; conflicts, unfinished diligence, drafts and decisions remain independent.
- Risk changes revise the research fingerprint, appear in history and in new frozen memo risk sections. Older memo snapshots stay unchanged. Additive default fields preserve old fingerprints for otherwise unchanged legacy records.
- Invalid claim/source links, duplicate references, invalid dates, insufficient mitigation, forged reviewer fields, read-only edits, other-account access and stale revisions are rejected before saving.
- New forms keep save failures visible in the drawer. Mobile review, theme/focus behavior and source inspection are part of verification.

VERIFICATION.md records actual checks and failures/repairs. No user research or frozen artifact was rewritten; synthetic records were used for tests. Private Gemini settings were not inspected, and no live model request, deployment, purchase or outreach was required.
