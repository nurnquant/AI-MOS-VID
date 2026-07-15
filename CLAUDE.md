# AIVS — Riwaq Al Ilm Enterprise AI Video Production Studio

pnpm 11 + Turborepo monorepo. Next.js 16 (`apps/studio-web`), BullMQ worker
(`apps/worker`), packages: `database` (Prisma 7), `auth` (Better Auth),
`assets`, `storage` (MinIO/S3), `queue`, `media-core` (ffmpeg), `providers`,
`types`, `testing`.

## Non-negotiable rules

- **No paid provider calls, no external services.** All AI/publishing
  providers are mocks behind `packages/providers` contracts. Enabling any
  paid/external integration requires explicit user approval first.
- **Child-media safety is first-class** — see
  `docs/security/AIVS-media-security-baseline.md`. Never weaken quarantine,
  consent gates, role checks (`child_media_reviewer`), audit writes, or
  deletion enforcement without user approval.
- **Schema changes only via Prisma migrations** (`packages/database/prisma`).
  Never edit the database manually.
- **Module governance:** work happens in numbered modules (ENV-001,
  FOUNDATION-002, AUTH-003, CONSENT-004...). Pattern: draft master prompt →
  user approval → gates 0-7 on a feature branch → verification report in
  `docs/environment/` → merge ff to main + push. Never start a new module
  without explicit user approval. ADRs live in `docs/architecture/`.
- Commit trailer: `Co-Authored-By: NuR & Claude Fable 5 <noreply@anthropic.com>`.

## Toolchain quirks (will bite you)

- Node 26 runs TS via type stripping — packages ship raw `src/*.ts`:
  relative imports MUST carry `.ts` extensions; constructor parameter
  properties and other non-erasable TS syntax crash at runtime (typecheck
  won't catch it).
- Prisma 7: datasource URL lives in `packages/database/prisma.config.ts`
  (loads root `.env`); client generated into `src/generated/` (gitignored,
  regenerated on install). After schema changes run
  `npx prisma generate` there — stale clients cause phantom type errors.
  Prisma warns Node 26 unsupported; it works.
- BullMQ custom job IDs reject `:` — use `__` (see `deterministicJobId`).
- Host ffmpeg has no webp encoder — thumbnails are png.
- Local infra ports: Postgres 5433, Redis 6380, MinIO 9000/9001 (host's own
  Postgres 5432 / Redis 6379 must not be touched). Docker = Colima:
  `colima start` after reboot, then `pnpm infra:up`.

## Commands

- `pnpm verify` — full quality gate (env, format, lint, typecheck, unit
  tests, media smoke, build). Must be green before any module completes.
- `pnpm --filter @aivs/testing test:integration` — needs live local infra.
- `npx playwright test` — e2e; specs spawn the worker themselves.
- `pnpm db:reset && pnpm db:migrate && pnpm db:seed` — reproducible DB.
  Seed creates dev tenant/project and owner `owner@riwaq.dev` /
  `riwaq-dev-owner-1` (local only).

## Deploy

Vercel Git integration: push to `main` auto-deploys `aivs-studio-web`.
Production API routes 500 until production DB/Redis/S3 +
`BETTER_AUTH_SECRET` exist in Vercel env (expected). Worker cannot run on
Vercel (needs a long-running host, later module).
