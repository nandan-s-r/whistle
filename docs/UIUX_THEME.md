# Light and dark appearance — 3 October 2026

The user requested a light/dark toggle. Light remains the blueprint default; the optional dark palette preserves navigation, semantic evidence colours, sources and the same connected workflows.

- The top-bar sun/moon switch is keyboard accessible, has a fixed “Dark mode” accessible name with an on/off state, and offers a 44px target. Authentication screens offer the same control.
- A fixed, trusted bootstrap script restores the validated appearance before hydration. The only stored theme value is `light` or `dark`, under the versioned `vc-scope:theme:v1` key. No account data or credentials are included in this preference.
- The choice survives navigation and reloads and syncs to other open tabs. When the browser refuses preference writes, switching still changes the current page. No provider request occurs on switching.
- Navy surfaces, readable text, borders and status colours apply to company tables, forms, library documents, source drawers and account controls. Existing navy navigation and assistant surfaces remain intentional. This uses semantic colours, without applying an inversion filter to the interface.
- The dark colour layer is generated from the existing light stylesheets to preserve their cascade, responsive layouts and dimensions. Edit `frontend/src/app/theme-tokens.css` for the palette and regenerate with `node scripts/build-theme.cjs` after colour changes to the source stylesheets. The generated `theme.css` is imported last.

## Verified

The production build, TypeScript and scoped lint pass. Six Edge workflows pass; the additional test covers keyboard activation, persistence, cross-tab updates and denied preference writes. Ten workspace routes in both themes at three widths (1440/768/390px) pass 60 layout checks without document overflow. Fifty-two Axe A/AA checks report no detected violations across desktop/mobile pages, authentication, source drawers and account controls. The browser run captured no console or page errors. Reproduce these checks with `node scripts/verify-theme.cjs` while the local app and backend run.

The inspected running-interface screenshots include `screenshots/theme-today-dark-1440.png`, `theme-today-dark-390.png`, `theme-company-dark-1440.png`, `theme-library-dark-1440.png`, `theme-pipeline-dark-1440.png` and `theme-signup-dark.png`.

Automated checks do not replace full assistive-technology testing, browser zoom or user acceptance. This change does not complete the live provider, cloud-worker, hosted-auth, export and deployment requirements in `BLUEPRINT_ACCEPTANCE.md` and `PLATFORM_SETUP.md`.
