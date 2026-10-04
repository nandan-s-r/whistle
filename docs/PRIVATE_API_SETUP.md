# Connect Gemini privately

The workspace calls Gemini from Python on the server. The browser receives provider status and reviewed draft content, never the private Gemini key. Supabase's publishable key is a separate public identifier protected by RLS. Do not paste private keys into chat or a source excerpt. See `PLATFORM_SETUP.md` for the full stack.

1. Open `C:/Users/srnan/AppData/Local/VC Scope OS/backend.env` locally. This file is outside the OneDrive project and Git; a blank Gemini key field has been prepared.
2. Enter your key after `GEMINI_API_KEY=`. Keep `WORKSPACE_PROVIDER=gemini`. Set `GEMINI_MODEL` to a model available to your Google project (the initial configuration uses `gemini-3.8-flash`, as shown in Google's current API examples).
3. Restart the Python backend. The Research assistant shows Gemini and the configured model when both key and model are present. Configuration status does not confirm that a key works; the first successful draft confirms connectivity.
4. Open a company, inspect the assistant scope, select a task and run a draft. Review its citations and approve it as a note or reject it. Claims change only through explicit evidence review.

Never place credentials in a `NEXT_PUBLIC_` variable or the frontend configuration. The backend sends the Gemini key only in an authentication header to Google's fixed HTTPS API destination. It does not include the key in a request URL, prompt, saved workspace, export or provider status. Redirects are disabled. Provider failures use a generic application message; raw provider responses and credentials are not logged by this integration. Synthetic-credential tests check these boundaries and redact known configured credentials from generated draft text.

Running Gemini transmits that company's source records and claims to Google for processing. “Find the weakest assumption” also includes its assumption inputs and rationales; “Explain what changed” includes its five most recent claim reviews and notes. Account owner/reviewer names are omitted from these structured records. Other companies, authentication tokens, full decisions and frozen financial models are outside the current prompt scope. The assistant describes this scope before a run. The integration requests `store: false`; this is not a guarantee about Google's service-level data processing or retention. No external model call runs merely from opening a page or capturing a company/source.

No real Gemini request has been verified yet. Without a configured key and model, the assistant explicitly uses rules and templates. A model never assigns a decision or overwrites approved evidence.

Process environment variables take priority. The backend then loads this private file, followed by the project's `.env` fallback, without overriding already supplied values. `VC_SCOPE_PRIVATE_CONFIG` can point to a different private file. Keep the project fallback free of actual credentials when working inside OneDrive.

Production setup uses the host's secret manager, HTTPS, a private database and operational controls before launch. This local configuration is not a production deployment.

Implementation references: [Google's key handling guidance](https://ai.google.dev/gemini-api/docs/api-key), [generateContent API](https://ai.google.dev/api/generate-content) and [structured output guide](https://ai.google.dev/gemini-api/docs/structured-output), checked on 3 October 2026.
