# Phase 07 — TikTok OAuth + publish

**Status:** done
**Commit:** 9c80a81
**Date:** 2026-04-17

## What shipped
- Added TikTok OAuth helpers, token exchange/refresh client calls, and callback wiring.
- Added TikTok creator-info fetching with Redis-backed 10-minute caching and a settings UI card that surfaces privacy options plus the unaudited-client banner.
- Added TikTok provider implementation for photo direct-post initialization and status polling through the shared provider registry.
- Updated publish-post job handling so TikTok publications can remain in `PUBLISHING` while delayed status-poll jobs resolve them.
- Updated refresh-token handling so TikTok rotates both access and refresh tokens through the shared queue path.

## Deviations from blueprint
- Per user instruction, this phase was implemented without additional test or validation work in this pass.
- The implementation focuses on the photo-first direct-post path; the video-init helper is present at the client level but not yet surfaced through any broader publication UI.

## Acceptance gate output
```text
No new validation run was performed in this pass per explicit user instruction to focus on code only.
```

## Known gaps / follow-ups
- Real TikTok app credentials, verified domains, and an authorized creator account are still required for manual verification.
- Unaudited clients will still be restricted to SELF_ONLY visibility until the app passes TikTok audit.
- The broader publication-management UI that triggers TikTok publications is still future-phase work.

## Handoff notes for next agent
- Resume at Phase 08: AI Influencer library.
- Preserve the delayed status-poll pattern for TikTok publications unless a dedicated webhook integration is added later.
- Keep creator-info caching in place so later publication UI can render privacy options without hammering TikTok on every open.
