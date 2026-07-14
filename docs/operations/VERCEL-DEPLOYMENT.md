# Vercel Deployment

**Project:** `aivs-studio-web` · **Team:** `nurandriwaq`
**Production:** https://aivs-studio-web.vercel.app

## Setup (already done)

- Linked at repo root (`.vercel/project.json`, gitignored).
- Project `rootDirectory` set to `apps/studio-web` (via API) so the monorepo
  root (`pnpm-lock.yaml`, `tsconfig.base.json`) is available at build time.
  Deploying the CLI from inside `apps/studio-web` breaks the build — always
  deploy from repo root.
- Framework preset: Next.js.

## Commands (from repo root)

```bash
npx vercel deploy          # preview deployment
npx vercel deploy --prod   # production
npx vercel ls              # list deployments
npx vercel inspect <dpl> --logs
```

## Current behavior

- `/` and `/api/health` — live and green.
- `/api/services` — returns 503 "degraded" in production: it probes
  localhost Postgres/Redis/MinIO which exist only in local dev. Expected
  until production data services exist (Supabase/R2 decisions pending).
- Preview deployments sit behind Vercel deployment protection (team SSO
  302). Production domain is public.

## Not on Vercel

- `apps/worker` — long-running BullMQ process; Vercel is serverless.
  Needs Railway/Fly/VM when production jobs arrive.
- Databases/storage — no production Postgres/Redis/object storage yet.

## Next steps for real production

1. Decide Supabase (managed Postgres) vs self-hosted — affects Prisma config.
2. Cloudflare R2 bucket + credentials in Vercel env vars.
3. Worker host.
4. Git remote + Vercel Git integration for push-to-deploy (currently CLI-only,
   no GitHub repo exists).
