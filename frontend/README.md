# Whistle website

This directory contains Whistle's Next.js and React frontend. It provides the research workspace, company tabs, account screens and public information pages.

## Start locally

Run the API on port 8000 using [the repository setup](../docs/LOCAL_PREVIEW.md). Then, from this directory:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:3000`. Set `BACKEND_URL=http://127.0.0.1:8000` in your local frontend configuration if needed. Keep local configuration out of Git.

## Cloud configuration

The frontend needs the Supabase project URL and public publishable key. It sends API requests through the configured backend.

Production builds require an HTTPS `BACKEND_URL`. Keep `NEXT_PUBLIC_LOCAL_AUTH` disabled on a hosted site. Gemini, Firecrawl and service-role credentials belong on the server, never in frontend settings.

See [deployment notes](../docs/DEPLOYMENT.md) for the live projects and remaining account checks.

## Check a change

```sh
node --test tests/*.test.mjs
npm run lint:workspace
npm run build
```

Run `npm run test:e2e` only against an isolated test backend. The tests create accounts and research records.

Read the installed Next.js documentation before changing framework behavior; this project uses APIs that may differ from earlier versions. The local font assets include their redistribution license.
