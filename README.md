# Whistle

Whistle is a research workspace for investors. It keeps company research, source material, diligence, financial models and investment decisions together.

Open [Whistle](https://whistle-henna.vercel.app). The website and API are deployed. Email confirmation, password recovery and authenticated cloud workflows still need hosted acceptance checks. [Deployment notes](docs/DEPLOYMENT.md) describe the current settings and remaining work.

The basic workflow is simple: find a company, check the evidence, decide what to do next. Each claim keeps its sources and review status. AI can help prepare research, but an investor reviews the result before it becomes an approved fact.

## Using Whistle

| Page | What you do there |
| --- | --- |
| Today | Check priorities, planned meetings and your pipeline. |
| Reviews | Open outstanding questions, conflicting evidence, drafts and follow-ups. |
| Discover | Search an industry, inspect sourced companies and add a company to research. |
| Pipeline | Track deals, owners, decisions and next steps. |
| Portfolio | Review recorded holdings, company updates and metric changes. |
| Library | Find saved research, exports, source policies and connection settings. |

A company record has six sections: Overview, Evidence, Diligence, Model, Memo and Monitor. Sources, assumptions and decisions stay linked across those sections. Frozen models and memos preserve what was reviewed at the time.

New accounts start empty. A user can choose to load a fictional sample to learn the workflow. Sample companies are labelled throughout the app.

## Research and integrations

Whistle supports public Product Hunt and GitHub sourcing, source excerpts, company websites and permitted profile notes. Gemini research requires a server-side API key. Provider results remain drafts until reviewed.

Connections show their actual setup status. Installing an MCP connector in a chat does not connect that service to the deployed app. LinkedIn access, licensed company data, live calendar synchronization and background workers require their own configuration and permissions.

Calendar exports create a file; they do not send invitations. Monitoring evaluates the observations already recorded in Whistle. It does not imply that every company is being watched continuously.

## Stack

- TypeScript, React and Next.js for the website.
- Python and FastAPI for the API.
- Supabase Auth, Postgres row policies and private storage for cloud accounts.
- SQLite for the separate local preview.

## Run locally

Use Python 3.12 and Node.js 24. Create an isolated Python environment, then install the API dependencies:

```sh
python -m venv venv
venv\Scripts\activate
python -m pip install -r requirements-platform.txt -r requirements-workspace.txt
```

The activation command above is for Windows. On macOS or Linux, use `source venv/bin/activate`. Set a private `JWT_SECRET` and use `AUTH_PROVIDER=local` for local accounts. Provider settings belong outside the repository. See [local setup](docs/LOCAL_PREVIEW.md) and [private API setup](docs/PRIVATE_API_SETUP.md).

```sh
python -m uvicorn backend.api:app --host 127.0.0.1 --port 8000 --no-access-log
```

In another terminal:

```sh
cd frontend
npm ci
npm run dev
```

Open `http://127.0.0.1:3000`. Create your own account. The app does not install a shared password. Local and cloud accounts are separate, even when they use the same email address.

## Deploy

The website and API need separate hosted services. Set the website's root directory to `frontend`. Use `backend.main:app` for the production API, with `ENVIRONMENT=production` and `AUTH_PROVIDER=supabase`.

| Service | Required settings |
| --- | --- |
| Website | `BACKEND_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| API | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `FRONTEND_URL`, `ENVIRONMENT`, `AUTH_PROVIDER` |
| Optional Gemini research | `GEMINI_API_KEY`, `GEMINI_MODEL`, `WORKSPACE_PROVIDER=gemini`, on the API only |

Keep local authentication disabled in hosted builds. Set Supabase's sign-in, confirmation and password-reset URLs to the actual website address. Test account creation, confirmation, returning sign-in and separate-user access before inviting users. See [deployment setup](docs/DEPLOYMENT.md).

Never commit `.env` files, databases or private keys. Never put provider credentials or a Supabase service-role key in a `NEXT_PUBLIC_` setting. Background jobs need a separate worker; a website deployment does not start one.

## Checks

```sh
python -m unittest discover -s tests -v
python scripts/check-release-secrets.py
```

Inside `frontend`:

```sh
node --test tests/*.test.mjs
npm run lint:workspace
npm run build
```

Browser tests must run against an isolated test backend because they create accounts and records. [Verification notes](docs/VERIFICATION.md) record the checks already completed and the work still pending. Local test results are not a claim that every hosted integration works.
