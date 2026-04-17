# Phase 02 — Token vault & SocialConnection

**Status:** done
**Commit:** pending
**Date:** 2026-04-17

## What shipped
- Added AES-256-GCM token vault utilities with optional context binding for cross-user isolation.
- Added social-connection service helpers for upsert, token decryption, listing, reauth marking, and revocation-safe deletion behavior.
- Added OAuth state/PKCE helpers stored in Redis with HMAC validation and TTL.
- Added refresh-token worker scaffold, expiring-token scan scheduling, and the settings/connections UI placeholder.
- Added unit coverage for the vault and social-connection service, plus an extended E2E flow that verifies the empty connections page.

## Deviations from blueprint
- Provider-specific token refresh is still a stub that marks the connection as needing reauth, because real refresh implementations belong to the later platform phases.
- The repeatable refresh scan uses a sentinel job payload on the existing `refresh-token` queue instead of introducing a new queue name before the provider phases land.

## Acceptance gate output
```text
pnpm test
- passed (crypto + service tests)

pnpm typecheck && pnpm build
- passed

Manual-equivalent
- `/settings/connections` renders the empty placeholder after authenticated sign-in
```

## Known gaps / follow-ups
- Refresh behavior intentionally stops at `needs_reauth` until platform-specific refresh APIs are implemented in phases 4–7.
- The local `.env` required normalization for missing `AUTH_SECRET`, `MASTER_KEY`, and MinIO URL schemes so the app could boot against the provided environment.

## Handoff notes for next agent
- Phase 03 is the next active phase: build the MinIO + Sharp media pipeline, upload actions, and dropzone experience.
- Keep the token vault context-aware; later provider phases should continue sealing tokens with the owning `userId`.
