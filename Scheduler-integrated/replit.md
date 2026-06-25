# NexusDesk — Academic & Professional Command Center

NexusDesk is a privacy-first academic & professional command center: course attendance tracking, timetable with AI ingest, CGPA simulation, kanban task management, hardware/software project tracking, and daily health routines — all in a Muted Neo Brutalist design.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/nexusdesk run dev` — run the frontend (port 19211)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + TanStack Query + shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec, source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle schema files (one per domain)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/nexusdesk/src/pages/` — Page components (one per route)
- `artifacts/nexusdesk/src/components/` — Shared and domain components
- `artifacts/nexusdesk/src/index.css` — NexusDesk design system (Muted Neo Brutalist)

## Design System — Muted Neo Brutalist

**All rules are enforced globally — never override them:**
- Zero border radius everywhere (`* { border-radius: 0 !important }`)
- Palette: paper (#F1F0E8), ink (#2D2D2D), surface (#E8E7DF), terracotta (#C4614A), sage (#6B7F52), amber (#B8872A)
- Hard offset shadows only: `4px 4px 0px 0px #2D2D2D` — no blur
- Thick borders: `border-2 border-ink` on all structural elements
- Fonts: Space Grotesk (headings), Inter (body), JetBrains Mono (all data values/numbers)
- CSS classes: `.brutal-card`, `.brutal-btn`, `.brutal-btn-primary`, `.brutal-btn-sage`, `.section-label`, `.pill-*`

## Architecture decisions

- OpenAPI-first: all endpoints defined in `lib/api-spec/openapi.yaml`, Orval generates React Query hooks and Zod schemas
- Entity-shaped body schema names (e.g. `SemesterInput`, not `CreateSemesterBody`) to avoid Orval TS2308 collisions
- Tailwind v4: `@apply` in `@layer components` can only use utility classes, NOT other component classes — expand base styles inline
- Attendance stats computed in-memory in the API (no separate stats table)
- CGPA simulation is fully client-side — no API round-trip needed
- Ollama for AI ingest is optional — endpoint gracefully returns error if Ollama isn't running at localhost:11434

## Product

- **Dashboard**: Fluid hour-based timeline (7am–10pm, 80px/hr), day navigation, real-time cursor, one-click attendance marking
- **Courses**: Attendance gauge (flat bar), at-risk highlighting, credit weight display
- **Course Detail**: Grade ledger table, inline add-grade form with scaling support
- **Tasks**: Three-column kanban (ACADEMICS / HARDWARE_DEV / ROUTINE+PERSONAL), status transitions
- **CGPA**: Simulator with sliders for remaining semesters, real-time required-SGPA calculation
- **Projects**: Hardware project tracker with milestones + timestamped dev log
- **Routine**: Steps, sleep, water, weight, workout sessions; 30-day trend
- **Ingest**: Ollama-powered text parser (timetable & tasks)
- **Resources**: Course-grouped links/PDFs
- **Planner**: 7-column weekly grid with exam highlights

## User preferences

_Populate as needed._

## Gotchas

- After adding tables to `lib/db/src/schema/`, run `pnpm run typecheck:libs` before checking artifact packages (stale lib declarations will cause false "no exported member" errors)
- After editing `lib/api-spec/openapi.yaml`, run codegen before anything else
- The API server runs a build step on startup — restart the workflow to pick up route changes
- Tailwind v4: `@apply brutal-btn` inside `.brutal-btn-primary` fails with "unknown utility class" — expand all base utilities inline instead

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
