# How to use Whistle

This guide follows the live portal walkthrough on 5 October 2026. Company, evidence and decision forms were opened without saving changes. The public semiconductor search ran on Product Hunt and GitHub; it did not run Gemini or change saved company records.

## 1. Sign in

Open [Whistle sign-in](http://127.0.0.1:3000/login). Cloud mode appears first. Enter your account email and password, then select **Sign in to workspace**. Create an account if you have never registered in that mode; use **Forgot password?** for cloud password recovery. You enter credentials yourself.

**Use local preview** switches to the separate account stored on this computer. Your current 13 company records belong to this local preview. Local and cloud credentials/records are separate; changing the sign-in mode does not transfer companies. If your login fails, check the mode and whether the account was created there. A Gemini API key belongs in private server settings, not in the login password field.

For the walkthrough, your existing signed-in session opened the workspace without entering a password.

## 2. Understand the sidebar

| Screen | What it is for | What to do first |
| --- | --- | --- |
| **Today** | Work that needs your attention | Open a conflict, draft or review to see its company and next action. |
| **Discover** | Saved company research and new public leads | Choose **Saved companies** to filter your records, or **Deal sourcing** to research an industry. |
| **Pipeline** | Companies being considered for investment | Open a deal; inspect evidence, next action and owner; record your judgment in the company. |
| **Portfolio** | Recorded completed holdings and follow-up | Inspect reported changes against the investment assumptions, then open **Monitor**. |
| **Library** | Review standards, reference material and retained knowledge | Read the thesis, screening, diligence, memo or source reference you need. |
| **Connections & settings** | Service setup and imports | Check each service's actual status before using it. Also accessible through Library. |

The top **Search / Ctrl K** finds saved companies and destinations. It is different from the external industry search in Discover. During the tour, searching **Tenstorrent** opened its existing company record.

![Today](screenshots/walkthrough-today.jpg)

## 3. Find and capture a company

In **Discover → Saved companies**, enter a search and use geography, stage or sector filters. **Research** currently shows the nine semiconductor companies; **All companies** includes the four fictional examples too. Demo labels identify the fictional records.

In **Discover → Deal sourcing → Industry research**:

1. Enter a public prompt, such as “Find AI chips and semiconductor infrastructure startups with founder and customer evidence.”
2. Open **Sources** and choose available providers.
3. Confirm that the public prompt can be sent to those providers. Keep confidential deal details out.
4. Click **Research this space**.
5. Read the references and each provider's result/coverage. A repository owner is not necessarily a founder; stars and launch publicity do not establish customer traction.

The demonstrated run returned five public repository references. Product Hunt inspected its latest 50 feed entries and found no matching launches within the 30-day window. That result does not establish that no semiconductor startup exists on Product Hunt. The local session cannot produce a Gemini research brief until the required cloud-account setup is satisfied.

When a lead deserves research, select **Add company**. Enter its name, website/domain and person to research; keep unknown information explicit. Additional company details are available in the form. **Capture & open company** creates the record; capture does not verify identity or automatically fetch its website. An existing domain opens the existing record. This form was shown but not submitted in the tour.

![Discover results](screenshots/walkthrough-discover.jpg)

## 4. Review the company

Each company has six tabs:

| Tab | Use it to |
| --- | --- |
| **Overview** | Read the summary, owner, next action and activity history. Add the company to Pipeline when it becomes an active evaluation. |
| **Evidence** | Capture source excerpts; inspect dates, links and claims; review a claim's state with a rationale. |
| **Diligence** | Plan work that can resolve important uncertainties, with questions, owners and completion evidence. |
| **Model** | Enter and inspect financial assumptions and return scenarios. Estimates depend on those assumptions. |
| **Memo** | Prepare and read the investment case, source references, objections and saved versions. |
| **Monitor** | Compare later observations with earlier assumptions and review conditions. New information must be entered or imported. |

The Tenstorrent record shown was **Unreviewed**, with one company-reported claim and founder identity still unreviewed. **Evidence → Review** opened the claim beside its source. Review labels include Verified, Founder-reported, Calculated, AI-inferred, Missing and Conflicted. Choose the state justified by the evidence and explain your rationale before saving. A reliable source for a bounded statement does not establish certainty about the entire business or its forecasts.

![Company overview](screenshots/walkthrough-company.jpg)

## 5. Move through Pipeline and record a decision

Pipeline shows decision, evidence issues, next step and owner. **Companies** is the list view; **Board** groups by recorded decision; **People** shows recorded contacts. Switching a view/filter does not save a decision.

The tour showed two fictional Watch deals. The nine semiconductor research records are not automatically active Pipeline deals.

Open a company and select **Record decision**:

1. Choose **Pass**, **Watch**, **Progress to diligence**, **Progress to partner** or **Invest**.
2. Write **Why this decision?**
3. Record the **Counter-case or dissent**.
4. State **What would change your mind?**
5. Save the decision when you are ready. Saved reasoning is retained with the decision version.

**Watch** means follow the company; **Pass** means do not pursue it now. **Invest** records an investment judgment. Signed commitments and completed transactions are separate records; an Invest judgment alone does not create a completed holding. The decision form was opened on fictional LedgerMesh and closed without saving.

![Pipeline](screenshots/walkthrough-pipeline.jpg)

![Decision form](screenshots/walkthrough-decision.jpg)

## 6. Follow completed holdings in Portfolio

Portfolio compares reported performance with earlier investment assumptions and links to the company's **Monitor** tab. Inspect reporting period, source and review state before relying on a figure. Record or import new observations for ongoing reviews.

The displayed CoreLedger example is fictional, including its runway and retention figures. This walkthrough did not demonstrate automatic live monitoring of real portfolio companies.

![Portfolio](screenshots/walkthrough-portfolio.jpg)

## 7. Use Library and Connections when needed

Library contains reference material for investment thesis, screening, diligence, IC memo and source policy, plus comparable sets, investment memory, fund access and imports. The India B2B thesis on screen is a **read-only example**, not an approved mandate or a restriction on industry searches. Keep company-specific work in its company record.

![Library](screenshots/walkthrough-library.jpg)

**Library → Connections & imports** offers calendar preview/import, supervised tasks, private cloud files and indexed evidence search. Expand **All connections & setup** to see individual statuses. Eighteen listed services does not mean eighteen live connections. Configured means settings are present, not that a live task succeeded. Disabled controls explain their requirements.

At walkthrough time, Product Hunt/GitHub public searches worked. Gemini was configured but required cloud sign-in; Firecrawl had no app runtime key, and its separate chat connector had exhausted credits. Calendar, hosted files, indexing and several other integrations still require setup/live validation. A connector installed in this chat does not automatically connect the Whistle application. See [the full cross-check](INTEGRATION_CROSSCHECK.md).

![Connection states](screenshots/walkthrough-connections.jpg)

## Your first complete review

Start with one saved company. **Inspect sources → review claims → answer diligence questions → test model assumptions → prepare the memo → record a decision → return to Today for unresolved work.** Move a completed investment into the portfolio workflow only when its transaction is recorded.

Use **Explore the workspace** in the top bar whenever you need help. Its **Walkthrough**, **Evidence labels** and **Useful terms** explain the process, review labels and terms such as thesis, diligence, IC memo, frozen version, MOIC and IRR. Exploring does not edit a company. The tour left this guide open on Tenstorrent.

![Built-in beginner guide](screenshots/walkthrough-guide.jpg)
