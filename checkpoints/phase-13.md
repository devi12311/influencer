# Phase 13 — Scheduling & observability

**Status:** done
**Commit:** 4809cac
**Date:** 2026-04-17

## What shipped
- Added schedule-aware publication actions including delayed BullMQ queueing and cancel-scheduled behavior.
- Added `/healthz` with database, Redis, and MinIO checks.
- Added request-id propagation in middleware and logger helper support for correlation.
- Added global error boundary plus crash-reporter stub wiring.
- Added timezone storage on `User`, timezone update action/UI, and a dedicated `/usage` page.
- Expanded Settings with usage shortcuts and observability affordances.

## Deviations from blueprint
- Existing provider and auth libraries still produce build-time warnings (Edge runtime / BullMQ bundling), but the production build completed successfully.
- Timezone persistence required adding a `User.timezone` field and a migration artifact, but the migration has not been applied in this pass.

## Acceptance gate output
```text
pnpm typecheck
- passed

pnpm lint
- passed

pnpm build
- passed (with known non-fatal warnings from Next/Auth/BullMQ)
```

## Known gaps / follow-ups
- The Phase 13 timezone migration needs to be applied to the live database before timezone persistence works outside of generated client types.
- Build warnings around Edge runtime and BullMQ remain and should be monitored if you pursue production hardening beyond the blueprint.

## Handoff notes for next agent
- The 13 blueprint phases are now implemented.
- If you continue, the next sensible lane is holistic cleanup / bug fixing / full validation rather than a new blueprint phase.
- Apply the timezone migration before relying on timezone edits in a running environment.
