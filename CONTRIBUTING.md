# Contributing to Whistle

Start with a small, reviewable change. Describe the problem, the behavior you want, and how someone can check it.

## Set up your copy

Follow [the local setup guide](docs/LOCAL_PREVIEW.md). Use the pinned Python dependencies and `npm ci` so your installation matches the lockfile.

Keep credentials outside the repository. Enable the push guard with `git config core.hooksPath .githooks`. A full clone is required for the history check.

## Before opening a pull request

- Keep sources, permissions and saved history intact.
- Label fictional data and AI drafts clearly.
- Explain any new setting or service requirement in the relevant guide.
- Run the checks that cover your change. Include failures and remaining work in the pull request.

The backend tests, frontend unit tests, workspace lint and build commands are in [the README](README.md). Browser tests must use an isolated backend because they create accounts and records. SQL policy checks run against the isolated database defined in GitHub verification.

## Write for the next person

Use plain language in labels, comments and documentation. Name the action or result. Explain unusual behavior where it matters; avoid repeating what the code already says.

A pull request should describe what changed, why it matters and what you tested. Mention effects on credentials, access, saved records or external services. Do not include private settings, user records or screenshots containing credentials.

Ask a maintainer to review before merging. This repository does not prescribe a reviewer count or grant contributors permission to merge.
