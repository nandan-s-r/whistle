# PostgreSQL preparation

This guide describes the optional legacy SQLAlchemy migration path. The primary cloud workspace now uses the separate Supabase project and its `vc_*` tables, RLS and Storage; see `PLATFORM_SETUP.md`. This script does not migrate local workspace records into Supabase's new schema or link local and cloud identities. The local preview preserves SQLite accounts while Supabase sign-in opens its own cloud workspace.

The Python API supports PostgreSQL through SQLAlchemy and psycopg 3. The psycopg driver is installed in the local virtual environment. PostgreSQL URLs beginning with `postgres://` or `postgresql://` are normalized to the psycopg driver; explicit driver URLs are retained. Database metadata compiles against PostgreSQL in automated checks.

No PostgreSQL server or Docker runtime is available in the current environment. The preview therefore still saves to the existing local SQLite database. No data migration has been run.

## Start a database when Docker is available

Set a private `POSTGRES_PASSWORD` in the external backend configuration. Then run from the repository root, passing that file to Compose:

```powershell
docker compose --env-file "$env:LOCALAPPDATA\VC Scope OS\backend.env" -f compose.postgres.yml up -d
```

The supplied PostgreSQL 17 service binds to localhost, uses a named volume and exposes a readiness check. It uses database/user `vc_scope`; the password must be supplied privately. Do not delete the volume to retry configuration.

## Preserve local work when switching

1. Stop both local application servers. Back up `antigravity.db` privately.
2. Set `POSTGRES_MIGRATION_URL` in the external private configuration to the intended **empty** PostgreSQL database using a `postgresql+psycopg://` URL. Percent-encode special characters in credentials. The script reads this value without displaying it.
3. Run `venv\Scripts\python.exe scripts\migrate_sqlite_to_postgres.py` from the repository root.
4. The script refuses a nonempty destination, copies registered tables in foreign-key order, checks row counts and resets serial sequences. Inserts run in one destination transaction. It leaves SQLite intact. Schema creation can remain after a failed copy; sequence advances can remain, but destination record writes roll back. Concurrent source edits are unsupported; keep the app stopped.
5. After successful migration, set `DATABASE_URL` privately to that PostgreSQL URL and restart the backend and frontend. Verify login, company history and a new save.

Do not point the application to an empty database before migration if you intend to preserve the local users and research. For a fresh database, user setup and demonstration seeding are explicit choices.

Live PostgreSQL integration, restore drills and migration execution still require an available server. Schema compilation checks do not replace those checks.
