---
name: NexusDesk env vars
description: DATABASE_URL is Replit's PostgreSQL URL — must use NEXUSDESK_DB_URL for libsql/SQLite to avoid collision.
---

Replit auto-injects `DATABASE_URL` pointing to its managed PostgreSQL instance. libsql (the SQLite client used by NexusDesk) does not understand PostgreSQL URLs and throws `URL_PARAM_NOT_SUPPORTED: sslmode`.

**Rule:** Always use `NEXUSDESK_DB_URL` (not `DATABASE_URL`) everywhere SQLite is touched:
- `lib/db/src/index.ts` — `process.env.NEXUSDESK_DB_URL || "file:./sqlite.db"`
- `lib/db/drizzle.config.ts` — `process.env.NEXUSDESK_DB_URL || "file:./sqlite.db"`
- `setup.sh` — writes `NEXUSDESK_DB_URL=file:$WORKSPACE_DIR/artifacts/api-server/sqlite.db` into `.env`

**Why:** Replit's `DATABASE_URL` secret is always present in the Replit environment and cannot be removed. Any code that reads `DATABASE_URL` will pick up the PostgreSQL URL instead of the intended SQLite path.
