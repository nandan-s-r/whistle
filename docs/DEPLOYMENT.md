# Whistle deployment

The Whistle release uses a new private repository, `nandan-s-r/whistle`, and two projects in Nandan S R's Vercel workspace: `whistle` and `whistle-api`.

- [Website](https://whistle-henna.vercel.app)
- [Private repository](https://github.com/nandan-s-r/whistle)
- [Website project](https://vercel.com/nandan-s-rs-projects/whistle)
- [API project](https://vercel.com/nandan-s-rs-projects/whistle-api)

Both production deployments report Ready. The website's login and signup pages return HTTP 200. The API health endpoint returns HTTP 200; unsigned workspace requests return HTTP 401 through both the API and the website proxy. Local signup returns HTTP 404 on the hosted website. These checks do not establish authenticated account behavior.

The website uses the public Supabase URL and publishable key. The API uses the same project. Local login is disabled in the hosted website. Provider credentials belong only in the API project's secret settings.

The initial deployment uses Vercel Drop because the connected Vercel plugin cannot access the team scope and Vercel's GitHub application does not yet have access to the new repository. Install or configure that application for only `nandan-s-r/whistle` to enable automatic deployment. Set the website root to `frontend` and the API root to the repository root.

Gemini, Firecrawl, X, calendar synchronization and a persistent job worker have not been activated in these hosted projects. A local provider key is not automatically transferred to Vercel.

## Release checks

The local release passed 184 backend regression tests, two hosted-path tests, 23 frontend unit tests and workspace lint. The isolated Linux database bootstrap needed Supabase's standard extension-schema usage grant. The frontend lockfile was regenerated in a clean directory after the first Linux install failed.

The production frontend audit reports no known advisories. The full development audit reports GHSA-vfj7-8cjw-p6xm through the Next.js ESLint plugin's `braces` dependency. The advisory lists no patched release as of 5 October 2026. This tooling reads repository-controlled lint patterns and is not a dependency in the production frontend audit. CI blocks production advisories and retains a separate visible development audit report. Do not downgrade Next.js or apply `npm audit fix --force` merely to suppress that report.

Reference: [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

Supabase also reports disabled leaked-password protection. It should be enabled when the project's plan supports it. The private allowance table's RLS-without-policy notice is deliberate: clients must not directly read that table.

Account creation, confirmation email delivery, recovery and authenticated multi-user use must be checked by the operator on the hosted origin. No private credentials or persistent test accounts were created during this deployment.

Set the Supabase Auth Site URL to `https://whistle-henna.vercel.app` and allow the exact redirect URLs `https://whistle-henna.vercel.app/auth/confirm` and `https://whistle-henna.vercel.app/reset-password`. The Supabase dashboard is signed out, and the connected tools do not expose these Auth configuration settings, so they were not changed during deployment. See [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

The first complete Linux browser run passed 15 of 16 workflows. The remaining test expected an obsolete Apollo status and did not open the collapsed setup section. It now opens the section and checks that Apollo is explicitly not connected to the app. The application behavior was unchanged by this test correction.
