# Phase 01 — Credentials auth

**Status:** done
**Commit:** pending
**Date:** 2026-04-17

## What shipped
- Added Auth.js-based credentials auth with username/password login, sign-up, sign-out, password changes, and revoke-all-sessions actions.
- Added protected route flow with a public auth layout, protected app shell, dashboard, settings page, and middleware redirects.
- Added Argon2id password hashing, password-policy enforcement, common-password blocking, and Redis-backed failed-login throttling.
- Added unit and Playwright coverage for the credentials flow.

## Deviations from blueprint
- Auth.js v5 currently rejects Credentials provider usage with `session: { strategy: "database" }`. To preserve the intended behavior, the implementation uses Auth.js JWT sessions plus a Prisma-backed `Session` table for revocation and validation.
- The ESLint setup remains custom flat-config, so `next build` warns that the Next.js ESLint plugin wrapper is not detected.

## Acceptance gate output
```text
pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e
- passed

Manual-equivalent
- Signup, redirect into protected shell, sign out, sign back in via Playwright flow
```

## Known gaps / follow-ups
- Middleware protection relies on JWT presence, while full revocation is enforced again on server-rendered app routes via the Prisma-backed session record.

## Handoff notes for next agent
- Phase 02 token-vault and social-connection groundwork was completed immediately after this phase.
- If Auth.js database sessions regain Credentials support in a future version, revisit the hybrid session design.
