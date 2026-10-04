# Whistle warm palette — 4 October 2026

The user explicitly selected this palette and asked for it throughout the website. It supersedes the PDF colour specification; the PDF investment workflows, five destinations, six company tabs and responsive navigation remain in effect.

| Role | Light appearance |
| --- | --- |
| Canvas | Warm ivory `#F7F5F0` |
| Cards, documents and fields | White `#FFFFFF` |
| Navigation and primary text | Warm charcoal `#242321` |
| Supporting text | Stone grey `#68645E` |
| Primary actions and selection accents | Burnt orange `#A94425` |

`frontend/src/app/palette.css` owns the shared roles and is loaded after the existing layout styles. Source styles now use those roles rather than a mixture of old blue/navy hex values. Legacy colour aliases resolve to the same palette; older inline chart and accent styles were also updated. Warm charcoal dark surfaces and copper links preserve readable contrast without changing the orange primary action. Fixed dark navigation/authentication/assistant surfaces have separate readable text roles. Green, amber and red remain labelled evidence/alert semantics rather than brand accents.

The supplied logo PNG, square proportions, frame alignment and generated icons remain intact. This change does not alter auth rules, provider secrets, investment calculations, saved records, external integrations or deployment configuration.

## Verification

The production build passes TypeScript and generates 39 routes. Workspace lint, 13 frontend Node tests and whitespace checks pass. Exact rendered sign-in values were checked for the ivory canvas, charcoal sidebar, orange primary button, white fields and visible theme control in both appearances.

The complete palette audit passes 76 layout checks and 68 Axe states; studio passes 52 states; ecosystem passes 64; public pages pass 20; brand passes 32 plus 30 logo/frame/wordmark alignment checks and served-artwork equality. These 236 Axe states cover desktop/phone and light/dark views. No detected WCAG violations, overflow or captured page errors remain in these checked states. The first audit exposed insufficient Today spotlight text contrast; fixed dark-surface text roles correct it. Visual inspection also caught the faint sign-in theme icon; it now uses the correct foreground in both themes.

A single full run passes all 16 browser workflows. After a final placeholder-only adjustment, the production build and 76-layout/68-state theme audit pass again; sign-in placeholder contrast measures 5.88:1 in light mode and 8.40:1 in dark mode. The workflow/studio/ecosystem/public runs precede that last cosmetic adjustment. The final brand audit also passes again (32 Axe states, 30 alignment checks). See VERIFICATION.md for the exact scope. QA uses disposable synthetic accounts and a process-level rules provider; it does not read private configuration or send research to an external AI provider. The ordinary local backend is restored afterward. These checks establish bounded local UI evidence, not production certification or independent investor usability acceptance.

Screenshots: `screenshots/whistle-login-light-1440.png`, `screenshots/whistle-pipeline-light-1440.png`, their dark/phone variants, and `screenshots/studio-discover-light-1440.png`.
