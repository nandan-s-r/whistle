# Connected investment workflows - 5 October 2026

These notes explain the read-only Calendly adapter, recorded contact activity and team deal access added on 5 October. The work stays inside Discover, Pipeline, Portfolio and Library. Saved research and account permissions were preserved. Live calendar delivery still needs testing; see [deployment status](DEPLOYMENT.md) for the hosted setup.

## Calendly: selected meetings, read-only internal access

Library → Connections & imports contains a calendar access check, explicit calendar-read consent, bounded meeting preview and selected import into a writable company record. The user chooses the company and confirms permission to retain/share that booking under the deal's existing permissions. Booking metadata does not establish founder identity, attendance, meeting outcome or a founder reply.

The internal adapter requires two **private backend** settings:

```
CALENDLY_ACCESS_TOKEN=<private-token-entered-by-the-operator>
CALENDLY_ACCOUNT_SCOPE=local:<numeric-user-id>
```

For a cloud identity, the scope is `cloud:<Supabase-user-uuid>`. The access panel shows only the current user's scope; it never displays a token or offers a browser token field. Do not send a key to chat. Keep settings outside Git. Generate a token limited to `users:read` and `scheduled_events:read`. Restart the API after the operator saves settings, then select Check calendar access again. In hybrid preview mode, existing provider allowances require cloud sign-in for private-provider work.

The token is bound to exactly one Whistle account. This is for an internal/private workspace; **public multi-customer SaaS requires per-user Calendly OAuth and protected token lifecycle**, not a shared deployment PAT. Multi-user team deal permissions exist separately and do not grant access to another member's calendar. No private runtime configuration was created or opened during this increment, and a live Calendly request has not been verified.

All Calendly requests are GETs to fixed `api.calendly.com` paths with no redirects, an eight-second timeout per call, two-MiB response bounds and an authenticated allowance per request. `/users/me` establishes the token's user, and `/scheduled_events` is filtered to that user. Up to 20 supported meetings within 30 days before/after now are previewed. Pagination is disclosed, not followed through provider-supplied URLs. Events outside the connected user's memberships or supported date/duration range are omitted. Invitee email, private notes, guests, recording links and conferencing credentials are not retained.

Ten-minute signed receipts bind the selected preview to the requesting account. Import validates company access and revision before fetching, checks the current provider event and returns a conflict if it changed. A stable provider-derived ID prevents repeated imports from overwriting meeting notes. Active bookings remain Planned; cancellations remain Cancelled. Attending or completing a review still requires a human outcome. Existing fund permission checks apply to selected shared-deal imports. Automatic ongoing synchronization, scheduling/cancellation writes and webhook receipt are not implemented.

## Pipeline and Portfolio activity

Both views show the latest explicit founder reply, last outbound contact and next future Planned meeting. “Awaiting reply since” means a recorded outbound contact is newer than the latest recorded reply; it is not an inbox observation or a judgment that the founder is late. Missing activity stays unknown. Source captures and calendar imports never count as founder replies.

Company activity entry now accepts an optional original activity time in the user's local timezone, stored as UTC. Past responses no longer need to appear as newly received merely because entered today. Naive/future timestamps are rejected; saving time remains in record revision history. Earlier records retain their recorded dates because their original event time cannot be recovered automatically.

## Connections and team work

The Connections page gives direct links to industry research, Pipeline, Portfolio and Fund access. Its setup catalogue is an optional compact list instead of a wall of cards. GitHub discovery, Calendly and team deal access now appear alongside the existing adapters; states distinguish available/configured from operational acceptance. Fund access still requires explicit membership and deal grants. No broad sharing or permission loosening was performed. Cloud two-user requests and realtime shared-deal updates remain unverified.

Firecrawl MCP balance was checked and remains exhausted (-694 credits). No charged crawl was attempted. Apollo is plan-blocked; direct LinkedIn/X search, licensed funding feeds, CRM synchronization and cloud calendar OAuth remain setup/acceptance work. Chat MCP authentication does not provision Whistle's runtime credentials. Product Hunt/GitHub public collection was verified in the previous increment; live cloud Gemini remains a separate gate.

## Verification and references

The full isolated backend suite passes **174 tests** with actual pinned PyJWT 2.15.1. Twelve new tests cover account/deal access, hybrid capabilities, consent, fixed provider scope, minimal retention, bounded responses/dates, receipts/expiry, stale revisions, changed/cancelled events, idempotency, provider errors/allowances and original reply time. **15 frontend tests**, scoped lint and the **40-route** TypeScript production build pass. Calendar provider responses are fixtures, not live-account acceptance. Browser checks and screenshots are recorded in VERIFICATION.md.

Current original-repository meetings source was reread through the GitHub connector. Its meeting/transcript job informed this continuity, while automatic founder scoring and inferred outcomes were not carried into the calendar adapter.

References: [Calendly authentication](https://developer.calendly.com/docs/authentication/overview), [authorization scopes](https://developer.calendly.com/docs/authentication/scopes), [list events](https://developer.calendly.com/api-docs/calendly-api/scheduled-events/list-scheduled-events), [get event](https://developer.calendly.com/api-docs/calendly-api/scheduled-events/get-scheduled-event).
