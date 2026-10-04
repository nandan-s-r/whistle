# Whistle

Whistle helps investors keep company research, diligence, financial assumptions and decisions in one place. Open a company, check its sources, and record what you think should happen next.

[Open Whistle](https://whistle-henna.vercel.app) · [Deployment status](docs/DEPLOYMENT.md) · [User guide](docs/USER_WALKTHROUGH.md)

The website and API are deployed. Email confirmation, password recovery and real-account access still need testing on the hosted site. Gemini and other services need their own server settings; a connector installed in a chat does not connect the app.

## What you can do

| Page | Use it for |
| --- | --- |
| Today | Priorities, planned meetings and a quick view of your pipeline. |
| Reviews | Conflicting claims, draft research and work waiting for review. |
| Discover | Search saved companies or look for public research leads in an industry. |
| Pipeline | Keep track of deals, owners and the next step. |
| Portfolio | Follow recorded holdings and compare later updates with earlier assumptions. |
| Library | Reference material, saved research, team access and service settings. |

Each company has six tabs: Overview, Evidence, Diligence, Model, Memo and Monitor. Claims stay linked to their sources. Saved model and memo versions preserve the inputs and evidence used at the time.

AI output starts as a draft. A reviewer decides whether to keep it; it cannot approve an investment or silently replace reviewed evidence. New accounts start empty, with an optional fictional sample for learning the workflow.

## Research and services

Product Hunt and GitHub searches return public leads. Launch publicity, repository stars and company statements need review before they become investment evidence.

Gemini research needs a private API key on the server. Licensed company data, direct LinkedIn access, calendar synchronization and background workers need separate setup and permissions. Calendar exports download a file; they do not send invitations. Monitoring checks recorded observations rather than collecting every company's updates automatically.

See [the documentation guide](docs/README.md) for setup instructions and the older development records.

## Run locally

Use Python 3.12 and Node.js 24. From the repository root, on Windows:

```powershell
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements-platform.txt -r requirements-workspace.txt
```

Set `AUTH_PROVIDER=local` and a private `JWT_SECRET` in your server configuration, then start the API:

```powershell
.\venv\Scripts\python.exe -m uvicorn backend.api:app --host 127.0.0.1 --port 8000 --no-access-log
```

On macOS or Linux, use `venv/bin/python` instead. In another terminal:

```sh
cd frontend
npm ci
npm run dev
```

Open `http://127.0.0.1:3000` and create an account. Local and cloud accounts are separate, even if they use the same email address. See [local setup](docs/LOCAL_PREVIEW.md) for configuration details.

## Deploy

The website uses Next.js; the API uses Python and FastAPI. Cloud accounts use Supabase Auth, Postgres row policies and private storage. SQLite supports the separate local preview.

Deploy the website from `frontend` and the production API with `backend.main:app`.

| Service | Settings |
| --- | --- |
| Website | `BACKEND_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| API | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `FRONTEND_URL`, `ENVIRONMENT=production`, `AUTH_PROVIDER=supabase` |
| Optional Gemini | `GEMINI_API_KEY`, `GEMINI_MODEL`, `WORKSPACE_PROVIDER=gemini`, on the API only |

Keep local login disabled on the hosted site. Configure and test Supabase confirmation and password-reset redirects before inviting users. Workers need a separate host. [Deployment notes](docs/DEPLOYMENT.md) list what has been checked and what remains.

## Keep credentials private

Store private settings outside the repository or in your host's secret settings. Never commit keys, databases or `.env` files. Never put a Gemini key or Supabase service-role key in a `NEXT_PUBLIC_` variable.

Enable the local push guard and check a full clone before pushing:

```sh
git config core.hooksPath .githooks
python scripts/check-release-secrets.py --history
```

The guard reports filenames, not matching values. GitHub verification checks the full history too. These pattern checks help catch accidental exposure; they cannot detect every possible secret.

## Check a change

```sh
python -m unittest discover -s tests -v
```

Inside `frontend`:

```sh
node --test tests/*.test.mjs
npm run lint:workspace
npm run build
```

Browser tests create accounts and records, so run them against an isolated test backend. [Contributing](CONTRIBUTING.md) explains the review process. [Verification records](docs/VERIFICATION.md) retain earlier results and their limits.
