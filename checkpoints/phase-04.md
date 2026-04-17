# Phase 04 — Instagram OAuth + publish

**Status:** done
**Commit:** ceb338c
**Date:** 2026-04-17

## What shipped
- Added the `PostingProvider` abstraction and an Instagram provider registry entry.
- Added Instagram OAuth helpers, Graph client wrapper, and publisher implementation for single-image and carousel publishing.
- Added the Instagram OAuth callback route that consumes signed state, exchanges tokens, and upserts a social connection.
- Added connection actions/UI for connect, disconnect, and force-refresh from Settings → Connections.
- Added `publish-post` job wiring and Instagram-specific image preparation for JPEG/HTTPS publishing.
- Updated the refresh-token job to actually refresh Instagram long-lived tokens.

## Deviations from blueprint
- Per user instruction, this phase was implemented without additional test or validation work in this pass.
- The code assumes the configured media host can serve Instagram-reachable HTTPS URLs; local `.env` may still need host tuning when manually exercising publishing.

## Acceptance gate output
```text
No new validation run was performed in this pass per explicit user instruction to focus on code only.
```

## Known gaps / follow-ups
- Real Instagram app credentials and a tester account are still required to verify the OAuth and publish flow manually.
- The publishing path is coded, but no post-creation UI exists yet to enqueue Instagram publications from the app.
- The media host must remain reachable over public HTTPS for Instagram to fetch publish assets.

## Handoff notes for next agent
- Resume at Phase 05: Facebook Page OAuth + publish.
- Keep the provider-registry / publish-job pattern so later platforms slot into the same dispatcher.
- If you validate Instagram manually later, ensure `MINIO_PUBLIC_BASE_URL` points to the S3/API host and not the MinIO Console host.
