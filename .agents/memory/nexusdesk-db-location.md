---
name: NexusDesk DB location
description: sqlite.db is at artifacts/api-server/sqlite.db — must target this path for drizzle-kit push.
---

The API server's CWD is `artifacts/api-server/` (pnpm runs scripts from the package directory). So `file:./sqlite.db` resolves to `artifacts/api-server/sqlite.db`.

When running drizzle-kit push from `lib/db/`, you must point to the same file:
```bash
NEXUSDESK_DB_URL=file:../../artifacts/api-server/sqlite.db \
  npx drizzle-kit push --config ./drizzle.config.ts --force
```

**Why:** If you run push from `lib/db/` without overriding the URL, it creates a separate `lib/db/sqlite.db` that the running API server never reads. The tables exist but the app sees an empty DB.
