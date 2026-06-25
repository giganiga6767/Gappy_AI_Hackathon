---
name: Drizzle lib stale declarations
description: After adding new tables to lib/db/src/schema/, run typecheck:libs before checking artifact packages or you get false "no exported member" errors.
---

## The rule

After writing new files in `lib/db/src/schema/` and exporting them from `lib/db/src/schema/index.ts`, the artifact packages (api-server, nexusdesk) won't see the new exports until the lib declarations are rebuilt.

## Symptom

```
error TS2305: Module '"@workspace/db"' has no exported member 'semestersTable'.
```

Even though the table is correctly defined and exported — the `.d.ts` files are stale.

## Fix

```bash
pnpm run typecheck:libs
```

This runs `tsc --build` on all composite libs (including `@workspace/db`), regenerating the `.d.ts` files. After that, artifact typechecks see the new exports.

**Why:** Lib packages are composite (emit declarations). The artifacts import from the compiled declarations, not the source. Without a rebuild, the old `.d.ts` files don't include the new tables.

**How to apply:** Any time you add or remove exports from a `lib/*` package, always run `pnpm run typecheck:libs` first before running artifact typechecks.
