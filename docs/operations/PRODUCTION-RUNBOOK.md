# AIVS Production Runbook (INFRA-007)

Topology: ADR-AIVS-007. Web on Vercel, Postgres on Vercel Marketplace
(Neon), media on Cloudflare R2, worker + Redis on Railway.

## One-time provisioning (user actions)

1. **Vercel Postgres:** Vercel dashboard → Storage → Create → Postgres
   (Neon). Attach to project `aivs-studio-web`. Note `POSTGRES_URL`
   (pooled) and `POSTGRES_URL_NON_POOLING` (direct).
2. **Cloudflare R2:** dashboard → R2 → create bucket `aivs-media`
   (private). Create an R2 API token (Object Read & Write, this bucket
   only). Note account endpoint
   `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, access key id, secret.
3. **Railway:** new project → add **Redis** service → add service **from
   GitHub repo** `nurnquant/AI-MOS-VID`, root Dockerfile path
   `apps/worker/Dockerfile`. Railway builds on push to `main`.
4. Generate the auth secret once: `openssl rand -base64 48`.

## Environment

Vercel project → Settings → Environment Variables (Production):

```
DATABASE_URL          = <POSTGRES_URL (pooled)>
REDIS_URL             = <Railway Redis PUBLIC url; rediss:// if TLS>
S3_ENDPOINT           = https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_REGION             = auto
S3_BUCKET             = aivs-media
S3_ACCESS_KEY_ID      = <r2 access key>
S3_SECRET_ACCESS_KEY  = <r2 secret>
S3_FORCE_PATH_STYLE   = true
BETTER_AUTH_SECRET    = <generated>
APP_URL               = https://aivs-studio-web.vercel.app
```

Railway worker service → Variables: same set, except `REDIS_URL` uses the
**private** `redis://` reference (`${{Redis.REDIS_URL}}`) and
`BETTER_AUTH_SECRET`/`APP_URL` may be omitted (worker doesn't serve auth).

## Migrations

Run from a trusted machine (never automatic):

```bash
MIGRATE_DATABASE_URL='<POSTGRES_URL_NON_POOLING>' \
  pnpm --filter @aivs/database db:deploy
```

**No seed in production.** First user registers via the UI and creates a
workspace (becomes owner). Dev credentials are local-only.

## Deploys

- Web: push to `main` → Vercel builds.
- Worker: push to `main` → Railway rebuilds the Dockerfile.
- Verify worker: Railway logs show four `worker connected and ready`
  lines (asset-validation, media-processing, consent-enforcement,
  generation) and an hourly `retention-sweep` completion.

## Secret rotation

1. Generate new value; set in Vercel/Railway env; redeploy both.
2. Rotating `BETTER_AUTH_SECRET` invalidates sessions (users re-login).
3. R2 keys: create second token, swap env, delete old token.

## Smoke check (after any deploy)

1. `GET /api/health` → 200.
2. Register/login over HTTPS; cookie is `Secure`.
3. Upload small mp4 → status reaches `ready` (worker log shows
   validate-asset) → signed URL plays.
4. Script → approve → generation → final video opens.

## Troubleshooting

- API 500s: check Vercel env completeness first (all vars above).
- Assets stuck `quarantined`: worker down or `REDIS_URL` mismatch between
  web (public URL) and worker (private URL) — both must point at the SAME
  Redis instance.
- Prisma `P1001` on migrate: use the NON-pooling URL.
- Signed URL 403 from R2: token scope must include the bucket; check
  clock skew is not the issue before rotating keys.
