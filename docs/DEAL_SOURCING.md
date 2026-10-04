# Source-backed deal sourcing - 4 October 2026

## Industry research and integration follow-up

### Unified industry prompt - 5 October 2026

In Discover, open Deal sourcing and describe the industry or customer problem you want to research. Product Hunt and GitHub are selected initially. Gemini is available only when the account and server settings allow it. The status check shows requirements without exposing keys; a completed request is needed to confirm that a provider works.

Selected fixed-destination requests overlap, keeping successful results if another provider fails or reaches its allowance. Existing authenticated atomic budgets and hybrid cloud-account restrictions remain. Product Hunt matches transparent industry terms in its latest official feed, within 30 days (maximum ten launch references). GitHub uses industry topics/keywords, excludes forks/archives, requires activity within 180 days, filters obvious tutorial/reference collections and returns at most five repositories. Neither feed authors nor repository owners establish founder identity; stars do not establish adoption.

The actual developer-tools run returned four Product Hunt launches (Clair, Sente, Aperture and Singularity) and five GitHub projects. An earlier broad GitHub query returned developer reading lists; the topic/activity filter and regression case correct that observed relevance issue. Established projects can still appear and require analyst review. Consumer, semiconductor and unknown industries have deterministic feed terms; semantic relevance and deep profiles depend on the grounded brief.

Gemini's instruction requests an industry map and up to five sourced company profiles: product, founders' dated professional history, relevance, attention versus customer usage, competitors, contradictory evidence and unknowns. Naming one startup requests a deeper single-company profile. Citation offsets are decoded as UTF-8 bytes so non-ASCII statements retain the right excerpt. Grounded answers stay temporary display-only drafts under existing provider terms. A live grounded cloud answer remains unverified: this local preview account requires cloud sign-in. Direct authenticated LinkedIn/X discovery is not connected; Gemini can find indexed public references, and authorized excerpts remain available in Launches & research notes.

Verification: 162 isolated backend tests using pinned PyJWT, 15 frontend tests, the 40-route production build/TypeScript and scoped lint pass. Browser searches verify both public adapters, retained 13 records, no horizontal overflow at 390px and phone controls of at least 44px. No existing company, claim or decision was changed by the research run. See VERIFICATION.md for screenshots and limits.

Deal sourcing now offers **Industry research** and **Launches & research notes**. A plain-language industry prompt can request founder background, product differentiation, customer usage, competitors and unknowns. Gemini's current Interactions API uses Google Search grounding, bounded responses, provider citations and the configured private model/key. Results are temporary research drafts. The application does not automatically turn Google-grounded answers into a database, crawl their returned links or treat them as verified investment facts; Google's [grounding terms](https://ai.google.dev/gemini-api/terms) restrict those uses. Original-source review and separate authorized intake remain necessary.

Optional fixed-endpoint public GitHub search and Firecrawl public web search have separate statuses and bounded results. A real portal run of **semiconductor inference** returned five GitHub repositories. Their owners, descriptions, stars and update dates are not verified startup identities, founder biographies or customer adoption. This local hybrid account cannot perform paid-provider work; its Gemini status correctly directs the user to cloud sign-in. The Gemini adapter passed synthetic API-shape/citation/error/privacy checks, but a live grounded answer has not been accepted through a cloud session. The installed Firecrawl connector reports exhausted credits; runtime Firecrawl is not configured. Official X access and Apollo plan access remain unavailable. No credentials were opened or displayed.

Pipeline now distinguishes manually recorded **Founder response**, **Outbound contact** and **Analyst note**. It shows last response/contact only when those activity types exist. Source capture and analyst activity never imply a founder replied. Portfolio separates completed holdings from approved investments awaiting completion and shows independently labelled reporting periods, source captures and founder responses. This is recorded activity, not inbox/calendar synchronization or continuously collected financial actuals.

See RELEASE_READINESS.md for returning-account, recovery, worker and deployment setup. The original feed, selected customer excerpts, explicit sourcing intake and existing record history remain available.

The user requested Product Hunt discovery and customer signals from LinkedIn/X, then selected **AI chips and semiconductor infrastructure** for the first run. Discover now has two modes: Saved companies and Deal sourcing. Existing navigation, saved searches and investment records remain.

## Delivered locally

- Product Hunt's official public Atom feed is fetched on demand without a key. Its latest feed is inspected with deterministic sector keywords and an optional literal keyword filter. Results preserve source references, publication/capture dates and explicit gaps. A live check returned HTTP 200, inspected 50 entries, and found **zero chip matches**; no synthetic replacement launches were created.
- Three separately labelled semiconductor research notes are available: d-Matrix, Axelera AI and NeuReality. They are a **4 October snapshot**, not fresh discoveries, current funding opportunities, independent customer endorsements or recommendations. Launch-window filters apply only to feed entries; snapshot keyword filters apply to their summaries.
- A review drawer presents fit reasons, unresolved diligence questions and original links. The feed author is never assumed to be a founder. Geography, stage, founder identity, valuation and fit score stay unknown until established.
- Official X recent-search integration is implemented for a selected candidate, capped at 10 posts. Runtime access needs a private `X_BEARER_TOKEN` and appropriate API access. The current private configuration reports only **not configured**; no token or configuration contents were displayed and no live X request ran.
- LinkedIn/customer review links and authorized excerpts can be inspected manually. Possible usage, mixed/negative evidence, discussion/praise and interested-party statements remain distinct. This is a conservative rules-based prompt for review, not sentiment analysis or proof of customer obsession. Repeated excerpts collapse; distinct URLs/authors do not establish independence.
- Explicit Save to research creates a company with source-linked **Unreviewed** notes and no score, approval or Pipeline membership. User-supplied social excerpts require a retention confirmation. A duplicate company opens its existing record without replacing its history or adding hidden notes.

## Boundaries

Public feed calls have authenticated, atomic owner/global rate limits, a fixed destination, no redirects, response-size limits and safe XML parsing. Local hybrid accounts can use this keyless feed; existing paid-provider allowances and cloud requirements remain unchanged. Signed, expiring receipts bind candidate content to its requesting account. Keys stay server-side, provider error bodies are not reflected, and failed collections show unavailable status.

No automatic LinkedIn scraping, login bypass, outbound messages, commercial Product Hunt API usage, unrestricted market crawl, continuous monitoring or AI-generated conviction score was added. The installed Firecrawl chat connector was used for bounded public research; it does not configure Whistle's runtime key. Full-market search and customer-facing licensing remain open work. No deployment, GitHub push or investment transaction occurred.

## Source references

- [Product Hunt official RSS documentation](https://help.producthunt.com/en/articles/484970-does-product-hunt-have-an-rss-feed), linking to the official feed.
- [Product Hunt API documentation](https://api.producthunt.com/v2/docs): its commercial API requires provider permission. The public-feed implementation is separate; production redistribution rights still need review.
- [X recent-search documentation](https://docs.x.com/x-api/posts/search-recent-posts).
- [LinkedIn scraping restrictions](https://www.linkedin.com/help/linkedin/answer/a1341387/prohibition-of-scraping-software?intendedLocale=en&lang=en-us): authorized notes are the current product path.
- [d-Matrix July update](https://www.d-matrix.ai/newsletter/july-newsletter/): company-reported Parasail collaboration; independent repeat-order evidence is absent.
- [Axelera commercial update](https://axelera.ai/news/axelera-ai-secures-more-than-250-million-funding-on-global-commercial-growth): company-reported customer shipments; evaluation-kit/production distinction needs diligence.
- [NeuReality deployment guide](https://developer.neureality.ai/docs/user-guide/deployment-api.html): technical integration evidence, not customer-adoption evidence.

## Verification

131 backend tests and 13 frontend tests passed after the initial implementation. After adding the separate keyless-feed allowance and official-X adapter checks, all 45 affected sourcing/platform/security tests pass, including the hybrid-account quota test and mocked X request/deduplication/error checks. Production build, TypeScript and targeted React lint pass. Live public-feed collection returns real limited-coverage results. Final browser observations and screenshots are recorded in VERIFICATION.md. Persistent QA-account creation was rejected by automatic approval review; save behavior is verified in isolated database fixtures rather than by altering the user's records. Hosted X acceptance, commercial licensing, independent investor acceptance and continuous source coverage remain unverified.
