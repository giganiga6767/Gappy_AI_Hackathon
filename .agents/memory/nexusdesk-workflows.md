---
name: NexusDesk workflow commands
description: Both services need specific env vars set or they crash before binding to a port.
---

## API Server
```
PORT=8080 pnpm --filter @workspace/api-server run dev
```
- `PORT` is required — `artifacts/api-server/src/index.ts` throws if missing.
- The dev script runs esbuild then starts Node. waitForPort: 8080.

## NexusDesk UI
```
PORT=19211 BASE_PATH=/ pnpm --filter @workspace/nexusdesk run dev
```
- Both `PORT` and `BASE_PATH` are required — `artifacts/nexusdesk/vite.config.ts` throws if either is missing.
- waitForPort: 19211 (maps to Replit external port 3000).

## Hardcoded path pattern
`inbox.ts` and `record.ts` both use:
```ts
const WORKSPACE_DIR = process.env.NEXUSDESK_ROOT || path.resolve(process.cwd(), "../..");
```
Since CWD is `artifacts/api-server/`, `../..` gives workspace root. NEXUSDESK_ROOT can override.

**Why:** These env vars are checked at module initialization time, before any request arrives, so the crash is immediate if they're absent.
