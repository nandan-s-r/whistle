# VC Scope upgrade audit and implementation plan

This is the original upgrade plan for the 31-page VC Scope blueprint. It records the starting problems and proposed sequence, not the current deployment instructions. Legacy HTTP tools were later retired, the product was renamed Whistle, and public sourcing was added. Use [deployment status](DEPLOYMENT.md) and [blueprint coverage](BLUEPRINT_ACCEPTANCE.md) for the current position.

## Existing implementation

- Next.js 16.2.6 App Router / React 19 frontend, FastAPI backend, SQLAlchemy SQLite/PostgreSQL persistence, bcrypt and JWT sign-in.
- Existing company/person CRUD, notes, tasks, pipeline stages, deck parsing, meeting summaries, portfolio records and modeler are worth preserving.
- Home page has hardcoded market prices, job logs, inference latency and company signals labeled live. Sourcing synthesizes fictional founders and random scores under crawler labels. These are simulated, not verified research.
- Existing database has no first-class source/claim relationships, reviewed evidence states, frozen assumption models or durable IC decision records.
- Navigation lists tools independently; company profile does not preserve the blueprint's evidence-to-decision chain.
- AI depends on Gemini/Groq. Provider credentials and actual extraction quality cannot be established from the public repository.
- Frontend dependency lockfile is inconsistent; clean install fails until repaired.
- Production database, deployment configuration and private credentials are not accessible from this checkout. No production records will be changed.

## Implementation sequence

1. Keep legacy routes and backend APIs. Add an owner-scoped workspace router and new tables alongside the existing schema.
2. Introduce validated Company, Person, Source, Evidence, Claim, Assumption, Interaction, Decision, Metric, Trigger, AI Run and Review Action objects. Enforce provenance relationships, write permissions, revision checks and append-only history.
3. Replace the home/primary navigation with Today, Discover, Pipeline, Portfolio and Library. Apply official palette and reusable evidence, entity, drawer and decision components.
4. Deliver authenticated saved-search → reason/evidence inspection → pipeline → cited screen → disposition → company/history. Use clearly labeled fictional scenarios, deterministic search and no crawling claims.
5. Continue with claim reviews, risk/questions, assumption scenarios, frozen models, cited memos, monitoring and contextual draft review. Connect a configurable OpenAI-compatible provider only when explicitly configured; the default assistant is a transparent rules-based draft tool.
6. Validate source relationships, financial math, history, ownership/roles, concurrency and the browser flow. Check build, new-file lint and desktop/mobile views.

## Boundaries and next integrations

No deployment, publishing, outreach, scraping or paid services. Legacy APIs remain available but are not certified investment-grade. Licensed founder data, a durable production database, model endpoint credentials and real portfolio sources are separate integration work. The demonstration's sources and companies are fictional even when an evidence state says verified within the scenario.
