# AI Video Studio — Production Infrastructure Master Prompt

**Document ID:** AIVS-INFRA-007
**Version:** 0.1 (DRAFT — pending user review)
**Status:** Draft for approval; do not execute until approved
**Project:** Riwaq Al Ilm Enterprise AI Video Production Studio
**Depends on:** Modules 001-006 (all PASS)
**Primary Objective:** Make the deployed app real: production Postgres,
Redis, object storage, a long-running worker host, and Vercel env — so
`aivs-studio-web.vercel.app` stops 500ing and the full pipeline (auth →
assets → consent → scripts → generation) runs off this machine.

---

## 1. This module is different — external services

Every prior module was local-only. This one **provisions external
services**, which the standing rules forbid without explicit approval.
Therefore:

1. Each service below is an explicit decision **you** approve; account
   signup and credential creation are **user actions** — Claude never
   creates accounts or accepts ToS on your behalf.
2. Gates pause wherever a credential/env value is needed; you paste values
   directly into Vercel/host dashboards or the local `.env` (never into
   chat if avoidable, never committed — gitleaks stays clean).
3. Free tiers preferred throughout; anything with a card-on-file
   requirement is flagged before you sign up.
4. **Child-media posture:** production child media may not exist until the
   backup-rotation deletion policy (baseline §9, CONSENT-004 carry-over)
   is documented and accepted in this module.

## 2. Proposed stack — Vercel-first (user directive: host in Vercel)

Everything that can live in the Vercel platform does. One honest
exception: **the worker cannot run on Vercel** — it is a long-running
BullMQ consumer that shells out to ffmpeg; Vercel functions are
short-lived and have no persistent processes. It needs one small external
always-on host. Everything else is Vercel-managed:

| Concern        | Recommendation                                                              | Notes                                                                                                                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web            | **Vercel** (already deployed via Git integration)                           | Env: DATABASE_URL, REDIS_URL, S3_*, BETTER_AUTH_SECRET, APP_URL                                                                                                                                                                                               |
| Postgres       | **Vercel Postgres (Neon) via the Vercel Marketplace**                       | Provisioned and billed inside the Vercel dashboard; env vars auto-injected into the project; Prisma works over the pooled + direct URLs                                                                                                                       |
| Object storage | **Cloudflare R2** (S3-compatible)                                           | `MinioStorageProvider` works unchanged. Vercel Blob was evaluated and **rejected on child-safety grounds**: it serves public-but-unguessable URLs, not expiring access-controlled signed URLs — baseline §7 requires time-limited signed URLs for child media |
| Redis + worker | **Railway** (worker container + colocated Redis) — the one non-Vercel piece | BullMQ needs real Redis (blocking commands); serverless Redis (Upstash/Vercel KV) is unreliable for BullMQ. Alternatives: Fly.io, small VPS                                                                                                                   |
| Email          | Stays console/log (Resend deferred)                                         | Invitation links visible in worker/web logs only                                                                                                                                                                                                              |

If you want strictly-Vercel-only later, the path is replacing BullMQ with
Vercel Queues + moving ffmpeg into function-sized chunks — a significant
rearchitecture, out of scope here and flagged as a future decision.

## 3. Scope

### In scope

- **ADR-AIVS-007** recording the service decisions + production topology.
- **Worker containerization:** Dockerfile (Node 26, ffmpeg installed),
  host config (Railway/Fly), health logging, env wiring.
- **Environment matrix:** documented production env vars for web (Vercel)
  and worker (host); `BETTER_AUTH_SECRET` generation; `APP_URL` set to the
  production domain; secure cookie behavior verified over HTTPS.
- **Database:** `prisma migrate deploy` against production Postgres (run
  by Claude once you provide the URL); **no dev seed** — production
  bootstrap is: first user registers via the UI and creates a workspace.
  The known dev owner credentials never touch production.
- **Storage:** R2 bucket + CORS as needed for signed URLs; prefix layout
  identical to local.
- **Ops docs:** production runbook (deploy, rotate secret, run migration,
  check queues), **backup & child-media deletion policy** (what Supabase/
  R2 retain, how deletion enforcement extends to backups, stated RPO).
- **Verification:** production smoke — health 200, register/login over
  HTTPS, upload a small video → worker validates → `ready` → signed URL
  plays; script → generation → final video in production; gitleaks clean;
  no dev credentials anywhere in production.

### Out of scope

- Custom domain, CDN tuning, WAF
- Monitoring/alerting stack (basic host logs only this module)
- Autoscaling, multi-worker coordination
- Enabling any AI/publishing provider (still mocks in production)

## 4. Execution Gates

- **Gate 0 — Decisions:** ADR-AIVS-007; **you confirm each service choice
  and create the three accounts** (Vercel Postgres (in your existing Vercel account), Railway/Fly, Cloudflare).
- **Gate 1 — Storage + DB up:** you provide URLs/keys → Claude runs
  migrations, verifies connectivity from local against production services.
- **Gate 2 — Worker image:** Dockerfile + local container run passes the
  pipeline against production services.
- **Gate 3 — Worker deployed** on the host, consuming production queues.
- **Gate 4 — Vercel env** set (by you, checklist provided) → redeploy →
  API routes live.
- **Gate 5 — Production smoke** (full pipeline) + security checks.
- **Gate 6 — Ops docs** (runbook + backup/deletion policy).
- **Gate 7 — Verification report.**

## 5. Definition of Done

- `aivs-studio-web.vercel.app`: register → workspace → upload → `ready` →
  signed URL works end-to-end in production
- Script → generation → final video works in production (worker host)
- Production DB has real migrations, no dev seed/credentials
- All secrets live only in Vercel/host env stores; repo gitleaks-clean
- Backup & child-media deletion policy documented and user-accepted
- Local development remains fully working (compose stack untouched)
- Verification report; user approval before next module
