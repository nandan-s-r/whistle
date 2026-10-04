# Running the upgraded workspace locally

The source is in this checkout. Read PLATFORM_SETUP.md for the current Supabase, Storage, vector, jobs and private-key setup. The historical template-only examples below remain available locally. No deployment or remote GitHub update has been performed.

## Start

Backend, from the repository root:

```powershell
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements-workspace.txt -r requirements-platform.txt
.\venv\Scripts\python.exe -m uvicorn backend.api:app --host 127.0.0.1 --port 8000 --no-access-log --timeout-keep-alive 30
```

Frontend, in a separate terminal:

```powershell
cd frontend
npm ci
# Set BACKEND_URL=http://127.0.0.1:8000 in frontend/.env.local
npm run dev -- --hostname 127.0.0.1
```

Open http://127.0.0.1:3000. Create your own local account, sign in with your private password, then select **Open demonstration scenario**. No accounts or shared passwords are installed on startup. A local preview using cloud configuration may explicitly set `NEXT_PUBLIC_LOCAL_AUTH=true` to offer **Use local workspace**; never enable this in hosted builds. Production requires `backend.main:app` with `AUTH_PROVIDER=supabase`. Local hybrid authentication uses a private `JWT_SECRET`.

## First workflow

Today → Discover → saved India B2B / ex-MBB search → inspect AtlasOps score and sources → Add to pipeline → company Overview → Generate cited screen → Choose disposition → enter rationale, counter-case and revisit trigger → Save decision.

The Evidence tab exposes claim/source links and review states. Diligence connects risks to questions. Model calculates and freezes scenarios. Memo retains the model version and approved source snapshot. Monitor shows source-linked actuals and threshold changes. The contextual assistant creates a separate draft that can be approved as a note or rejected.

In Diligence, **Plan a task** or **Plan this check** turns a claim question into editable work with an owner, due date, priority and status. Completion requires a written outcome and captured source; it never automatically verifies the claim. Today opens each due unfinished task directly. Reopening preserves its outcome while clearing its completion metadata.

Memo versions freeze the research and diligence outcomes. Add review comments beside the selected version; current-record changes show a warning instead of rewriting it. A decision can bind that selected memo and its frozen model. A reasoned formal Pass may have an evidence-only memo with missing financials explicit. **Download review pack** creates an owned ZIP of current claims/sources/tasks and the selected memo/model, using PDF, editable PowerPoint, Excel, text, JSON and CSV. An evidence-only Pass memo remains exportable without inventing a financial model.


## Sourcing and review studio

Discover adds three focused tools: Founder research / LinkedIn companion, Source journal and Founder directory. Founder research takes an authorized public profile URL and your notes, previews a verification checklist, then captures an unverified source-linked claim only after your explicit choice. It does not connect to or scrape LinkedIn. Thesis chips interpret known sectors, stages and employers over the records in your account.

Today and company Overview include a Review agenda. Schedule a founder/customer/partner/IC review, attach questions and a frozen memo, download an .ics calendar file, and record an outcome after the meeting. This saves preparation in the workspace; it does not contact attendees or synchronize a cloud calendar.

In Memo, **Write investment view** adds your case, counter-case, reversal condition, selected citations and change note as a new frozen version. **Preview presentation** provides section navigation and an editable PowerPoint download. PDF and Excel downloads bind the selected memo to its original model and source snapshot. Excel blue inputs are editable, formula cells protected against accidental changes, and source excerpts retained on a separate sheet. Worksheet protection is an editing aid, not encryption. Editing a downloaded workbook never rewrites the app's frozen model.

In Model, select **Explain this assumption** beside an input to record your rationale and optionally link a captured source. **Use in model draft** stages the note; **Calculate & freeze version** saves it with the new scenario. After two versions exist, **Compare versions** shows the changed inputs, reasoning and return effects. The frozen-version selector and older memo-linked downloads retain their original assumptions. A captured source does not turn a forecast into a verified fact.

In Model, click a return, ownership/invested-capital value or sensitivity cell to inspect **How this return is calculated**. The drawer uses the selected frozen version, shows its inputs and formulas, and preserves captured sources. Scenario IRR includes dated annual cash flows; sensitivity cells show MOIC without inventing an IRR. Undefined IRR scenarios are rejected with an explanation before a new version saves.

In Diligence, **Record a risk** links a concern to a claim, with severity, impact rationale, owner and review date. Due open assessments appear on Today under **Risk review**. **Review risk** can mark a concern Mitigated only with an explanation and a captured source; this does not verify the claim. Choose **Mitigated** or **All risks** to reopen an assessment. New memos preserve the updated risk view; older memo versions stay unchanged.

## Honest simulation boundaries

- Four companies are labelled fictional demonstration records. The separately captured Locus record uses public sources and a recorded Pass rationale; absent financial metrics remain absent.
- Search filters existing workspace records; it does not search the public web.
- Screening and IC generation use deterministic, cited templates.
- The assistant uses evidence rules until configured. The Gemini adapter runs only when requested with its private key supplied.
- Portfolio thresholds are calculated when records are reviewed. Library → Connections & imports provides persistent research/web/indexing task review. Web capture and cloud indexing require private keys; no automatic monitoring feed is active.
- No email or LinkedIn connector, outreach sending, paid provider, real market benchmark or licensed founder dataset is connected.
- New records live in additive workspace tables, isolated by account. Legacy tool APIs were retired during security hardening and their navigation links were removed; they are not available through the upgraded workspace.
- Models simplify equity proceeds: aggregate dilution, incremental follow-on ownership and follow-on at year 2. They omit preferences, debt, fund fees, taxes and detailed cap-table rounds. Frozen models export JSON and an editable formula workbook; memos export text/PDF and editable PowerPoint with a frozen source appendix.

## Optional local or hosted model

Set these server-side variables only when ready to use a provider:

```text
WORKSPACE_MODEL_URL=http://127.0.0.1:11434/v1
WORKSPACE_MODEL=your-installed-model
WORKSPACE_MODEL_KEY=optional-endpoint-key
```

The endpoint must support `/chat/completions` and structured JSON responses with `draft` and `source_ids`. The assistant previews the scope before a run and validates returned source IDs. A configured hosted endpoint receives the selected source excerpts and claims. Provider integration requires separate endpoint configuration and has not been tested against a live model.

The separate Supabase project and owner policies are created. See PLATFORM_SETUP.md for current configuration and verification limits. Hosted Auth confirmation and private provider/worker credentials still need setup. Local accounts and cloud accounts remain separate.

## Checks

```powershell
.\venv\Scripts\python.exe -m unittest discover -s tests -v
cd frontend
npm run build
```

Tests cover authentication, ownership/roles, duplicate initialization, reciprocal claim/evidence links, conflict review, financial calculations and cash-flow IRR, frozen versions, decision history, stale-update conflicts and draft approval. Repository-wide lint still includes pre-existing legacy issues; the new workspace files are checked separately.
