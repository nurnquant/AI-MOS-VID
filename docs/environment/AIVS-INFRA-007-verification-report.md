# AIVS-INFRA-007 Verification Report

**Result:** **PASS**
**Date:** 2026-07-26
**Branch:** `feature/aivs-infra-007-production` (commits `69fea3f` → `b9c6faf`,
merged to `main` incrementally — production fixes required live deploys)
**ADR:** `docs/architecture/ADR-AIVS-007-production-infrastructure.md`

## 1. Production topology (live)

- **Web:** Vercel `aivs-studio-web.vercel.app` (Git push-to-deploy)
- **Postgres:** Vercel Postgres (Neon), 5 migrations deployed, no dev seed
- **Storage:** Cloudflare R2 bucket `aivs-media` (private, signed URLs only)
- **Worker + Redis:** Railway (Dockerfile `apps/worker/Dockerfile`; Redis
  private URL for worker, public proxy URL for Vercel)
- Backup & child-media deletion policy **accepted by owner 2026-07-15**

## 2. Definition of Done — evidence (live production, 2026-07-26)

| DoD item                                           | Status | Evidence                                                                                                                                                                                                                                                     |
| -------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Register → workspace → upload → ready → signed URL | ✅     | Smoke account registered over HTTPS (200); workspace `riwaq-prod` created; 188 KB mp4 uploaded (201, 2.2 s) → quarantined in R2 → Railway worker validated + thumbnailed → `ready` in ~2 s → signed URL (15 min TTL) fetched 200, ffprobe h264 640×360 + aac |
| Script → generation → final video in production    | ✅     | Mock-generated 3-scene script → submit → approve → generation `tiktok`: 3/3 scenes succeeded, assembled final asset `ready`; signed-URL download ffprobed **h264 1080×1920, 6.04 s** (3 × 2 s scenes)                                                        |
| Production DB: real migrations, no dev credentials | ✅     | `prisma migrate deploy` applied all 5 migrations via non-pooling URL; bootstrap = real registration; dev owner seed never ran                                                                                                                                |
| Secrets only in env stores; repo clean             | ✅     | Vercel + Railway env stores; `BETTER_AUTH_SECRET` piped via CLI (never displayed); gitleaks "no leaks found"                                                                                                                                                 |
| Backup/deletion policy accepted                    | ✅     | `docs/operations/BACKUP-AND-DELETION-POLICY.md`, owner sign-off recorded                                                                                                                                                                                     |
| Local development unchanged                        | ✅     | `pnpm verify` green; full local e2e suite green during module                                                                                                                                                                                                |

## 3. What shipped (code/config)

- Worker `Dockerfile` (node:26-slim + ffmpeg; pnpm via npm — Node 26
  images dropped corepack) + `.dockerignore`; container verified locally
  against compose before Railway.
- `redisConnectionFromEnv` carries username/password/TLS (was silently
  dropped — would break any authed Redis).
- `prisma.config.ts` honors `MIGRATE_DATABASE_URL` (Neon non-pooling) for
  migrations while runtime uses the pooled URL.
- **Default project per workspace** (`createTenant` creates "General") +
  `GET /api/projects`; assets/scripts pages fetch the workspace project
  instead of the hardcoded dev ID (production had no projects at all —
  found by the smoke).
- Prisma client generated inside the studio-web build (Vercel's cached
  install skips postinstall).
- Normalize encode lightened (`veryfast`, 2 threads) after the Railway
  container OOM-killed the 1080×1920 assembly encode.
- Ops docs: `PRODUCTION-RUNBOOK.md`, `BACKUP-AND-DELETION-POLICY.md`.

## 4. Incidents found & fixed during rollout

| Symptom                                            | Root cause                                               | Fix                                      |
| -------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------- |
| Auth 500                                           | `BETTER_AUTH_SECRET` missing in Vercel                   | Added via CLI (stdin pipe)               |
| Vercel build failed (48 errors)                    | Cached install skipped `postinstall` → no Prisma client  | Generate in build step                   |
| Upload 504, all routes logging `connect ETIMEDOUT` | `REDIS_URL` in Vercel pointed at Railway private network | Public proxy URL set via CLI             |
| Uploads impossible even when healthy               | No Project rows exist in production                      | Default project per workspace + backfill |
| Generation `failed`, `ffmpeg exit -1`              | OOM kill during 1080×1920 normalize on Railway container | `veryfast` + 2 threads                   |

Diagnostic caveat recorded: `vercel env pull` returns empty strings for
encrypted values — never use it to judge whether env vars are set.

## 5. Operational notes

- **Railway service watches `feature/aivs-infra-007-production`** — switch
  it to `main` (Settings → Source → Branch) now that everything is merged.
- Smoke artifacts live in production (tenant `riwaq-prod`, smoke account,
  one upload, one script, two generations — first one `failed` from the
  OOM incident). Harmless demo data; deletable via UI/DB later.
- The DB password pasted in chat during migration and the Redis URL are
  rotation candidates (Neon reset + Railway credential rotation) —
  low urgency, both are otherwise unexposed.
- Costs: Vercel hobby $0, Neon free tier, R2 free tier, Railway
  usage-based (~$5/mo class).

## 6. Risks / follow-ups

| Risk                                                                             | Severity  | Mitigation                                                                                         |
| -------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| Railway worker on trial credit                                                   | Medium    | Upgrade to Hobby before credit exhausts, else pipeline silently stalls (assets stay `quarantined`) |
| Single worker instance                                                           | Low       | Fine at current scale; multi-worker revisits sweep singleton                                       |
| No monitoring/alerting                                                           | Medium    | Later module; today: Railway/Vercel dashboards                                                     |
| Carry-overs: malware scan stub, guardian verification, email sender console-only | unchanged | Pre-external-users work                                                                            |

## 7. Next-module recommendation

**AIVS-PUB-008 — Publishing workflow (mock):** approved generated videos →
platform publishing mocks with the baseline §10 two-step child-media
approval (content reviewer + guardian-scope check). Completes the last
missing pipeline stage before any real-provider decisions.

**Do not start the next module without explicit user approval.**
