# Phase 06 — Threads OAuth + publish

**Status:** done
**Commit:** 6a5c5d5
**Date:** 2026-04-17

## What shipped
- Added Threads OAuth helpers, Threads Graph client calls, and Threads publisher implementation for single-image and carousel publishing.
- Added the Threads OAuth callback route and connection-start action wiring in Settings → Connections.
- Added Threads provider registration in the shared posting-provider registry.
- Updated refresh-token handling so Threads long-lived tokens can be refreshed through the shared queue path.
- Extended social-connection helpers so Threads credentials can be loaded by the provider.

## Deviations from blueprint
- Per user instruction, this phase was implemented without additional test or validation work in this pass.
- The Threads publisher uses the documented 30-second wait before publish and a lightweight container-status fetch rather than a larger polling framework.

## Acceptance gate output
```text
No new validation run was performed in this pass per explicit user instruction to focus on code only.
```

## Known gaps / follow-ups
- Real Threads app credentials and a tester account are still required for manual verification.
- Publishing assumes media URLs remain publicly reachable over HTTPS.
- The broader publication-management UI that triggers Threads publications is still future-phase work.

## Handoff notes for next agent
- Resume at Phase 07: TikTok OAuth + publish.
- Keep the provider registry / shared publish-job structure intact so TikTok can slot into the same dispatcher.
- Threads caption and reply-control constraints are currently enforced inside the provider implementation; future post-editing UI should expose those knobs.
