# AI Influencer

Greenfield Next.js application for AI-assisted social content creation, implemented from the `AI_INFLUENCER.md` blueprint.

## Stack

- Next.js 15 App Router + TypeScript strict mode
- Prisma + PostgreSQL
- BullMQ + Redis
- MinIO (S3-compatible storage)
- Tailwind CSS v4
- Vitest + Playwright

## Local development

> `docker-compose.dev.yml` is **development-only**. Production infrastructure is user-provided.

1. Copy the environment template and fill secrets:

   ```bash
   cp .env.example .env
   openssl rand -base64 32   # use for AUTH_SECRET
   openssl rand -base64 32   # use for MASTER_KEY
   ```

2. Start local infrastructure:

   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

3. Install dependencies and generate the Prisma client:

   ```bash
   pnpm install
   pnpm prisma:migrate
   ```

4. Run the web app and worker in separate terminals:

   ```bash
   pnpm dev
   pnpm dev:worker
   ```

## Verification commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

## Repository notes

- Progress is tracked in `PROGRESS.md`.
- Phase handoffs belong in `checkpoints/phase-NN.md`.
- Existing blueprint/reference docs in the repo root are preserved.
