---
name: run
description: Launch the AIVS app locally — infra (Colima/Docker), worker, and Next.js dev server — and drive it as a signed-in user. Use when asked to run/start/demo the app or confirm a change works end-to-end.
---

# Run AIVS locally

1. Infra (skip if `docker compose ps` shows healthy containers):

   ```bash
   colima status || colima start
   pnpm infra:up          # postgres:5433, redis:6380, minio:9000
   pnpm db:migrate && pnpm db:seed
   ```

2. Worker (background — required for validation/media/consent jobs):

   ```bash
   node --env-file-if-exists=.env apps/worker/src/index.ts
   ```

   Run from `apps/worker` with `node src/index.ts` if relative paths matter;
   env needs DATABASE_URL/REDIS_URL/S3_*/BETTER_AUTH_SECRET (root `.env`).

3. Web:

   ```bash
   pnpm --filter @aivs/studio-web dev   # http://localhost:3000
   ```

4. Sign in: `owner@riwaq.dev` / `riwaq-dev-owner-1` (owner role — passes
   every RBAC gate). Pages: `/assets` (upload → watch status reach
   `ready`), `/consents`, `/members`. All `/api/assets*` and `/api/consents*`
   requests need the session cookie — anonymous = 401.

Playwright e2e specs boot the web server AND spawn the worker themselves:
`npx playwright test` is the fastest full-stack check.
