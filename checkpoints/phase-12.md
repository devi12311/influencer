# Phase 12 — Posts gallery & publishing UI

**Status:** done
**Commit:** 80ce3d2
**Date:** 2026-04-17

## What shipped
- Added posts gallery filters for influencer, platform, status, and date.
- Added post status badges so each saved post shows publication state by platform.
- Expanded post detail with a publish panel for connected social accounts, caption overrides, options, scheduling input, and retry actions.
- Added publication creation and retry server actions that feed the existing publish job queue.
- Added helpers for querying publishable connections and filtering post lists by publication state.

## Deviations from blueprint
- This pass focused on implementation and did not add or run the specified tests yet.
- Published items currently surface external IDs rather than fully normalized public post URLs because provider APIs return IDs in different shapes and link synthesis is not yet unified.

## Acceptance gate output
```text
No new validation run was performed in this pass; implementation only.
```

## Known gaps / follow-ups
- Schedule input is wired into stored `scheduledAt` and delayed queueing, but the richer scheduling/observability treatment still belongs to Phase 13.
- Post detail remains a single-media view for now; full carousel post preview is still future work.

## Handoff notes for next agent
- Resume at Phase 13: Scheduling & observability.
- Preserve the publication creation/retry actions and delayed queue semantics so Phase 13 can layer health/status tooling on top without reworking the publish panel contract.
- If platform-specific public URLs are added later, keep them alongside provider output handling rather than hardcoding them in the post detail UI.
