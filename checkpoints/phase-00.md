# Phase 00 — Foundation

**Status:** done
**Commit:** 9bcbcb6
**Date:** 2026-04-17

## What shipped
- Replaced the default Next starter with a `src/`-based Phase 0 scaffold aligned to the blueprint.
- Added pinned package manifest, pnpm lockfile, `.env.example`, `docker-compose.dev.yml`, README, PROGRESS tracker, and checkpoint scaffolding.
- Added Prisma schema, migration flow, Prisma client generation, MinIO wrapper, BullMQ queue scaffolding, logger, typed env parsing, and worker bootstrap.
- Added Vitest and Playwright smoke coverage plus a minimal foundation homepage.

## Deviations from blueprint
- The initial migration directory was created from the schema before database access was restored; after the user provided a working `.env`, `prisma migrate dev --name initial` confirmed the database was already in sync.
- The root page is marked `dynamic = "force-dynamic"` to avoid a Next.js prerender/runtime issue encountered during `next build` in this environment.

## Acceptance gate output
```text
corepack pnpm install
- succeeded

set -a && source .env && corepack pnpm exec prisma migrate dev --name initial
- succeeded; database already in sync and Prisma Client regenerated

corepack pnpm lint
- passed

corepack pnpm typecheck
- passed

corepack pnpm test
- passed (unit smoke)

corepack pnpm build
- passed after cleaning `.next` and making `/` dynamic

node dist/worker.js with timeout-equivalent wrapper
- worker booted and handled SIGTERM cleanly

next dev smoke on localhost
- passed

corepack pnpm test:e2e
- passed (Playwright smoke after installing Chromium)
```

## Known gaps / follow-ups
- ESLint is intentionally custom/flat and does not use the official Next.js plugin wrapper; `next build` warns but still passes.
- The actual feature work begins in Phase 01.

## Handoff notes for next agent
- Start Phase 01 only; do not skip ahead.
- Use the existing `.env` for DB-backed auth work and add integration coverage around credentials sessions.
