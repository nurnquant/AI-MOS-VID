# ADR-AIVS-007 — Production Infrastructure (Vercel-first)

**Status:** Accepted (user approved the INFRA-007 master prompt — including
the Vercel-first directive — on 2026-07-15)
**Date:** 2026-07-15
**Deciders:** User + Claude Code
**Related:** ADR-AIVS-001..006, `AI_Video_Studio_Infra_007_Master_Prompt.md`,
`docs/security/AIVS-media-security-baseline.md`

## Context

Six modules run fully local. The Vercel deployment serves static pages but
every API route 500s (no production DB/Redis/storage/secret). User
directive: host in Vercel wherever possible.

## Decision — production topology

```
Browser ──HTTPS──> Vercel (Next.js web, API routes)
                      │            │
                      ▼            ▼
        Vercel Postgres (Neon)   Cloudflare R2 (S3 API)
                      ▲            ▲
                      │            │
        Railway: worker container (Node 26 + ffmpeg) + Redis service
                      (BullMQ queues over private Redis URL)
```

1. **Web — Vercel** (existing Git integration; push-to-deploy).
2. **Postgres — Vercel Postgres (Neon) via Vercel Marketplace.** Lives in
   the user's Vercel dashboard; injects `POSTGRES_URL` (pooled) and
   `POSTGRES_URL_NON_POOLING` (direct). Runtime uses the pooled URL via
   the pg driver adapter; **migrations require the direct URL** —
   `prisma.config.ts` now honors `MIGRATE_DATABASE_URL` when set.
3. **Object storage — Cloudflare R2.** S3-compatible: existing
   `MinioStorageProvider` unchanged (endpoint/credential swap,
   path-style). **Vercel Blob rejected**: public-unguessable URLs are not
   expiring, access-controlled signed URLs (baseline §7 requirement for
   child media).
4. **Redis + worker — Railway** (the one non-Vercel piece; Vercel cannot
   run an always-on BullMQ consumer that shells out to ffmpeg). Worker
   container from the repo Dockerfile + Railway Redis addon over the
   private network. Serverless Redis (Upstash / Vercel KV) rejected:
   BullMQ depends on blocking commands and stable connections.
5. **Email — console/log sender in production too** (Resend still
   deferred; invitations are admin-driven and links appear in logs).
6. **No dev seed in production.** Bootstrap = first user registers via
   the UI and creates a workspace. Dev owner credentials never leave
   local compose.

## Production-readiness code changes (this module)

- `redisConnectionFromEnv` previously dropped username/password/TLS from
  `REDIS_URL` — fine locally, broken against any authed/TLS Redis. Now
  parses credentials and enables TLS for `rediss://`.
- `prisma.config.ts` honors `MIGRATE_DATABASE_URL` (direct/non-pooled)
  falling back to `DATABASE_URL`.
- Worker `Dockerfile` (Node 26 slim + ffmpeg, pnpm workspace install,
  Prisma client generated at build) + `.dockerignore`.

## Environment matrix

| Var                                         | Vercel (web)                                  | Railway (worker)       | Source                     |
| ------------------------------------------- | --------------------------------------------- | ---------------------- | -------------------------- |
| `DATABASE_URL`                              | pooled `POSTGRES_URL`                         | same                   | Vercel Postgres            |
| `MIGRATE_DATABASE_URL`                      | — (used from local/CI for migrate)            | —                      | `POSTGRES_URL_NON_POOLING` |
| `REDIS_URL`                                 | Railway Redis public URL (`rediss://` if TLS) | private `redis://` URL | Railway                    |
| `S3_ENDPOINT`                               | `https://<account>.r2.cloudflarestorage.com`  | same                   | R2                         |
| `S3_BUCKET` / `S3_REGION`                   | `aivs-media` / `auto`                         | same                   | R2                         |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | R2 API token pair                             | same                   | R2                         |
| `S3_FORCE_PATH_STYLE`                       | `true`                                        | `true`                 | —                          |
| `BETTER_AUTH_SECRET`                        | generated 48-byte random                      | —                      | `openssl rand -base64 48`  |
| `APP_URL`                                   | `https://aivs-studio-web.vercel.app`          | same                   | —                          |

Secrets live only in Vercel/Railway env stores; never in the repo.

## Security implications

- HTTPS end-to-end; Better Auth secure cookies (baseURL https).
- R2 bucket private; access only via time-limited signed URLs (unchanged
  policy). No public ACLs.
- **Backup & child-media deletion policy** (baseline §9) documented in
  `docs/operations/BACKUP-AND-DELETION-POLICY.md` and must be accepted by
  the user before production child media exists.
- Web and worker share the same enforcement code; consent hard-deletes
  operate on R2 exactly as on MinIO (same S3 API).

## Alternatives considered

| Area    | Alternative                              | Why rejected                                                                                   |
| ------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| DB      | Supabase / self-hosted                   | User directive: Vercel-first; Marketplace Neon keeps billing/env in Vercel                     |
| Storage | Vercel Blob                              | No expiring signed URLs — child-safety baseline violation                                      |
| Storage | Supabase storage                         | Ties storage to a non-chosen vendor                                                            |
| Redis   | Upstash / Vercel KV                      | BullMQ blocking commands unreliable on serverless Redis                                        |
| Worker  | Rearchitect to Vercel Queues + functions | Major rework of a proven pipeline; future decision if strictly-Vercel becomes hard requirement |

## Consequences

- Monthly cost target ≈ $0-5 on free/hobby tiers (Railway usage-based —
  flagged to user; card may be required).
- Local development unchanged (compose stack + `.env` defaults).
- A future multi-worker deployment must revisit the retention-sweep
  singleton (BullMQ repeatable dedupe holds, noted in CONSENT-004).
