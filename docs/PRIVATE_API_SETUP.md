# Set up Gemini privately

Gemini runs through the Python API. The browser receives task status and draft results, not your private key. Supabase's public publishable key is a different credential.

## Local setup

Use a private file outside the repository. On Windows, the backend supports `%LOCALAPPDATA%/VC Scope OS/backend.env` and the separate `%LOCALAPPDATA%/Whistle/Gemini Settings.txt` settings file. Create the parent folder if it does not exist. Keep an existing private file in place rather than moving it for a branding change.

Enter these settings yourself:

```text
WORKSPACE_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=
```

Fill in the key and a model available to your Google project. This guide does not verify a particular model's availability. Save the file and restart the API.

Process environment settings take priority. `VC_SCOPE_PRIVATE_CONFIG` can select a different private backend file. See [platform setup](PLATFORM_SETUP.md) for loading and worker details.

## Hosted setup

Enter the same settings in the API host's secret settings. A local key does not move to Vercel automatically. Do not put it in the website project or any `NEXT_PUBLIC_` variable.

Hosted Gemini is not yet configured in the Whistle release. [Deployment notes](DEPLOYMENT.md) list the current setup.

## Check the connection

Open a company, inspect the assistant's scope, choose a task and run a draft with non-confidential material. A configured label means settings are present; a successful task is needed to confirm the connection.

Review the returned citations. Approve a useful draft as a note or reject it. Gemini cannot approve a decision or overwrite reviewed evidence by itself. Without a configured key and model, the assistant uses rules and templates.

## What leaves the workspace

A task sends the selected company's source excerpts and claims to Google. An assumption task also includes its inputs and reasoning. A change-review task includes recent claim reviews and notes. The assistant shows the scope before a run.

Other companies, authentication tokens, full decisions and frozen financial models are outside the current assistant prompt scope. The integration requests `store: false`; this does not guarantee Google's service-level retention.

The key goes in an authentication header to Google's fixed HTTPS destination. Redirects are disabled. Provider failures return a generic message. Tests use synthetic credentials to check that keys stay out of status, prompts, exports and draft text. No model call runs merely because someone opens a page.

Never paste private keys into chat, a source excerpt or a tracked file.

References: [Google API key guidance](https://ai.google.dev/gemini-api/docs/api-key), [generateContent](https://ai.google.dev/api/generate-content), [structured output](https://ai.google.dev/gemini-api/docs/structured-output).
