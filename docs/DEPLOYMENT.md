# Deployment status

Whistle is deployed in Nandan S R's Vercel workspace. The source is in a new private GitHub repository.

- [Website](https://whistle-henna.vercel.app)
- [Repository](https://github.com/nandan-s-r/whistle)
- [Website project](https://vercel.com/nandan-s-rs-projects/whistle)
- [API project](https://vercel.com/nandan-s-rs-projects/whistle-api)

## What is working

Both production deployments report Ready. Login and signup pages return HTTP 200. The API health check returns HTTP 200. Workspace requests without a session return HTTP 401 through the API and website proxy. Hosted local signup returns HTTP 404.

These checks confirm that the deployed services respond and reject unsigned workspace requests. They do not confirm that a real user can complete every account workflow.

The website and API use the same Supabase project. Local login is disabled on the hosted site. Private provider credentials belong in the API project's secret settings.

## Finish account setup

Supabase allows signup and requires email confirmation. Set the Auth Site URL to `https://whistle-henna.vercel.app` and allow these exact redirects:

- `https://whistle-henna.vercel.app/auth/confirm`
- `https://whistle-henna.vercel.app/reset-password`

The dashboard was signed out during deployment, and the connected tools did not expose those settings. They were not changed. Test account creation, email delivery, confirmation, password recovery, returning sign-in and separate-user access before inviting people.

See [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls). No private credentials or persistent test accounts were created for the deployment checks.

## Connect deployments and services

The first deployment used Vercel Drop. The Vercel chat plugin lacked team access, and Vercel's GitHub application did not have access to the new repository.

To enable automatic deployments, give that application access to only `nandan-s-r/whistle`. Use `frontend` as the website root and the repository root for the API.

Hosted Gemini, Firecrawl, X, calendar synchronization and a persistent worker are not activated. A local key does not transfer to Vercel automatically. See [private Gemini setup](PRIVATE_API_SETUP.md) and [platform setup](PLATFORM_SETUP.md).

## Checks that passed

The application and database jobs passed at [commit d6b693c](https://github.com/nandan-s-r/whistle/actions/runs/37244405989). The earlier release at [3360dc8](https://github.com/nandan-s-r/whistle/actions/runs/37242843723) passed 186 backend tests, 23 frontend tests, all 16 browser workflows, database policy checks and the production API/worker image build. The credential guard then added four passing regression tests.

Before release, the Linux database bootstrap received the standard extension-schema usage grant, the frontend lockfile was regenerated for clean installs, and an outdated Apollo status expectation was corrected. The final runs passed. Building the image does not prove the full worker stack is running.

## Security work still open

The production frontend audit reports no known advisories. The development audit reports [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) in the Next.js lint tooling's `braces` dependency. The advisory lists no patched release as of 5 October 2026. CI blocks production advisories and keeps the development warning visible.

Supabase's leaked-password protection is disabled. Enable it when the project's plan supports it. The no-policy notice on the private allowance table is intentional: clients must not read it directly.

A formal Codex Security audit was not completed because the scan-start call did not return a result. Passed tests are not a security certification. Hosted account isolation, provider delivery and recovery procedures still need testing.

## Keep keys out of Git

The pre-push credential check inspected 353 historical source/document versions before publishing `d6b693c`, with no flagged keys or private-setting filenames. An earlier check covered 346 versions across the first five commits. No oversized eligible files were skipped, and private settings, databases and key files were not opened.

The guard checks token formats, service-role JWTs, private filenames and every reachable commit tree. GitHub verification fetches full history. The local push hook is enabled in the release checkout; other developers must enable it after cloning.

These checks report filenames rather than matching values. They help catch accidental exposure but cannot detect every possible credential.
