# AI INFLUENCER — Production Blueprint

> **Single source of truth for an autonomous agent to build this system end-to-end.**
>
> Read §0 first — it defines the contract between you (the implementing agent) and this document. If your context is reset mid-build, §0 and `PROGRESS.md` are enough to resume without re-reading everything.

---

## Table of contents

- [§0 Operating contract (READ FIRST)](#0-operating-contract-read-first)
- [§1 Product](#1-product)
- [§2 Locked technology decisions](#2-locked-technology-decisions)
- [§3 Architecture](#3-architecture)
- [§4 Domain model (Prisma)](#4-domain-model-prisma)
- [§5 Security baseline](#5-security-baseline)
- [§6 Phase 0 — Foundation](#6-phase-0--foundation)
- [§7 Phase 1 — Credentials auth](#7-phase-1--credentials-auth)
- [§8 Phase 2 — Token vault & SocialConnection](#8-phase-2--token-vault--socialconnection)
- [§9 Phase 3 — Media pipeline (MinIO + Sharp)](#9-phase-3--media-pipeline-minio--sharp)
- [§10 Phase 4 — Instagram OAuth + publish](#10-phase-4--instagram-oauth--publish)
- [§11 Phase 5 — Facebook Page OAuth + publish](#11-phase-5--facebook-page-oauth--publish)
- [§12 Phase 6 — Threads OAuth + publish](#12-phase-6--threads-oauth--publish)
- [§13 Phase 7 — TikTok OAuth + publish](#13-phase-7--tiktok-oauth--publish)
- [§14 Phase 8 — AI Influencer library](#14-phase-8--ai-influencer-library)
- [§15 Phase 9 — Prompt gallery](#15-phase-9--prompt-gallery)
- [§16 Phase 10 — Nano Banana generation adapter](#16-phase-10--nano-banana-generation-adapter)
- [§17 Phase 11 — Post creation wizard](#17-phase-11--post-creation-wizard)
- [§18 Phase 12 — Posts gallery & publishing UI](#18-phase-12--posts-gallery--publishing-ui)
- [§19 Phase 13 — Scheduling & observability](#19-phase-13--scheduling--observability)
- [§20 UI/UX reference patterns](#20-uiux-reference-patterns)
- [§21 Testing strategy](#21-testing-strategy)
- [§22 API appendix — full curl flows](#22-api-appendix--full-curl-flows)
- [§23 DO NOT list (agent anti-patterns)](#23-do-not-list-agent-anti-patterns)

---

## §0 Operating contract (READ FIRST)

### 0.1 You are the implementing agent

This blueprint is written **for you**. You may have a freshly cleaned context. Before doing any work, you MUST:

1. Read this entire §0.
2. `cat PROGRESS.md` at the repo root. If it does not exist, you are on Phase 0.
3. If `PROGRESS.md` exists, find the last row with `status=in_progress` or the first with `status=pending`. That is your current phase.
4. Read that phase's section in this document (§6–§19).
5. Read the matching `checkpoints/phase-NN.md` file if it exists — it contains the prior agent's handoff notes.
6. Only then begin work.

**Do not skip phases. Do not work on multiple phases simultaneously. Do not invent features outside this blueprint.**

### 0.2 Phase lifecycle

Every phase follows the same five-step loop:

```
  ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
  │ 1. Review  │──▶│ 2. Plan    │──▶│ 3. Build   │──▶│ 4. Verify  │──▶│ 5. Commit  │
  │ blueprint  │   │ tasks      │   │ code+tests │   │ acceptance │   │ + handoff  │
  └────────────┘   └────────────┘   └────────────┘   └────────────┘   └────────────┘
```

**Step 1 Review** — Re-read the phase section top-to-bottom. Note every "MUST" and every "Acceptance" bullet.

**Step 2 Plan** — Use TodoWrite (or equivalent) to list the concrete files you will create/edit. Do not start coding until the plan fits in one screen.

**Step 3 Build** — Write code + tests in the same PR-sized unit. No partial features — if the acceptance criteria demands a full CRUD, ship the full CRUD. No stubs marked `// TODO` left behind.

**Step 4 Verify** — Run every command in the phase's *Acceptance gate* block. If any fails, fix and re-run. Do not move on with a red gate.

**Step 5 Commit & handoff** — Create `checkpoints/phase-NN.md` using the [template](#05-checkpoint-file-template). Update `PROGRESS.md`. Commit with message `phase(NN): <one-liner>`.

### 0.3 PROGRESS.md format

At repo root, a single markdown table. Example:

```markdown
# Build progress

| Phase | Title                           | Status      | Commit  | Notes                         |
|-------|---------------------------------|-------------|---------|-------------------------------|
| 00    | Foundation                      | done        | a1b2c3d | docker-compose.dev up clean   |
| 01    | Credentials auth                | done        | b2c3d4e | argon2id, signup/login E2E OK |
| 02    | Token vault                     | in_progress |         | stuck on key-rotation test    |
| 03    | Media pipeline                  | pending     |         |                               |
| ...   | ...                             | pending     |         |                               |
```

One row per phase. Statuses: `pending`, `in_progress`, `done`, `blocked` (with blocker in Notes).

### 0.4 Context-rot recovery

If you suspect your context has drifted or been truncated:

1. **STOP coding.**
2. Read `PROGRESS.md`.
3. Read the current phase's `checkpoints/phase-NN.md`.
4. Run the acceptance gate commands for the last `done` phase to verify the codebase is still in a valid state.
5. Re-read the current phase section from this blueprint.
6. If something doesn't match what the checkpoint claims, trust the code (run the acceptance gate) and update the checkpoint/progress accordingly.

### 0.5 Checkpoint file template

`checkpoints/phase-NN.md`:

```markdown
# Phase NN — <Title>

**Status:** done | blocked
**Commit:** <short sha>
**Date:** YYYY-MM-DD

## What shipped
- Bullet list of concrete deliverables (files, endpoints, UI screens)

## Deviations from blueprint
- Anything you did differently and why. If empty, write "none".

## Acceptance gate output
```
<paste output of gate commands>
```

## Known gaps / follow-ups
- Bullets. If empty, "none".

## Handoff notes for next agent
- Anything the next phase's agent needs to know that isn't in the blueprint.
```

### 0.6 Non-negotiables

- **No partial features.** Every phase ships working end-to-end.
- **No test-skipping.** `vitest --run` and `playwright test` must be green before commit.
- **No secrets in git.** `.env` is gitignored; ship `.env.example`.
- **No mutable schema edits without a migration.** `prisma migrate dev` creates every schema change.
- **No direct fetch() to social platforms from React components.** Every external call goes through a server-side provider module.
- **No `any`.** If TypeScript can't express it, write a Zod schema and infer.
- **No feature flags, no backwards-compat shims** — this is greenfield; just change the code.
- **No speculative abstractions.** YAGNI. Build the concrete thing, extract an interface only when a second impl arrives.

### 0.7 Dependencies the user provides

The user deploys these. Treat them as given; do NOT include them in your code or docker-compose:

- PostgreSQL (via `DATABASE_URL`)
- MinIO (via `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`)
- Redis (via `REDIS_URL`)

You DO ship a `docker-compose.dev.yml` for local dev that spins these up, so you can run locally without the prod stack. Mark it clearly as **development-only**.

---

## §1 Product

### 1.1 What we're building

A self-hosted, multi-user web app for AI-assisted social media content creation. Flow in one sentence:

> A user connects their Instagram/Facebook/Threads/TikTok accounts, uploads reference photos of their AI influencers, saves prompts, generates photos with Nano Banana, and posts them to selected platforms.

### 1.2 Personas

- **Creator** — end user. Manages multiple influencers, posts content, reviews gallery.

There is no admin, no team mode, no billing. Single-tier multi-tenant (each user owns their own data, strictly isolated by `userId`).

### 1.3 Core flows

1. **Sign up** with username + password → email verification (optional v1) → dashboard.
2. **Connect social** → OAuth round-trip → tokens stored encrypted → connection appears in Settings → Connections.
3. **Create influencer** → name + description + upload 1–5 canonical reference photos (these drive face consistency).
4. **Create prompt** → text (+ optional 1–4 reference images) → save to gallery.
5. **New post** (the wizard): pick influencer → pick prompt → generate (Nano Banana combines influencer refs + prompt refs + prompt text) → preview → regenerate or accept → save to posts gallery.
6. **Publish** from posts gallery: pick one or more connected social accounts → per-platform caption editor → publish now or schedule → status updates as jobs complete.

### 1.4 Out of scope v1

Analytics, DM/reply management, video generation, team accounts, billing, mobile apps.

---

## §2 Locked technology decisions

| Concern | Choice | Reason (do not relitigate) |
|---|---|---|
| Framework | **Next.js 15**, App Router, Server Actions, RSC | User-chosen |
| Language | **TypeScript**, strict mode | Non-negotiable |
| DB | **PostgreSQL** (user-provided) | User-chosen |
| ORM | **Prisma 5+** | User-chosen |
| Object storage | **MinIO** (S3-compatible; AWS SDK v3) | User-chosen |
| Queue | **BullMQ** + Redis (user-provided) | Standard, battle-tested |
| Auth | **Auth.js v5 (NextAuth)**, Credentials + custom OAuth providers | Credentials for username/password; custom providers for IG/FB/TT/Threads |
| Password hash | **argon2id** (`@node-rs/argon2`) | OWASP recommended |
| Token encryption | **AES-256-GCM** envelope encryption (see §5.3) | Required for OAuth token storage |
| Validation | **Zod** everywhere (env, forms, API, DB boundaries) | |
| Image processing | **Sharp** | Thumbnails, WebP conversion |
| UI | **shadcn/ui** + **Tailwind v4** + **Radix** | |
| Client data | **TanStack Query** + Server Actions | No REST/tRPC needed |
| Forms | **react-hook-form** + Zod resolver | |
| Lightbox | **yet-another-react-lightbox** | |
| Masonry gallery | **react-photo-album** (masonry + rows + columns modes) | |
| Image gen | **Nano Banana** (`gemini-2.5-flash-image` via `@google/genai`) | User-chosen |
| Testing | **Vitest** (unit/integration) + **Playwright** (E2E) | |
| Lint/format | **ESLint** (flat config) + **Prettier** | |
| Logger | **pino** + pino-pretty (dev) | |
| Env parsing | **@t3-oss/env-nextjs** + Zod | |
| Monorepo? | **No.** Single Next.js app. | KISS |

### 2.1 Node / package manager

Node 22 LTS. Package manager: **pnpm**. Lock to specific major versions in `package.json`.

---

## §3 Architecture

### 3.1 Directory layout

```
/
├── .env.example
├── docker-compose.dev.yml         # Postgres/MinIO/Redis for LOCAL DEV ONLY
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (app)/                 # Authenticated shell
│   │   │   ├── layout.tsx         # sidebar + top bar
│   │   │   ├── page.tsx           # dashboard
│   │   │   ├── influencers/
│   │   │   ├── prompts/
│   │   │   ├── posts/
│   │   │   ├── new-post/          # the wizard
│   │   │   └── settings/
│   │   │       └── connections/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── oauth/
│   │   │   │   ├── instagram/callback/route.ts
│   │   │   │   ├── facebook/callback/route.ts
│   │   │   │   ├── threads/callback/route.ts
│   │   │   │   └── tiktok/callback/route.ts
│   │   │   └── webhooks/          # future
│   │   └── globals.css
│   ├── server/                    # SERVER-ONLY code (never imported from client)
│   │   ├── auth.ts                # Auth.js config
│   │   ├── db.ts                  # Prisma client singleton
│   │   ├── env.ts                 # zod-validated env
│   │   ├── logger.ts
│   │   ├── crypto/
│   │   │   └── vault.ts           # envelope encryption
│   │   ├── storage/
│   │   │   └── minio.ts           # S3Client wrapper, presign helpers
│   │   ├── queue/
│   │   │   ├── connection.ts      # ioredis + BullMQ
│   │   │   ├── queues.ts          # typed queue registry
│   │   │   └── worker-base.ts
│   │   ├── providers/             # Social platform abstractions
│   │   │   ├── posting-provider.ts # INTERFACE
│   │   │   ├── instagram/
│   │   │   │   ├── oauth.ts
│   │   │   │   ├── client.ts      # authed Graph calls
│   │   │   │   └── publisher.ts   # implements PostingProvider
│   │   │   ├── facebook/
│   │   │   ├── threads/
│   │   │   └── tiktok/
│   │   ├── image-generation/
│   │   │   ├── generator.ts       # INTERFACE
│   │   │   └── nano-banana.ts     # impl
│   │   ├── jobs/                  # BullMQ job definitions
│   │   │   ├── refresh-token.ts
│   │   │   ├── generate-image.ts
│   │   │   ├── publish-post.ts
│   │   │   ├── derive-thumbnails.ts
│   │   │   └── index.ts           # boots worker process
│   │   └── services/              # Domain services (pure logic; call db + providers)
│   │       ├── influencer.ts
│   │       ├── prompt.ts
│   │       ├── post.ts
│   │       ├── generation.ts
│   │       └── social-connection.ts
│   ├── actions/                   # Server Actions (thin wrappers over services)
│   │   ├── influencer.ts
│   │   ├── prompt.ts
│   │   ├── post.ts
│   │   └── connection.ts
│   ├── components/
│   │   ├── ui/                    # shadcn primitives
│   │   ├── gallery/
│   │   ├── upload/
│   │   ├── wizard/
│   │   └── ...
│   ├── lib/                       # Client-safe utilities
│   │   ├── zod-schemas.ts
│   │   ├── date.ts
│   │   └── cn.ts
│   └── worker.ts                  # Entrypoint for the worker process
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── checkpoints/                   # Phase handoff notes (see §0.5)
├── PROGRESS.md
└── package.json
```

### 3.2 Process topology

Two Node processes in production:

1. **Web** — `next start`. Serves pages, Server Actions, webhook routes.
2. **Worker** — `node dist/worker.js`. Runs BullMQ consumers for: `refresh-token`, `generate-image`, `publish-post`, `derive-thumbnails`.

They share: PostgreSQL, MinIO, Redis.

### 3.3 Module boundaries

- `src/server/providers/*` — the ONLY code that talks to social platforms. Every external HTTP call lives here. Each provider exports:
  - An OAuth module (authorize URL builder, code→token exchange, refresh)
  - A `Publisher` that implements the `PostingProvider` interface (§10.1)
- `src/server/services/*` — domain logic. No HTTP, no React. Pure TypeScript + Prisma + provider calls.
- `src/actions/*` — thin Server Actions. Parse input with Zod → call a service → return a typed result. No business logic.
- `src/app/**/page.tsx` — React Server Components. Fetch data via services directly (not via actions). Actions are for mutations triggered by the client.
- `src/server/jobs/*` — BullMQ job handlers. Each handler is pure: receives job data, calls services/providers, returns result.

**Dependency rule:** `components` → `actions` → `services` → `providers`/`db`. Never upward.

---

## §4 Domain model (Prisma)

This is the v1 schema. Do not add tables not listed here until their phase. Do not remove fields.

```prisma
// prisma/schema.prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

// ─────────────────────────── Auth ───────────────────────────

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  username        String    @unique
  passwordHash    String                          // argon2id
  emailVerifiedAt DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  sessions          Session[]
  socialConnections SocialConnection[]
  influencers       Influencer[]
  prompts           Prompt[]
  generations       Generation[]
  posts             Post[]
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  sessionToken String   @unique
  expiresAt    DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

// ──────────────────────── Social connections ────────────────

enum SocialPlatform {
  INSTAGRAM
  FACEBOOK_PAGE
  THREADS
  TIKTOK
}

model SocialConnection {
  id                String         @id @default(cuid())
  userId            String
  platform          SocialPlatform
  externalAccountId String                         // IG user id, Page id, Threads user id, TikTok open_id
  displayName       String?
  avatarUrl         String?
  scopes            String[]
  // Encrypted tokens (AES-256-GCM envelope; see §5.3). Stored as base64(iv|ciphertext|tag|keyWrap).
  accessTokenCt     String         @db.Text
  refreshTokenCt    String?        @db.Text
  accessExpiresAt   DateTime?
  refreshExpiresAt  DateTime?
  // Platform-specific JSON (e.g. FB Page token, IG-Business-Account vs Graph-user distinction)
  meta              Json?
  status            String         @default("active")  // active | needs_reauth | revoked
  connectedAt       DateTime       @default(now())
  lastRefreshedAt   DateTime?

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  posts PostPublication[]

  @@unique([userId, platform, externalAccountId])
  @@index([userId, platform])
}

// ────────────────────────── Influencer ──────────────────────

model Influencer {
  id          String   @id @default(cuid())
  userId      String
  name        String
  description String?
  // Style notes carried into every generation prompt (e.g. "warm lighting, 35mm film look")
  styleNotes  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user   User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  assets InfluencerAsset[]
  posts  Post[]
  generations Generation[]

  @@index([userId])
}

model InfluencerAsset {
  id            String   @id @default(cuid())
  influencerId  String
  // MinIO object key. We store original + variants (thumb, medium) as separate MediaObject rows.
  mediaObjectId String   @unique
  // Canonical refs are the 1–5 photos used to drive face consistency in generation.
  // Non-canonical are additional library photos.
  isCanonical   Boolean  @default(false)
  sortOrder     Int      @default(0)
  createdAt     DateTime @default(now())

  influencer   Influencer  @relation(fields: [influencerId], references: [id], onDelete: Cascade)
  mediaObject  MediaObject @relation(fields: [mediaObjectId], references: [id])

  @@index([influencerId, isCanonical])
}

// ─────────────────────────── Prompts ────────────────────────

model Prompt {
  id          String   @id @default(cuid())
  userId      String
  title       String
  text        String   @db.Text
  tags        String[]
  isFavorite  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user       User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  references PromptReference[]
  generations Generation[]

  @@index([userId, isFavorite])
}

model PromptReference {
  id            String   @id @default(cuid())
  promptId      String
  mediaObjectId String
  sortOrder     Int      @default(0)   // 0..3 (max 4 per prompt — enforce in service)

  prompt      Prompt      @relation(fields: [promptId], references: [id], onDelete: Cascade)
  mediaObject MediaObject @relation(fields: [mediaObjectId], references: [id])

  @@index([promptId])
}

// ────────────────────────── Media (MinIO) ───────────────────

enum MediaKind {
  INFLUENCER_ASSET
  PROMPT_REFERENCE
  GENERATED_IMAGE
  POST_MEDIA
}

model MediaObject {
  id           String     @id @default(cuid())
  userId       String
  kind         MediaKind
  bucket       String
  objectKey    String     @unique   // e.g. users/<uid>/influencers/<iid>/abc.jpg
  mimeType     String
  sizeBytes    BigInt
  width        Int?
  height       Int?
  // SHA-256 for dedup; also proof-of-integrity.
  contentHash  String?
  // SynthID presence (for Nano Banana outputs). NULL for uploaded media.
  synthId      Boolean?
  createdAt    DateTime   @default(now())

  variants MediaVariant[]
  influencerAssets  InfluencerAsset[]
  promptReferences  PromptReference[]

  @@index([userId, kind])
}

model MediaVariant {
  id            String    @id @default(cuid())
  mediaObjectId String
  label         String    // "thumb" | "medium" | "webp" etc.
  bucket        String
  objectKey     String    @unique
  mimeType      String
  width         Int
  height        Int
  sizeBytes    BigInt

  mediaObject MediaObject @relation(fields: [mediaObjectId], references: [id], onDelete: Cascade)

  @@unique([mediaObjectId, label])
}

// ─────────────────────── Generation jobs ────────────────────

enum GenerationStatus {
  PENDING
  RUNNING
  SUCCEEDED
  FAILED
}

model Generation {
  id           String           @id @default(cuid())
  userId       String
  influencerId String
  promptId     String
  // Snapshot of prompt text at generation time (prompts can mutate later).
  promptSnapshot String         @db.Text
  // Snapshot of the exact MediaObject IDs sent to Nano Banana (influencer canonical + prompt refs).
  inputMediaIds String[]
  model        String           // "gemini-2.5-flash-image" etc.
  aspectRatio  String           // "1:1", "4:5", "9:16", …
  imageSize    String           // "1K" | "2K"
  status       GenerationStatus @default(PENDING)
  errorMessage String?
  outputMediaId String?         // set when SUCCEEDED
  tokensIn     Int?
  tokensOut    Int?
  costUsd      Decimal?         @db.Decimal(10, 6)
  startedAt    DateTime?
  finishedAt   DateTime?
  createdAt    DateTime         @default(now())

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  influencer   Influencer   @relation(fields: [influencerId], references: [id])
  prompt       Prompt       @relation(fields: [promptId], references: [id])
  outputMedia  MediaObject? @relation("GeneratedOutput", fields: [outputMediaId], references: [id])

  @@index([userId, status])
}

// ───────────────────────────── Posts ────────────────────────

model Post {
  id           String   @id @default(cuid())
  userId       String
  influencerId String?
  title        String?
  caption      String?  @db.Text         // default caption; per-platform overrides live on PostPublication
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user         User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  influencer   Influencer?       @relation(fields: [influencerId], references: [id])
  media        PostMedia[]
  publications PostPublication[]

  @@index([userId, createdAt])
}

model PostMedia {
  id            String @id @default(cuid())
  postId        String
  mediaObjectId String
  sortOrder     Int    @default(0)

  post        Post        @relation(fields: [postId], references: [id], onDelete: Cascade)
  mediaObject MediaObject @relation(fields: [mediaObjectId], references: [id])

  @@unique([postId, sortOrder])
}

enum PublicationStatus {
  DRAFT
  SCHEDULED
  PUBLISHING
  PUBLISHED
  FAILED
}

model PostPublication {
  id                 String            @id @default(cuid())
  postId             String
  socialConnectionId String
  platform           SocialPlatform
  // Platform-specific caption override, privacy, etc.
  caption            String?           @db.Text
  options            Json?             // { privacy_level, disable_comment, reply_control, … }
  scheduledAt        DateTime?
  status             PublicationStatus @default(DRAFT)
  // External id returned after publish (IG media id, FB post id, Threads media id, TikTok publish_id → post_id)
  externalId         String?
  errorMessage       String?
  publishedAt        DateTime?

  post             Post             @relation(fields: [postId], references: [id], onDelete: Cascade)
  socialConnection SocialConnection @relation(fields: [socialConnectionId], references: [id])

  @@index([status, scheduledAt])
  @@index([postId])
}
```

### 4.1 Adding fields later

If a phase needs a new field, add it with `prisma migrate dev --name <phase-nn-feature>`. Never edit a past migration.

---

## §5 Security baseline

### 5.1 Password hashing

`@node-rs/argon2`, parameters:

```ts
await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 });
```

(OWASP 2023 recommended argon2id profile.)

### 5.2 Sessions

Auth.js `session: { strategy: "database" }`. Use the `Session` Prisma model above. Rotate on sign-in. Revoke on sign-out + revoke-all option in settings. Cookie: `httpOnly`, `secure` in prod, `sameSite: "lax"`.

### 5.3 OAuth token vault (envelope encryption)

Never store raw OAuth tokens. AES-256-GCM envelope encryption:

- `MASTER_KEY` — 32-byte key in env (`base64`-encoded). User-managed in prod.
- For each token: generate a 12-byte IV; encrypt `accessToken` with AES-256-GCM using the master key; store `base64(iv || ciphertext || authTag)` in `accessTokenCt`.
- Support key rotation: add `KEY_VERSION` column to a future `KeyEpoch` table if/when rotation matters. **v1: single key, no rotation.**

Implementation in `src/server/crypto/vault.ts`:

```ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const KEY = Buffer.from(process.env.MASTER_KEY!, "base64");
if (KEY.length !== 32) throw new Error("MASTER_KEY must be 32 bytes (base64)");

export function seal(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString("base64");
}

export function open(sealed: string): string {
  const buf = Buffer.from(sealed, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(buf.length - 16);
  const ct = buf.subarray(12, buf.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
```

### 5.4 CSRF

Auth.js gives you CSRF on `/api/auth/*`. For Server Actions, Next.js builds in CSRF protection via the origin check on POST. Do not accept cross-origin POSTs.

### 5.5 Rate limiting

Use `@upstash/ratelimit` or a Redis-backed counter in `src/server/ratelimit.ts`:

- Auth endpoints: 5/min/IP.
- Generation: 10/min/user (tunable).
- OAuth callbacks: 10/min/IP.

### 5.6 Input validation

Every server action starts with `schema.parse(input)`. Every webhook/callback route validates signatures when platforms provide them.

### 5.7 Audit log (minimum)

`pino` structured logs for: sign-in, sign-out, OAuth connect, OAuth revoke, publish attempts (with platform + status), generation requests. Include `userId` (never tokens).

### 5.8 File uploads

- Always via presigned PUT to MinIO — **client never ships bytes through Next.js**.
- Server issues presign with: content-type pinned, max 20MB, object key scoped to `users/<uid>/…`.
- After upload, client calls a `commitUpload` server action. That action does a `HeadObject` to MinIO, validates size & mime, enqueues the thumbnail job, and creates the `MediaObject` row.
- Reject any mime not in `image/jpeg|image/png|image/webp`.

### 5.9 Secret handling

- `.env` in `.gitignore`. Ship `.env.example` with every var name and a `<fill-me>` placeholder.
- `src/server/env.ts` parses `process.env` with Zod at boot. Fail fast on missing.

---

## §6 Phase 0 — Foundation

**Goal:** repo scaffold, tooling, typed env, DB + MinIO + Redis clients, worker process, zero features.

**Deliverables:**

- `package.json` with pinned deps (see §2). Scripts: `dev`, `dev:worker`, `build`, `start`, `start:worker`, `test`, `test:e2e`, `lint`, `format`, `prisma:migrate`, `prisma:generate`, `prisma:studio`.
- `docker-compose.dev.yml` with services `postgres`, `minio`, `redis` (dev-only).
- `.env.example`:
  ```
  DATABASE_URL=postgres://postgres:postgres@localhost:5432/ai_influencer
  REDIS_URL=redis://localhost:6379
  MINIO_ENDPOINT=http://localhost:9000
  MINIO_ACCESS_KEY=minioadmin
  MINIO_SECRET_KEY=minioadmin
  MINIO_BUCKET=ai-influencer
  MINIO_REGION=us-east-1
  MINIO_PUBLIC_BASE_URL=http://localhost:9000   # for dev; in prod set to public https URL
  AUTH_SECRET=                                   # openssl rand -base64 32
  AUTH_URL=http://localhost:3000
  MASTER_KEY=                                    # openssl rand -base64 32 (32 bytes)
  GOOGLE_GENAI_API_KEY=
  # per-platform; fill in as phases land
  INSTAGRAM_CLIENT_ID=
  INSTAGRAM_CLIENT_SECRET=
  INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/oauth/instagram/callback
  FACEBOOK_APP_ID=
  FACEBOOK_APP_SECRET=
  FACEBOOK_REDIRECT_URI=http://localhost:3000/api/oauth/facebook/callback
  THREADS_APP_ID=
  THREADS_APP_SECRET=
  THREADS_REDIRECT_URI=http://localhost:3000/api/oauth/threads/callback
  TIKTOK_CLIENT_KEY=
  TIKTOK_CLIENT_SECRET=
  TIKTOK_REDIRECT_URI=http://localhost:3000/api/oauth/tiktok/callback
  ```
- `src/server/env.ts` Zod-parses the above.
- `prisma/schema.prisma` with the FULL schema from §4. Run `prisma migrate dev --name initial`.
- `src/server/db.ts`: singleton Prisma client with `globalThis` guard for HMR.
- `src/server/storage/minio.ts`: `S3Client` configured with `forcePathStyle: true` and the MinIO endpoint. Helpers: `presignPut(key, contentType)`, `presignGet(key, ttl)`, `headObject(key)`, `deleteObject(key)`, `buildPublicUrl(key)`.
- `src/server/queue/connection.ts`: ioredis connection factory. `src/server/queue/queues.ts`: typed queue registry (empty job types for now).
- `src/worker.ts` entrypoint that boots BullMQ workers (empty registry, but the process runs).
- `src/app/layout.tsx`, `globals.css` with Tailwind v4 + shadcn theme CSS vars.
- ESLint flat config, Prettier config.
- `tsconfig.json` strict.
- `vitest.config.ts`, `playwright.config.ts` (minimal, one smoke test each).
- `README.md` with local-dev commands (user said folder isn't clean — make sure you don't overwrite `DecentralizedAI*.md`).
- `PROGRESS.md` with the phase table (all pending except 00 in_progress).
- `checkpoints/.gitkeep`.

**Acceptance gate:**

```bash
pnpm install
pnpm prisma migrate dev
pnpm lint
pnpm typecheck        # tsc --noEmit
pnpm test             # one smoke test passes
pnpm build            # next build succeeds
# Worker boots and exits clean on SIGTERM:
timeout 3 pnpm start:worker; test $? -eq 124
# Dev server boots:
(pnpm dev & PID=$!; sleep 8; curl -sf http://localhost:3000 >/dev/null; kill $PID)
```

All green → write `checkpoints/phase-00.md`, flip PROGRESS to `done`, commit.

---

## §7 Phase 1 — Credentials auth

**Goal:** bulletproof username+password auth. No social OAuth yet.

**Deliverables:**

- `src/server/auth.ts` — Auth.js v5 config with:
  - Credentials provider authenticating against `User.username` + argon2id
  - `DrizzleAdapter`/`PrismaAdapter` for `Session`/`User`
  - `session: { strategy: "database" }`
  - JWT callbacks that add `userId` to session
- `src/middleware.ts` — protect `/(app)/**` routes; redirect unauth to `/login?redirect=<pathname>`.
- `src/actions/auth.ts` — `signUp`, `signIn`, `signOut`, `revokeAllSessions` server actions. Zod-validated.
- `src/app/(auth)/login/page.tsx`, `signup/page.tsx` — forms with react-hook-form + Zod, inline errors, disabled-during-submit, "show password" toggle, generic error messages (don't leak username existence).
- `src/app/(app)/layout.tsx` — authenticated shell with user menu + sign-out.
- `src/app/(app)/settings/page.tsx` — change password, revoke all sessions.
- Rate limit login: 5 failed attempts per 15 min per username OR IP → 403 for 15 min (Redis counter).
- Password policy: min 10 chars, at least one letter + one digit, max 128. Reject top-1000 common passwords (ship `src/lib/common-passwords.ts` compiled from a public list).
- Tests:
  - Unit: password hash/verify, zod schemas, rate-limit counter.
  - Integration: signup → login → session cookie → protected route → logout.
  - E2E (Playwright): full signup/login flow.

**Acceptance gate:**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e
# Manual: visit /signup, create user, visit /(app), see shell, sign out, redirected.
```

---

## §8 Phase 2 — Token vault & SocialConnection

**Goal:** infra for ANY social OAuth — no specific platform yet.

**Deliverables:**

- `src/server/crypto/vault.ts` per §5.3 with unit tests (round-trip, tampered ciphertext throws, cross-user isolation).
- `src/server/services/social-connection.ts`:
  - `upsertConnection({ userId, platform, externalAccountId, accessToken, refreshToken?, accessExpiresAt?, refreshExpiresAt?, scopes, meta })` — encrypts and writes.
  - `getDecryptedTokens(connectionId)` — opens the vault; returns `{ accessToken, refreshToken? }`.
  - `listConnections(userId)` — returns without tokens.
  - `markNeedsReauth(connectionId, reason)`.
  - `deleteConnection(connectionId, userId)` — cascade deletes publications? No — keep historical; but mark publications' connection as revoked.
- `src/server/jobs/refresh-token.ts` — job handler that accepts `{ connectionId }`, loads the connection, dispatches to the right provider's refresh impl (stub for now — each platform phase fills theirs in).
- BullMQ repeatable job scheduled at app boot: every 30 min scan for `accessExpiresAt < now + 2h` and enqueue refresh.
- OAuth state/PKCE helpers in `src/server/providers/oauth-state.ts`:
  - `createState(userId, platform)` — writes a signed (HMAC) state + a PKCE `code_verifier` to Redis with 10-min TTL, keyed by a random `state` token. Returns `{ state, codeChallenge }`.
  - `consumeState(state)` — reads + deletes atomically; validates HMAC; returns `{ userId, platform, codeVerifier }`.
- Settings → Connections page (`/(app)/settings/connections`) that lists connections. No "Connect" buttons yet (phases 4–7 add them one at a time).

**Acceptance gate:**

```bash
pnpm test                 # crypto tests + service tests (mock Prisma)
pnpm typecheck && pnpm build
# Manual: open /(app)/settings/connections → empty list with placeholder.
```

---

## §9 Phase 3 — Media pipeline (MinIO + Sharp)

**Goal:** users can upload images. Server validates, stores in MinIO, derives thumbnails.

**Deliverables:**

- `src/actions/upload.ts`:
  - `presignUpload({ kind, filename, contentType, size })` → validates (`size<=20MB`, mime in allowlist), generates object key `users/<uid>/<kind>/<cuid>.<ext>`, returns `{ uploadUrl, objectKey }`.
  - `commitUpload({ objectKey, kind, expectedSize, expectedMime })` → `HeadObject`, validates match, reads `width/height` using Sharp's `metadata()` on a range-download (first N KB) or re-download the full object; creates `MediaObject`; enqueues `derive-thumbnails`.
- `src/server/jobs/derive-thumbnails.ts`:
  - Downloads original from MinIO, Sharp resizes to: `thumb` (256px longest edge, WebP q80), `medium` (1024px longest, WebP q80). Uploads variants, writes `MediaVariant` rows.
- `src/components/upload/image-dropzone.tsx` — shadcn + react-dropzone; supports multi-file; per-file progress; retry; presign → PUT (XHR with progress) → commit. Debounced concurrency 3.
- Generic `MediaImage` component that picks the right variant by requested size (`thumb`, `medium`, `original`) and serves through presigned GET URLs (or public URL if bucket is public — default public for v1 dev).
- Utility: `src/server/services/media.ts` with `deleteMediaWithVariants`, `getPresignedUrl`, `listByUserAndKind`.

**Acceptance gate:**

```bash
pnpm test            # service + job unit tests with a mocked S3 client
pnpm test:integration # real MinIO via docker-compose, upload+thumbnail round-trip
# Manual: from a blank /(app)/influencers/new page with a dropzone, upload 3 photos; variants appear.
```

---

## §10 Phase 4 — Instagram OAuth + publish

**Goal:** end-to-end Instagram connect + single-image publish + carousel publish.

### 10.1 `PostingProvider` interface (define in this phase)

```ts
// src/server/providers/posting-provider.ts
export interface PostingProvider {
  readonly platform: SocialPlatform;

  publishImage(input: {
    connectionId: string;
    imageUrl: string;                // public https, reachable by platform servers
    caption?: string;
    options?: Record<string, unknown>;
  }): Promise<{ externalId: string }>;

  publishCarousel(input: {
    connectionId: string;
    imageUrls: string[];             // 2..platformMax
    caption?: string;
    options?: Record<string, unknown>;
  }): Promise<{ externalId: string }>;

  // Optional: platforms that need status polling expose this; others return null immediately.
  getStatus?(publishJobId: string): Promise<{ status: "pending" | "done" | "failed"; externalId?: string; error?: string }>;
}
```

### 10.2 Instagram path decision

Use **"Instagram API with Instagram Login"** (direct, no FB Page required). This is the recommended path for general users.

Scopes: `instagram_business_basic`, `instagram_business_content_publish`.

**Sources:**
- Overview: https://developers.facebook.com/docs/instagram-platform/overview/
- Publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/
- Instagram Login: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
- Media endpoint: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/
- Media publish: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media_publish/

### 10.3 OAuth flow (reference curls)

**1. Authorize URL** (send user to):

```
https://www.instagram.com/oauth/authorize
  ?client_id=<APP_ID>
  &redirect_uri=<REDIRECT_URI>
  &response_type=code
  &scope=instagram_business_basic,instagram_business_content_publish
  &state=<SIGNED_STATE>
```

**2. Exchange code → short-lived token:**

```bash
curl -X POST https://api.instagram.com/oauth/access_token \
  -F client_id=<APP_ID> \
  -F client_secret=<APP_SECRET> \
  -F grant_type=authorization_code \
  -F redirect_uri=<REDIRECT_URI> \
  -F code=<CODE>
# { "access_token": "...", "user_id": 178414..., "permissions": ["..."] }
```

**3. Exchange short → long-lived (60 days):**

```bash
curl -i -X GET "https://graph.instagram.com/access_token\
?grant_type=ig_exchange_token\
&client_secret=<APP_SECRET>\
&access_token=<SHORT_TOKEN>"
```

**4. Refresh long-lived before it expires (at 55 days, say):**

```bash
curl -i -X GET "https://graph.instagram.com/refresh_access_token\
?grant_type=ig_refresh_token\
&access_token=<LONG_TOKEN>"
```

### 10.4 Publishing flow

**Single image (2-step):**

```bash
# Step A: create container
curl -X POST "https://graph.instagram.com/v21.0/<IG_USER_ID>/media" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"image_url":"https://yourhost/users/<uid>/post/abc.jpg","caption":"hello"}'
# → { "id": "<CREATION_ID>" }

# Step B: poll status until FINISHED
curl "https://graph.instagram.com/v21.0/<CREATION_ID>?fields=status_code&access_token=<TOKEN>"
# status_code ∈ { EXPIRED, ERROR, FINISHED, IN_PROGRESS, PUBLISHED }

# Step C: publish
curl -X POST "https://graph.instagram.com/v21.0/<IG_USER_ID>/media_publish" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"creation_id":"<CREATION_ID>"}'
# → { "id": "<IG_MEDIA_ID>" }
```

**Carousel (3-step, up to 10 items):**

```bash
# A) one container per child
curl -X POST ".../v21.0/<IG_USER_ID>/media" \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"image_url":"<URL_1>","is_carousel_item":true}'
# repeat for each child → collect CHILD_IDs

# B) parent carousel container
curl -X POST ".../v21.0/<IG_USER_ID>/media" \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"media_type":"CAROUSEL","children":"<CHILD_ID_1>,<CHILD_ID_2>,...","caption":"hi"}'

# C) publish parent
curl -X POST ".../v21.0/<IG_USER_ID>/media_publish" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"creation_id":"<PARENT_ID>"}'
```

### 10.5 Constraints

- JPEG only for image_url (convert on our side before publish — Sharp → JPEG).
- Image URL must be public HTTPS, stable for at least the publish window (~1h).
- **Rate limit: 100 API-published posts per rolling 24h per IG user** (carousel = 1 post). Track via `GET /<IG_USER_ID>/content_publishing_limit`.
- Container `status_code`: poll every 5s up to 60s; bail with FAILED after 3 min.

### 10.6 Implementation checklist

- `src/server/providers/instagram/oauth.ts` — `buildAuthorizeUrl`, `exchangeCode`, `exchangeForLongLived`, `refresh`.
- `src/server/providers/instagram/client.ts` — thin typed wrapper around Graph API (fetch + Zod response validation).
- `src/server/providers/instagram/publisher.ts` — implements `PostingProvider` with `publishImage` + `publishCarousel`. Polls container status.
- `src/app/api/oauth/instagram/callback/route.ts` — validates state, exchanges code, exchanges for long-lived, upserts connection, redirects to `/settings/connections?connected=instagram`.
- `src/server/jobs/publish-post.ts` — dispatcher that looks up `PostPublication`, loads provider by platform, calls the right method. Sets `PublicationStatus` transitions.
- Update `refresh-token` job to handle IG refresh.
- Settings UI: "Connect Instagram" button → starts OAuth. Per-connection: disconnect, force-refresh buttons.
- Tests:
  - Mocked: unit test publisher against recorded fetch responses.
  - Integration (optional): a `.env.e2e` with sandbox creds; skip in CI if missing.

**Acceptance gate:**

```bash
pnpm test
# Manual: connect IG account in dev (with tester account), publish a test image, see external_id in DB, post visible on IG.
```

---

## §11 Phase 5 — Facebook Page OAuth + publish

**Goal:** connect a Facebook Page and publish single-photo + multi-photo posts.

**Scopes:** `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`.

**Sources:**
- https://developers.facebook.com/docs/pages-api/posts
- https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived (user token)

### 11.1 OAuth

Use **Facebook Login**. Authorize URL:

```
https://www.facebook.com/v21.0/dialog/oauth
  ?client_id=<APP_ID>
  &redirect_uri=<REDIRECT_URI>
  &scope=pages_show_list,pages_manage_posts,pages_read_engagement
  &state=<STATE>
  &response_type=code
```

Exchange code → short user token:

```bash
curl "https://graph.facebook.com/v21.0/oauth/access_token?\
client_id=<APP_ID>&\
redirect_uri=<REDIRECT_URI>&\
client_secret=<APP_SECRET>&\
code=<CODE>"
```

Short user token → long-lived user token (60 days):

```bash
curl "https://graph.facebook.com/v21.0/oauth/access_token?\
grant_type=fb_exchange_token&\
client_id=<APP_ID>&\
client_secret=<APP_SECRET>&\
fb_exchange_token=<SHORT_USER_TOKEN>"
```

List Pages + get Page access tokens (never-expiring when issued from a long-lived user token):

```bash
curl "https://graph.facebook.com/v21.0/me/accounts?access_token=<LONG_USER_TOKEN>"
# Returns { data: [ { id, name, access_token, ... } ] }
```

**Store one `SocialConnection` per Page** with `platform=FACEBOOK_PAGE`, `externalAccountId=<page-id>`, `accessTokenCt=seal(<page_access_token>)`. Page tokens don't expire as long as the user remains admin, but set `accessExpiresAt = now + 55d` and re-verify via `/me?access_token=<page_token>` monthly.

### 11.2 Publish single photo

```bash
curl -X POST "https://graph.facebook.com/v21.0/<PAGE_ID>/photos" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourhost/users/<uid>/post/abc.jpg",
    "caption": "hello",
    "access_token": "<PAGE_TOKEN>"
  }'
# → { "id": "<PHOTO_ID>", "post_id": "<PAGE_POST_ID>" }
```

### 11.3 Publish multi-photo post

Upload each photo as **unpublished**, then create a feed post referencing them:

```bash
# For each image:
curl -X POST "https://graph.facebook.com/v21.0/<PAGE_ID>/photos" \
  -d '{ "url":"<URL_N>", "published":"false", "access_token":"<PAGE_TOKEN>" }'
# → { "id": "<UNPUBLISHED_PHOTO_ID_N>" }

# Then:
curl -X POST "https://graph.facebook.com/v21.0/<PAGE_ID>/feed" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "caption",
    "attached_media": [
      {"media_fbid":"<PHOTO_ID_1>"},
      {"media_fbid":"<PHOTO_ID_2>"}
    ],
    "access_token": "<PAGE_TOKEN>"
  }'
```

### 11.4 Implementation checklist

- `src/server/providers/facebook/oauth.ts`, `client.ts`, `publisher.ts`.
- Callback route exchanges, then lists pages, then for each page issues its page token and upserts connections. UI lets user pick which pages to connect (checkboxes) if they have multiple.
- Publisher `publishImage` = single `/photos`. `publishCarousel` = the multi-photo flow above.
- Tests + Settings UI "Connect Facebook Page".

**Acceptance gate:** IG-style — connect a real FB Page in dev, publish a single photo, publish a 3-photo post, verify on Facebook.

---

## §12 Phase 6 — Threads OAuth + publish

**Goal:** connect Threads account, publish single image + carousel (2–20).

**Base URL:** `https://graph.threads.net/v1.0`

**Scopes:** `threads_basic`, `threads_content_publish`.

**Sources:**
- https://developers.facebook.com/docs/threads/get-started/get-access-tokens-and-permissions/
- https://developers.facebook.com/docs/threads/get-started/long-lived-tokens
- https://developers.facebook.com/docs/threads/posts
- https://developers.facebook.com/docs/threads/reference/publishing/

### 12.1 OAuth

**Authorize:** `https://threads.net/oauth/authorize?client_id=<APP_ID>&redirect_uri=<URI>&scope=threads_basic,threads_content_publish&response_type=code&state=<STATE>`

**Code → short-lived token:**

```bash
curl -X POST https://graph.threads.net/oauth/access_token \
  -F client_id=<APP_ID> \
  -F client_secret=<APP_SECRET> \
  -F grant_type=authorization_code \
  -F redirect_uri=<REDIRECT_URI> \
  -F code=<CODE>
# → { "access_token": "...", "user_id": 178414... }
```

**Short → long-lived (60d):**

```bash
curl -i -X GET "https://graph.threads.net/access_token\
?grant_type=th_exchange_token\
&client_secret=<APP_SECRET>\
&access_token=<SHORT_TOKEN>"
```

**Refresh long-lived (only after 24h old, before expiry):**

```bash
curl -i -X GET "https://graph.threads.net/refresh_access_token\
?grant_type=th_refresh_token\
&access_token=<LONG_TOKEN>"
```

### 12.2 Publish single image

```bash
# 1. Create container
curl -i -X POST \
  -d "media_type=IMAGE" \
  -d "image_url=<PUBLIC_URL>" \
  -d "text=<CAPTION>" \
  -d "access_token=<TOKEN>" \
  "https://graph.threads.net/v1.0/<THREADS_USER_ID>/threads"
# → { "id": "<CONTAINER_ID>" }

# 2. Wait ~30s (poll /{id}?fields=status until FINISHED recommended)

# 3. Publish
curl -i -X POST \
  -d "creation_id=<CONTAINER_ID>" \
  -d "access_token=<TOKEN>" \
  "https://graph.threads.net/v1.0/<THREADS_USER_ID>/threads_publish"
```

### 12.3 Publish carousel (2–20)

```bash
# A) per-child
curl -X POST -d "image_url=<URL>" -d "is_carousel_item=true" -d "access_token=<TOKEN>" \
  "https://graph.threads.net/v1.0/<UID>/threads"

# B) parent
curl -X POST -d "media_type=CAROUSEL" \
  -d "children=<ID1>,<ID2>,<ID3>" -d "text=<CAPTION>" -d "access_token=<TOKEN>" \
  "https://graph.threads.net/v1.0/<UID>/threads"

# C) publish
curl -X POST -d "creation_id=<PARENT_ID>" -d "access_token=<TOKEN>" \
  "https://graph.threads.net/v1.0/<UID>/threads_publish"
```

### 12.4 Constraints

- Image: JPEG or PNG, max 8 MB, width 320–1440, aspect ratio up to 10:1, sRGB.
- Caption: max **500 chars**.
- Rate limit: **250 published posts per rolling 24h per user**.
- Wait ~30s between container create and publish (official recommendation).
- `reply_control`: `everyone` | `accounts_you_follow` | `mentioned_only` | `parent_post_author_only` | `followers_only`.

### 12.5 Implementation checklist

- `src/server/providers/threads/*` mirrors IG structure.
- Publisher enforces caption length, waits 30s (or polls container status), then publishes.
- Settings UI "Connect Threads".
- Tests.

**Acceptance gate:** connect tester Threads account, publish single image + a 3-image carousel.

---

## §13 Phase 7 — TikTok OAuth + publish

**Goal:** connect TikTok, publish a **photo** post (PHOTO mode) and a video post. Focus on photo first since that's the creative use case here; videos are a v1 bonus.

**Base URL:** `https://open.tiktokapis.com/v2`

**Scopes:** `user.info.basic`, `video.publish` (covers photo + video direct posting).

**Sources:**
- https://developers.tiktok.com/doc/login-kit-web
- https://developers.tiktok.com/doc/oauth-user-access-token-management
- https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
- https://developers.tiktok.com/doc/content-posting-api-reference-photo-post
- https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status

### 13.1 OAuth (v2 with PKCE)

**Authorize:**

```
https://www.tiktok.com/v2/auth/authorize/
  ?client_key=<CLIENT_KEY>
  &scope=user.info.basic,video.publish
  &redirect_uri=<REDIRECT_URI>
  &state=<STATE>
  &response_type=code
  &code_challenge=<BASE64URL(SHA256(CODE_VERIFIER))>
  &code_challenge_method=S256
```

**Token exchange:**

```bash
curl -X POST 'https://open.tiktokapis.com/v2/oauth/token/' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'client_key=<CLIENT_KEY>' \
  --data-urlencode 'client_secret=<CLIENT_SECRET>' \
  --data-urlencode 'code=<CODE>' \
  --data-urlencode 'grant_type=authorization_code' \
  --data-urlencode 'redirect_uri=<REDIRECT_URI>' \
  --data-urlencode 'code_verifier=<PKCE_VERIFIER>'
# → { access_token, expires_in (86400), refresh_token, refresh_expires_in (31536000), open_id, scope, token_type: "Bearer" }
```

**Refresh:**

```bash
curl -X POST 'https://open.tiktokapis.com/v2/oauth/token/' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'client_key=<CLIENT_KEY>' \
  --data-urlencode 'client_secret=<CLIENT_SECRET>' \
  --data-urlencode 'grant_type=refresh_token' \
  --data-urlencode 'refresh_token=<REFRESH_TOKEN>'
```

Access token lifetime: **24h**. Refresh lifetime: **365 days**. Store both.

### 13.2 Query creator info (REQUIRED before a Direct Post)

```bash
curl -X POST 'https://open.tiktokapis.com/v2/post/publish/creator_info/query/' \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H 'Content-Type: application/json; charset=UTF-8'
# Returns: creator_nickname, creator_username, creator_avatar_url, privacy_level_options, comment_disabled, duet_disabled, stitch_disabled, max_video_post_duration_sec
```

Use this to populate the privacy-level dropdown in the UI (it's per-creator).

### 13.3 Direct Post — PHOTO

```bash
curl -X POST 'https://open.tiktokapis.com/v2/post/publish/content/init/' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "post_info": {
      "title": "funny cat",
      "description": "#funny photomode on your @tiktok #fyp",
      "disable_comment": true,
      "privacy_level": "PUBLIC_TO_EVERYONE",
      "auto_add_music": true
    },
    "source_info": {
      "source": "PULL_FROM_URL",
      "photo_cover_index": 0,
      "photo_images": [
        "https://yourhost/users/<uid>/post/a.jpg",
        "https://yourhost/users/<uid>/post/b.jpg"
      ]
    },
    "post_mode": "DIRECT_POST",
    "media_type": "PHOTO"
  }'
# → { data: { publish_id: "..." } }
```

Then poll:

```bash
curl -X POST https://open.tiktokapis.com/v2/post/publish/status/fetch/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json; charset=UTF-8" \
  -d '{"publish_id": "<PUBLISH_ID>"}'
# status ∈ { PROCESSING_UPLOAD, PROCESSING_DOWNLOAD, SEND_TO_USER_INBOX, PUBLISH_COMPLETE, FAILED }
```

Store `publicaly_available_post_id` on success.

### 13.4 Constraints & gotchas

- **Unaudited clients** → every post is forced to **SELF_ONLY** visibility. User must submit the app for TikTok audit to lift this. Flag this in the Settings UI.
- **URL ownership:** in the developer portal, you must register "Verified Domains" with DNS TXT / meta-tag verification. `photo_images` URLs must live under a verified domain.
- `photo_images`: up to 35; `title` max 90 runes; `description` max 4000 runes.
- Rate limits: 6 `init` req/min/user; 30 `status/fetch` req/min/user.
- Duet and Stitch are N/A for photo posts — only `disable_comment` and `auto_add_music` apply in UI.

### 13.5 Implementation checklist

- `src/server/providers/tiktok/oauth.ts` (PKCE!), `client.ts`, `publisher.ts` (photo first; video optional).
- Persist `refresh_token`, always rotate on refresh (TikTok returns a new refresh each time).
- Publisher: call init → enqueue a status-poll job (BullMQ delayed, exponential backoff, hard cap 10 min).
- UI: "Connect TikTok" + Creator-info-driven privacy dropdown (fetch on open, cache 10 min).
- Surface "your app is not audited — posts will be SELF_ONLY" banner when applicable.

**Acceptance gate:** tester account connects, publishes a photo post (SELF_ONLY acceptable for dev), status transitions to PUBLISH_COMPLETE.

---

## §14 Phase 8 — AI Influencer library

**Goal:** CRUD for influencers; media library UI per influencer.

**Deliverables:**

- `/(app)/influencers` — grid of influencer cards (name, canonical-photo tile, photo count).
- `/(app)/influencers/new` — form: name, description, style notes, multi-file upload, "mark as canonical" toggle per uploaded photo. Enforce 1–5 canonical.
- `/(app)/influencers/[id]` — detail page with tabs: *Overview* (name/desc/style editable), *Library* (all assets, grid/masonry), *Canonical* (the 1–5 that drive generation).
- Gallery UI: `react-photo-album` masonry; click opens `yet-another-react-lightbox`; keyboard nav; "Set as canonical" / "Remove" buttons.
- Services: `src/server/services/influencer.ts` with `create`, `update`, `delete` (cascades assets, soft-deletes or hard? hard delete including MinIO objects), `listByUser`, `getById` (enforcing ownership).
- Actions: `src/actions/influencer.ts` thin wrappers.
- Tests: unit + one Playwright E2E (create influencer → upload 3 photos → mark 2 canonical).

**Acceptance gate:** create, view, edit, delete an influencer with 10+ photos; canonical constraint enforced.

---

## §15 Phase 9 — Prompt gallery

**Goal:** CRUD prompts with 0–4 reference images; filter/search/favorite.

**Deliverables:**

- `/(app)/prompts` — grid; each card shows title, first line of text, reference-image thumbnails (up to 4), tags, favorite star.
- Filters: search (title + text), tag facets, favorite-only toggle.
- `/(app)/prompts/new` and `/prompts/[id]` — form with text area, tag chips input, reference uploader (enforces max 4), favorite toggle.
- Services + actions analogous to influencer.
- Reference images uploaded via the §9 pipeline with `kind=PROMPT_REFERENCE`.
- Virtualized list if > 200 prompts (use `@tanstack/react-virtual`).
- Tests.

**Acceptance gate:** create prompt with 4 refs, favorite, filter, edit text, remove a ref.

---

## §16 Phase 10 — Nano Banana generation adapter

**Goal:** end-to-end image generation. Pick influencer + prompt → get a new image → stored as `MediaObject` with `kind=GENERATED_IMAGE`.

### 16.1 `ImageGenerator` interface

```ts
// src/server/image-generation/generator.ts
export interface GenerateInput {
  promptText: string;
  // Each reference image is pulled from MinIO and sent inline as base64.
  referenceMediaIds: string[];
  aspectRatio?: "1:1" | "4:5" | "5:4" | "9:16" | "16:9" | "2:3" | "3:2" | "3:4" | "4:3" | "21:9";
  imageSize?: "1K" | "2K";
  model?: string; // default "gemini-2.5-flash-image"
}

export interface GenerateResult {
  imageBytes: Buffer;   // PNG bytes
  mimeType: string;     // "image/png"
  tokensIn?: number;
  tokensOut?: number;
  synthId: boolean;     // Nano Banana always embeds SynthID → true
}

export interface ImageGenerator {
  generate(input: GenerateInput): Promise<GenerateResult>;
}
```

### 16.2 NanoBananaGenerator impl

Model ID: **`gemini-2.5-flash-image`** (Nano Banana; GA). Endpoint:

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent
Header: x-goog-api-key: $GOOGLE_GENAI_API_KEY
```

Payload shape:

```json
{
  "contents": [{
    "parts": [
      {"text": "<prompt text + influencer style notes>"},
      {"inline_data": {"mime_type": "image/jpeg", "data": "<BASE64>"}},
      {"inline_data": {"mime_type": "image/jpeg", "data": "<BASE64>"}}
    ]
  }],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "imageConfig": { "aspectRatio": "4:5", "imageSize": "2K" }
  }
}
```

Response: walk `candidates[0].content.parts[]`, find the part with `inlineData.data` → base64 PNG.

**Reference image count:** up to 14 total for Nano Banana 3-tier; for `gemini-2.5-flash-image` keep it pragmatic — **1–8 combined** (`canonical_refs + prompt_refs`). Enforce in service; if exceeded, truncate canonical-first policy.

**Use SDK:** `@google/genai`. Prefer the SDK over raw fetch for robustness.

### 16.3 Prompt assembly

```ts
function buildPromptText(p: Prompt, i: Influencer) {
  return [
    `Subject: ${i.name} — ${i.description ?? ""}`,
    i.styleNotes ? `Style notes: ${i.styleNotes}` : null,
    `Scene: ${p.text}`,
    `Keep the subject's face and identity consistent with the reference photos.`,
  ].filter(Boolean).join("\n\n");
}
```

**Image ordering matters.** Put influencer canonical refs FIRST, then prompt refs. (Empirically, subject anchoring is stronger when the identity images are early in the parts array.)

### 16.4 Job: `generate-image`

- Input: `{ generationId }`.
- Handler: load `Generation` + `Influencer` + `Prompt` + refs → assemble payload → call `NanoBananaGenerator.generate` → upload output bytes to MinIO → create `MediaObject{ kind: GENERATED_IMAGE, synthId: true }` → update `Generation.status=SUCCEEDED`, `outputMediaId`, `tokensIn`, `tokensOut`, `costUsd` (compute at ~$0.039/image).
- On failure: `status=FAILED`, `errorMessage`. Retry 2x with backoff for 429/5xx.

### 16.5 Implementation checklist

- `src/server/image-generation/nano-banana.ts`.
- `src/server/jobs/generate-image.ts`.
- Service `generation.createAndEnqueue(input) → generationId`.
- Action `generateImage` used by wizard.
- Cost-tracking: sum `costUsd` per user for a "Usage" line in Settings (read-only).
- Tests: mock the `@google/genai` client; ensure correct payload assembly, correct image count enforcement, correct error handling.

**Acceptance gate:** given an influencer with 2 canonical refs and a prompt with 2 refs + text, trigger generation; a PNG lands in MinIO; `Generation` row is SUCCEEDED with a valid `outputMediaId`; image renders in UI.

---

## §17 Phase 11 — Post creation wizard

**Goal:** the headline UX. 4 steps, persistent draft, regeneration allowed, save to posts gallery.

### 17.1 Flow & state machine

```
  ┌─── /new-post ────────────────────────────────────────────┐
  │                                                          │
  │  Step 1: select influencer  ──▶  Step 2: select prompt   │
  │                                        │                 │
  │                                        ▼                 │
  │  Step 4: review & save  ◀── Step 3: generate (loop)      │
  │                                (regenerate allowed)      │
  └──────────────────────────────────────────────────────────┘
```

State is URL-driven (`?step=3&gen=<generationId>`). Wizard component is a Server Component shell + small client components per step.

Draft persistence: a `PostDraft` Redis blob keyed by `userId:draftId`, TTL 24h. Contains `{ influencerId?, promptId?, generationIds[], currentGenerationId? }`. If the user navigates away and returns, draft resumes.

### 17.2 Step 1 — Select influencer

Grid of user's influencers with a "create new" card. Clicking selects and advances.

### 17.3 Step 2 — Select prompt

Filtered list (optionally grouped by tag). Show prompt text + reference thumbnails. "Create new" card. On select → advance.

### 17.4 Step 3 — Generate

- "Generate" button triggers `generateImage` action → `generationId`.
- UI subscribes (SWR polling every 2s OR Server-Sent Events) to `GET /api/generations/:id` until terminal.
- Show progressing skeleton → result image. Actions: **Regenerate** (creates a new `Generation`, adds to draft), **Tweak prompt** (reopens step 2 with prompt pre-filled to edit a copy; original prompt untouched), **Choose aspect ratio** (re-generates with different ratio).
- Side rail shows all `Generation`s in this draft as small thumbnails; user can pick any as "winner."

### 17.5 Step 4 — Review & save

- Final image + influencer + prompt summary.
- Title input (optional).
- Default caption input (used as fallback when publishing).
- **Save** → creates a `Post` with one `PostMedia` pointing to the winner `MediaObject`. Clears draft. Redirect to `/posts/<postId>`.

### 17.6 Implementation checklist

- `/(app)/new-post/layout.tsx` (stepper, breadcrumbs, save-draft indicator).
- `/(app)/new-post/page.tsx` (step router).
- Components: `StepInfluencer`, `StepPrompt`, `StepGenerate`, `StepReview`.
- Action `savePostFromDraft(draftId, { winnerGenerationId, title, caption })`.
- E2E: click through all 4 steps with seeded data, a mocked Nano Banana.

**Acceptance gate:** end-to-end wizard yields a saved `Post` visible in the posts gallery.

---

## §18 Phase 12 — Posts gallery & publishing UI

**Goal:** list posts; open a post; compose per-platform publications; publish (or schedule).

### 18.1 Posts list

- `/(app)/posts` — masonry/grid of post cards, each showing main image + platform-publish badges (colored dots per platform with state: draft/scheduled/published/failed).
- Filters: influencer, platform, status, date range.
- Pagination (cursor).

### 18.2 Post detail

- `/(app)/posts/[id]`:
  - Large media preview (carousel if multi-media, future).
  - "Publish" panel: a table of user's connected `SocialConnection`s with checkboxes; per-row: caption override, per-platform options (privacy, reply-control, disable-comment, schedule time).
  - "Publish now" or "Schedule": creates `PostPublication` rows (status DRAFT → enqueue `publish-post` job → PUBLISHING → PUBLISHED/FAILED).
  - Inline retry on failed publications.
  - "Copy link to IG/FB/etc. post" once published.

### 18.3 Publish job

`src/server/jobs/publish-post.ts`:

```ts
async function run({ publicationId }: { publicationId: string }) {
  const pub = await prisma.postPublication.findUniqueOrThrow({ where: { id: publicationId }, include: { post: { include: { media: true } }, socialConnection: true } });

  await prisma.postPublication.update({ where: { id: publicationId }, data: { status: "PUBLISHING" } });

  const provider = resolveProvider(pub.platform);               // instagram / facebook / threads / tiktok
  const imageUrls = pub.post.media
    .sort((a,b)=>a.sortOrder-b.sortOrder)
    .map(m => minio.publicUrl(m.objectKey));                    // or presigned with 24h TTL

  try {
    const result = imageUrls.length === 1
      ? await provider.publishImage({ connectionId: pub.socialConnectionId, imageUrl: imageUrls[0], caption: pub.caption ?? pub.post.caption ?? undefined, options: pub.options ?? {} })
      : await provider.publishCarousel({ connectionId: pub.socialConnectionId, imageUrls, caption: pub.caption ?? pub.post.caption ?? undefined, options: pub.options ?? {} });

    await prisma.postPublication.update({ where: { id: publicationId }, data: { status: "PUBLISHED", externalId: result.externalId, publishedAt: new Date() } });
  } catch (err: any) {
    await prisma.postPublication.update({ where: { id: publicationId }, data: { status: "FAILED", errorMessage: String(err?.message ?? err) } });
    throw err;
  }
}
```

BullMQ retries: 3 attempts with exponential backoff; after that, manual retry from UI.

### 18.4 Implementation checklist

- List + detail pages + the publish panel.
- Publish job wired to provider registry.
- Status polling for TikTok (separate child job).
- Toast/notifications (shadcn toaster) for publish results.
- Tests: E2E with mocked providers.

**Acceptance gate:** save post → publish to 2 platforms simultaneously → both reach PUBLISHED (or FAILED with retry button).

---

## §19 Phase 13 — Scheduling & observability

**Goal:** schedule publications + production-readiness.

**Deliverables:**

- Scheduling UI: date/time picker in publish panel; store `scheduledAt`; enqueue BullMQ delayed job.
- `PublicationStatus` transitions: DRAFT → SCHEDULED → PUBLISHING → PUBLISHED/FAILED. Cancel button on SCHEDULED reverts to DRAFT.
- Timezone: user's timezone (from browser, stored in `User.timezone`) used for display; DB stores UTC.
- Pino structured logs to stdout with request-id correlation.
- `/healthz` route: returns `{ ok, db, redis, minio }` with per-dep checks.
- Global error boundary + Sentry-style crash reporter (optional: keep as a stub env-guarded integration).
- Admin-free "Usage" page showing per-day generation count + cost estimate + publish count.

**Acceptance gate:** schedule a post for +5 minutes, leave the worker running, post publishes; failed publication retried successfully via UI.

---

## §20 UI/UX reference patterns

These are the specific visual/UX decisions locked in for v1. Do not reinvent.

### 20.1 Photo gallery (influencer library, posts list)

- **Masonry layout** via `react-photo-album` in `masonry` mode.
- **Targeted row height ≈ 220px desktop / 160px mobile.** Gap 8px.
- **Square-covered thumbnail** for consistency-oriented views (canonical picker, prompt-ref picker). Use `object-cover` + explicit aspect ratio.
- **Hover state:** subtle overlay with primary action (Set canonical / Select / View). Show only on hover on desktop, always visible on touch.
- **Selection mode:** multi-select via Shift+click or a selection toggle button. Floating action bar at bottom when any selected.
- **Lightbox:** `yet-another-react-lightbox` with arrow nav, ESC close, swipe on mobile.
- **Virtualization:** only above 300 items — swap masonry for `react-window` + manual row calculation.
- **Empty state:** friendly illustration + "Upload your first photos" CTA.
- **Upload zone:** full-width dashed border dropzone at top of gallery when empty; compact "+" tile in the grid when populated.

### 20.2 Prompt gallery

- **Card layout.** Each card: title (bold), first 80 chars of prompt text (truncated with "…"), 4 small square thumbnail slots (empty = outline), tag chips, favorite star (top-right).
- **Grid:** CSS grid, `minmax(280px, 1fr)`.
- **Search bar + tag facet rail.** Command-palette (`cmd+k`) quick-switcher to jump to a prompt.
- **Inline create** is fine for small changes, full page `/prompts/new` for new prompts with refs.

### 20.3 Wizard

- **4-step progress bar at top.** Steps: Influencer → Prompt → Generate → Review.
- **Persistent save-draft pill** in the top-right (clicked opens draft drawer).
- **Generate step:** left column = generation history (thumbs); right column = focused current result, large. Below result: Regenerate / Tweak prompt / Adjust aspect ratio / Accept.
- **Keyboard:** `Enter` advances when a selection is made; `Backspace` goes back.
- **No modal steps** — each step is a full page/route for deep-linkability.

### 20.4 Uploads

- **Presigned PUT** from browser; progress bar per file; cancel + retry.
- **Concurrency 3.** Queue the rest.
- **Client-side checks** (size, type) before presign; server authoritative.
- **On commit**: thumbnail shows within 2s (placeholder → crossfade to thumbnail when the `derive-thumbnails` job finishes; SWR revalidation on focus).

### 20.5 Publish panel

- **Per-connection row**, not per-platform. If a user has 3 Facebook Pages, 3 rows. Each row: platform badge, connection name/avatar, caption override input (expandable), options accordion, "Publish now" vs "Schedule" toggle.
- **Single "Publish selected" button** at bottom — publishes all rows with checked checkboxes simultaneously (enqueue N jobs).
- **Post-publish state**: each row flips to green check with permalink or red X with error + retry.

---

## §21 Testing strategy

### 21.1 Unit (Vitest)

- Every service, every job handler, every provider's OAuth and publisher.
- Target 80%+ statement coverage on `src/server/*` (enforce in CI).
- Mock Prisma via `vitest-mock-extended` or a test schema with transaction rollback.
- Mock HTTP with `undici`'s `MockAgent`.

### 21.2 Integration

- Real Postgres + Redis + MinIO via docker-compose (dev instances).
- Run migrations, seed data, exercise upload → thumbnail → generation (mocked Nano Banana) → post → publish (mocked provider).
- One integration test per phase.

### 21.3 E2E (Playwright)

- Headless Chrome.
- Core journeys: sign up → create influencer → create prompt → run wizard → save post → publish (mocked provider).
- Run per phase as each UI lands.

### 21.4 Contract tests for providers

For each provider, a "recorded fixtures" test: capture a real API response once in dev, commit as JSON, replay in CI via `MockAgent`. Keeps us honest about payload shapes.

### 21.5 CI

- Single workflow: lint → typecheck → unit → integration → build → e2e.
- Fail fast. Cache pnpm store + Playwright browsers.

---

## §22 API appendix — full curl flows

This appendix consolidates every curl you need, for copy-paste during testing. Sources cited inline in §10–§13.

### 22.1 Instagram (Instagram Login path)

```bash
# 1) Authorize URL (browser)
https://www.instagram.com/oauth/authorize?client_id=$IG_CLIENT_ID&redirect_uri=$IG_REDIRECT_URI&response_type=code&scope=instagram_business_basic,instagram_business_content_publish&state=$STATE

# 2) Code → short token
curl -X POST https://api.instagram.com/oauth/access_token \
  -F client_id=$IG_CLIENT_ID -F client_secret=$IG_CLIENT_SECRET \
  -F grant_type=authorization_code -F redirect_uri=$IG_REDIRECT_URI -F code=$CODE

# 3) Short → long-lived (60d)
curl "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=$IG_CLIENT_SECRET&access_token=$SHORT"

# 4) Refresh long-lived
curl "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=$LONG"

# 5) Get IG user id (self)
curl "https://graph.instagram.com/v21.0/me?fields=id,username&access_token=$TOKEN"

# 6) Publish single image — create container
curl -X POST "https://graph.instagram.com/v21.0/$IG_USER_ID/media" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"image_url":"'$IMG_URL'","caption":"'"$CAPTION"'"}'

# 7) Poll status
curl "https://graph.instagram.com/v21.0/$CREATION_ID?fields=status_code&access_token=$TOKEN"

# 8) Publish
curl -X POST "https://graph.instagram.com/v21.0/$IG_USER_ID/media_publish" \
  -H "Authorization: Bearer $TOKEN" -d '{"creation_id":"'$CREATION_ID'"}'

# 9) Carousel — children, then parent, then publish (see §10.4)

# 10) Rate-limit check
curl "https://graph.instagram.com/v21.0/$IG_USER_ID/content_publishing_limit?access_token=$TOKEN"
```

### 22.2 Facebook Page

```bash
# 1) Authorize
https://www.facebook.com/v21.0/dialog/oauth?client_id=$FB_APP_ID&redirect_uri=$FB_REDIRECT&scope=pages_show_list,pages_manage_posts,pages_read_engagement&state=$STATE&response_type=code

# 2) Code → user token
curl "https://graph.facebook.com/v21.0/oauth/access_token?client_id=$FB_APP_ID&redirect_uri=$FB_REDIRECT&client_secret=$FB_APP_SECRET&code=$CODE"

# 3) Short user → long-lived user
curl "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=$FB_APP_ID&client_secret=$FB_APP_SECRET&fb_exchange_token=$SHORT"

# 4) List pages + per-page tokens
curl "https://graph.facebook.com/v21.0/me/accounts?access_token=$LONG_USER"

# 5) Publish single photo
curl -X POST "https://graph.facebook.com/v21.0/$PAGE_ID/photos" \
  -H "Content-Type: application/json" \
  -d '{"url":"'$IMG_URL'","caption":"'"$CAP"'","access_token":"'$PAGE_TOKEN'"}'

# 6) Multi-photo: upload unpublished, then feed with attached_media (see §11.3)
```

### 22.3 Threads

```bash
# 1) Authorize
https://threads.net/oauth/authorize?client_id=$TH_APP_ID&redirect_uri=$TH_REDIRECT&scope=threads_basic,threads_content_publish&response_type=code&state=$STATE

# 2) Code → short token
curl -X POST https://graph.threads.net/oauth/access_token \
  -F client_id=$TH_APP_ID -F client_secret=$TH_APP_SECRET \
  -F grant_type=authorization_code -F redirect_uri=$TH_REDIRECT -F code=$CODE

# 3) Short → long-lived (60d)
curl "https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=$TH_APP_SECRET&access_token=$SHORT"

# 4) Refresh long-lived
curl "https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=$LONG"

# 5) Get threads user id
curl "https://graph.threads.net/v1.0/me?fields=id,username&access_token=$TOKEN"

# 6) Publish single image (create, wait ~30s, publish)
curl -X POST -d "media_type=IMAGE" -d "image_url=$IMG_URL" -d "text=$CAP" -d "access_token=$TOKEN" \
  "https://graph.threads.net/v1.0/$TH_UID/threads"
curl -X POST -d "creation_id=$CID" -d "access_token=$TOKEN" \
  "https://graph.threads.net/v1.0/$TH_UID/threads_publish"

# 7) Carousel (see §12.3)

# 8) Status check
curl "https://graph.threads.net/v1.0/$CID?fields=status&access_token=$TOKEN"
```

### 22.4 TikTok (PKCE)

```bash
# 1) Authorize
https://www.tiktok.com/v2/auth/authorize/?client_key=$TT_KEY&scope=user.info.basic,video.publish&redirect_uri=$TT_REDIRECT&state=$STATE&response_type=code&code_challenge=$CHAL&code_challenge_method=S256

# 2) Code → tokens
curl -X POST 'https://open.tiktokapis.com/v2/oauth/token/' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "client_key=$TT_KEY" \
  --data-urlencode "client_secret=$TT_SECRET" \
  --data-urlencode "code=$CODE" \
  --data-urlencode 'grant_type=authorization_code' \
  --data-urlencode "redirect_uri=$TT_REDIRECT" \
  --data-urlencode "code_verifier=$VERIFIER"

# 3) Refresh
curl -X POST 'https://open.tiktokapis.com/v2/oauth/token/' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "client_key=$TT_KEY" --data-urlencode "client_secret=$TT_SECRET" \
  --data-urlencode 'grant_type=refresh_token' --data-urlencode "refresh_token=$RT"

# 4) Creator info (required before DIRECT_POST)
curl -X POST 'https://open.tiktokapis.com/v2/post/publish/creator_info/query/' \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json; charset=UTF-8'

# 5) Direct Post PHOTO (see §13.3 for full body)
curl -X POST 'https://open.tiktokapis.com/v2/post/publish/content/init/' \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{ "post_info":{...}, "source_info":{"source":"PULL_FROM_URL","photo_cover_index":0,"photo_images":[...]}, "post_mode":"DIRECT_POST", "media_type":"PHOTO" }'

# 6) Status
curl -X POST 'https://open.tiktokapis.com/v2/post/publish/status/fetch/' \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json; charset=UTF-8' \
  -d '{"publish_id":"'$PID'"}'
```

### 22.5 Nano Banana (Gemini 2.5 Flash Image)

```bash
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent" \
  -H "x-goog-api-key: $GOOGLE_GENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents":[{"parts":[
      {"text":"Subject: Mia. Scene: coffee shop window seat, morning light. Keep the subject's face consistent."},
      {"inline_data":{"mime_type":"image/jpeg","data":"<BASE64_CANONICAL_FACE>"}},
      {"inline_data":{"mime_type":"image/jpeg","data":"<BASE64_PROMPT_REF>"}}
    ]}],
    "generationConfig":{"responseModalities":["TEXT","IMAGE"],"imageConfig":{"aspectRatio":"4:5","imageSize":"2K"}}
  }'
```

Pricing reference: `gemini-2.5-flash-image` ≈ **$0.039 per image** (1024×1024, 1290 output tokens @ $30/M). Source: https://ai.google.dev/gemini-api/docs/pricing.

---

## §23 DO NOT list (agent anti-patterns)

Check this list before every commit. If any bullet is violated, fix it first.

1. **Do not** put any social platform `fetch()` calls outside of `src/server/providers/**`.
2. **Do not** store OAuth tokens unencrypted. Every read/write goes through `vault.ts`.
3. **Do not** ship access tokens to the browser. Connection listing shows `displayName`, `platform`, `status` — never tokens.
4. **Do not** stream file uploads through Next.js. Always presigned PUT to MinIO.
5. **Do not** call providers from React client components. Use Server Actions or Server Components that call services.
6. **Do not** edit a past migration. Always `prisma migrate dev --name ...` to add a new one.
7. **Do not** add a field to a Prisma model without updating the service(s) that touch that model in the same phase.
8. **Do not** implement a platform partially (e.g., OAuth but not publishing, or single-image but not carousel). One platform = one phase = complete end-to-end.
9. **Do not** call `Nano Banana` from a server action synchronously during an HTTP request. Always enqueue a `generate-image` job and poll.
10. **Do not** mix the `gemini-2.5-flash-image` and `gemini-3.x-flash-image-preview` model IDs. v1 locks to `gemini-2.5-flash-image`.
11. **Do not** exceed platform limits silently. Check `content_publishing_limit` (IG), caption lengths (Threads 500, TikTok desc 4000), and reject at the service layer with a typed error.
12. **Do not** leave a `PostPublication` in `PUBLISHING` forever. Every job ends with PUBLISHED or FAILED within its timeout.
13. **Do not** add features not in this blueprint. If you think the user needs something, open an issue comment or a `TODO_BLUEPRINT.md` section — don't silently build it.
14. **Do not** skip the acceptance gate. Red gate = phase not done.
15. **Do not** commit without writing `checkpoints/phase-NN.md` and updating `PROGRESS.md`.

---

## Appendix A — Initial PROGRESS.md (copy-paste)

```markdown
# Build progress

| Phase | Title                                     | Status       | Commit | Notes |
|-------|-------------------------------------------|--------------|--------|-------|
| 00    | Foundation                                | pending      |        |       |
| 01    | Credentials auth                          | pending      |        |       |
| 02    | Token vault & SocialConnection            | pending      |        |       |
| 03    | Media pipeline (MinIO + Sharp)            | pending      |        |       |
| 04    | Instagram OAuth + publish                 | pending      |        |       |
| 05    | Facebook Page OAuth + publish             | pending      |        |       |
| 06    | Threads OAuth + publish                   | pending      |        |       |
| 07    | TikTok OAuth + publish                    | pending      |        |       |
| 08    | AI Influencer library                     | pending      |        |       |
| 09    | Prompt gallery                            | pending      |        |       |
| 10    | Nano Banana generation adapter            | pending      |        |       |
| 11    | Post creation wizard                      | pending      |        |       |
| 12    | Posts gallery & publishing UI             | pending      |        |       |
| 13    | Scheduling & observability                | pending      |        |       |
```

---

## Appendix B — Source citations (for future verification)

**Gemini / Nano Banana:**
- Model page: https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image
- Image generation guide: https://ai.google.dev/gemini-api/docs/image-generation
- Pricing: https://ai.google.dev/gemini-api/docs/pricing
- Google Developers Blog (launch): https://developers.googleblog.com/introducing-gemini-2-5-flash-image/

**Instagram Graph API:**
- Overview: https://developers.facebook.com/docs/instagram-platform/overview/
- Instagram Login: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/
- Business Login flow: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
- Content publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/
- Media endpoint: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/
- Media publish: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media_publish/
- Rate limits: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/content_publishing_limit

**Facebook Pages:**
- Pages API posts: https://developers.facebook.com/docs/pages-api/posts

**Threads:**
- Overview: https://developers.facebook.com/docs/threads/overview
- Get started / tokens: https://developers.facebook.com/docs/threads/get-started/get-access-tokens-and-permissions/
- Long-lived tokens: https://developers.facebook.com/docs/threads/get-started/long-lived-tokens
- Posts: https://developers.facebook.com/docs/threads/posts
- Publishing reference: https://developers.facebook.com/docs/threads/reference/publishing/

**TikTok:**
- Login Kit Web: https://developers.tiktok.com/doc/login-kit-web
- Token management: https://developers.tiktok.com/doc/oauth-user-access-token-management
- Content posting (get started): https://developers.tiktok.com/doc/content-posting-api-get-started
- Direct post reference: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
- Photo post reference: https://developers.tiktok.com/doc/content-posting-api-reference-photo-post
- Status fetch: https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status

---

**End of blueprint. Agent: start at §0 and do not deviate.**
