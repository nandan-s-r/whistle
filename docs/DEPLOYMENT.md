# Deployment status

## Discovery workflow release - 28 October 2026

With explicit approval, website deployment `dpl_88gbPd9TzC1bJKjYRgUXDXMoMJVt` and API deployment `dpl_2aZauod99VgLrk7PuiD5b4aqDNQg` are Ready on the existing production domains. Saved-record search now has a direct public-research handoff, preserves topic/geography, and resets the company view correctly. Missing-provider guidance and the password-reset layout are corrected. A production-only private signing key now keeps sourcing receipts stable across server instances; no credential value is in source control.

Verification passes the production build, TypeScript/lint, 190 backend tests, 23 frontend checks and all 18 isolated browser workflows. The user's live cloud session completes a semiconductor public-source search with five repository references and zero launch matches. These are not verified Indian startup profiles. The user chose public sources only; AI providers remain unconfigured. Existing records and user passwords were not changed. The provider-side email recovery redirect remains dependent on authorized Supabase project-owner access. See DEAL_SOURCING.md for details and limits.

## Production session repair - 28 October 2026

The hosted API was accepting requests but rejecting cloud sessions with `Could not validate credentials`. Its runtime logs showed local JWT initialization. Production project settings contained the Supabase URL and publishable key but omitted `AUTH_PROVIDER` and `ENVIRONMENT`; the values in `vercel.json` were not effective in that deployed runtime.

With explicit user approval, production project settings now include `AUTH_PROVIDER=supabase` and `ENVIRONMENT=production`. The existing API source was redeployed as `dpl_GtXjELhAquXkiEeHD6Wxf9X3XDNC`, Ready, on the existing `whistle-api.vercel.app` alias. No database records or passwords were changed by this repair. The deployed authentication, entrypoint and deployment configuration files matched the checked-out source byte for byte.

The user's existing signed-in Chrome session now loads four labelled demo companies in Discover and two in Pipeline. Pipeline still loads after a full page refresh. Three token compatibility tests, three runtime configuration tests, and isolated cloud-routing/invalid-session/production-guard checks pass. The new deployment's error/fatal log query returned no entries during the checked five-minute window. This is bounded verification of session validation and workspace reads, not every application feature.

Password-recovery email redirect configuration remains unresolved: it falls back to localhost, and the user does not have dashboard access to the connected Supabase organization. One approved recovery attempt was returned to the live reset page in the same browser. This API repair does not change that setting or establish project ownership.

The subsequent report of blank pages prompted broader live browser verification against the same Ready deployment. Today, Discover, Pipeline, Portfolio and Library all render without the credential error in the user's existing session. Portfolio and Library were also checked after full reloads. CoreLedger's Overview, Evidence, Diligence, Model, Memo and Monitor sections render their corresponding content. The API logs confirm HTTP 200 for authentication and the account-scoped company/search reads. This checks navigation and read rendering only; it does not certify every edit, export or optional external integration. No additional production change was made during this follow-up.

Whistle is deployed in Nandan S R's Vercel workspace. The source repository is public at the owner's request.

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

The application and database jobs passed at [commit cfda85c](https://github.com/nandan-s-r/whistle/actions/runs/37245483438). The earlier release at [3360dc8](https://github.com/nandan-s-r/whistle/actions/runs/37242843723) passed 186 backend tests, 23 frontend tests, all 16 browser workflows, database policy checks and the production API/worker image build. The credential guard then added four passing regression tests.

Before release, the Linux database bootstrap received the standard extension-schema usage grant, the frontend lockfile was regenerated for clean installs, and an outdated Apollo status expectation was corrected. The final runs passed. Building the image does not prove the full worker stack is running.

## Rate limits

The hosted database's allowance functions and job admission trigger were checked on 5 October 2026. Provider calls and job submissions each have separate counters:

| Limit | Per account | Across all accounts |
| --- | --- | --- |
| Fixed one-minute window | 10 | 60 |
| Fixed daily window | 100 | 1,000 |
| Queued or running jobs | 5 | 100 |

The concurrent-job limit applies to jobs only. Exceeded allowances return HTTP 429. Counters are stored in the database and updated atomically; clients cannot read or edit the allowance table. Thirteen targeted credential and allowance tests passed before the visibility change, including concurrent admission and shared limits across new accounts.

Local preview login has a separate five-attempt limit per minute. Hosted login uses Supabase Auth rather than that local limiter. These checks do not establish a custom Vercel firewall limit for every HTTP request or a completed live account flow.

## Security work still open

The production frontend audit reports no known advisories. The development audit reports [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) in the Next.js lint tooling's `braces` dependency. The advisory lists no patched release as of 5 October 2026. CI blocks production advisories and keeps the development warning visible.

Supabase's leaked-password protection is disabled. Enable it when the project's plan supports it. The no-policy notice on the private allowance table is intentional: clients must not read it directly.

A formal Codex Security audit was not completed because the scan-start call did not return a result. Passed tests are not a security certification. Hosted account isolation, provider delivery and recovery procedures still need testing.

## Keep keys out of Git

Before the repository became public, the credential check inspected 383 historical source/document versions and 333 current source/document files, with no flagged keys or private-setting filenames. No oversized eligible files were skipped, and private settings, databases and key files were not opened.

The guard checks token formats, service-role JWTs, private filenames and every reachable commit tree. GitHub verification fetches full history. The local push hook is enabled in the release checkout; other developers must enable it after cloning.

These checks report filenames rather than matching values. They help catch accidental exposure but cannot detect every possible credential.
