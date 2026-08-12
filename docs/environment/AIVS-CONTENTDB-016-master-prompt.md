# AIVS-CONTENTDB-016 — Content productions in Postgres

**Status: DRAFT — pending user approval. No code, no migration, no DB write
has been made.**

Requested 2026-08-12: _"can we be able to store all request, scripts, video in
any db?"_ → answered **"Use the AIVS Postgres."** Then refined: **"we do not
need any local db. after the local video production i prefer to have them
uploaded to production DB."**

So the target is **production only** — Neon Postgres for the records, Cloudflare
R2 for the media. No local Postgres, no MinIO, nothing to `colima start`.
Production runs the local tree straight up to production after a render is
finished and reviewed.

This is a schema change, so per `CLAUDE.md` it can only happen via a Prisma
migration inside a numbered module with explicit approval. Hence a draft.

## Why a module and not a quick script

Two rules in `CLAUDE.md` bind here:

- _"Schema changes only via Prisma migrations. Never edit the database manually."_
- _"Never start a new module without explicit user approval."_

Adding tables for content productions is a schema change to the same Prisma
schema the studio app owns (21 models, 12 migrations). It needs a migration
file, a regenerated client, and `pnpm verify` green.

## Target infrastructure — already provisioned

Nothing new has to be bought or created. The production stack from
`docs/operations/PRODUCTION-RUNBOOK.md` is live and its credentials sit in the
Vercel production environment:

| Piece         | Service                     | Env vars in Vercel production                                          |
| ------------- | --------------------------- | ---------------------------------------------------------------------- |
| Records       | **Neon Postgres**           | `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `PGHOST`, `NEON_PROJECT_ID`   |
| Media objects | **Cloudflare R2**           | `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` |
| Client        | `packages/storage` (S3 SDK) | already speaks to R2 unchanged                                         |

## Scope

Take a finished, reviewed production from the local tree and put it in
production: records into Neon, media objects into R2.

**In scope:** four new tables; an `--upload` command on the existing
`scripts/social/productions.py`; request/notes/caption markdown stored as text;
media bytes uploaded to R2 with the object key and SHA-256 recorded.

**Out of scope:** any local database; wiring content productions into the studio
app's UI; any social platform API; a publishing calendar.

## What goes where

Video bytes go to **R2**, not into Postgres — a 60s 9:16 render is 3–12 MB and
Neon storage is metered, whereas R2 is built for exactly this and charges no
egress.

| Thing                             | Where it lands                                                      |
| --------------------------------- | ------------------------------------------------------------------- |
| Request brief (`00-REQUEST.md`)   | **Neon**, full text                                                 |
| Notes, captions, scripts, VO text | **Neon**, full text                                                 |
| Style spec                        | **Neon**, one row per style                                         |
| Ratings, platforms, cost, dates   | **Neon**, typed columns                                             |
| The mp4/png itself                | **R2** object; Neon stores key, size, SHA-256, dimensions, duration |

Object key layout, mirroring the numbering so a key is self-describing:

```
content/0022-la-hawla/0022-la-hawla-9x16.mp4
content/0011-fb-series-01/0011-fb-series-01-post3-true-success-16x9.png
```

**Deliverables only** — the `OUTPUT/` folders, currently 80 files / **268 MB**.
The `work/` intermediates (the other ~620 MB: stills, per-scene clips, card
PNGs) stay local. They are reproducible and worth nothing in production.

### Cost

At 268 MB: R2 storage **≈ $0.004/month**, uploads are Class A writes well inside
the free 1M/month, egress **free**. Neon holds text only — negligible. Growth of
a few hundred MB a month keeps this under a cent. Effectively free, but it is
still a paid external service, so it needs the approval below.

## Proposed schema

Prefixed `Content*` so it is unmistakably separate from the studio app's
`Script`/`Scene`/`Generation` pipeline, which models a different thing (app-run
generations under a tenant/project) and would be a bad fit.

```prisma
model ContentProduction {
  id          String   @id @default(cuid())
  number      String   @unique          // "0022" — the tracking number
  slug        String
  title       String
  type        ContentType
  status      ContentStatus
  styleNumber Int?
  style       ContentStyle? @relation(fields: [styleNumber], references: [number])

  folder      String                    // "productions/0022-la-hawla"
  request     String?  @db.Text         // 00-REQUEST.md verbatim
  notes       String?  @db.Text         // 01-NOTES.md verbatim

  model       String?                   // "veo3_1 + nano_banana_pro + seed_audio"
  credits     Int      @default(0)
  usd         Decimal  @default(0) @db.Decimal(10, 2)

  requestedAt DateTime? @db.Date
  producedAt  DateTime? @db.Date
  publishedAt DateTime? @db.Date
  confirmedUnpublishedAt DateTime? @db.Date

  editorRating   Int?                   // 1-5, user's rating of delivery
  visitorRating  Int?                   // 1-5, engagement first 24h

  deliverables ContentDeliverable[]
  posts        ContentPlatformPost[]
  syncedAt     DateTime @updatedAt

  @@index([status])
  @@index([styleNumber])
}

model ContentStyle {
  number      Int      @id             // 1..N, never renumbered
  name        String                   // "Cinematic Reverent"
  spec        String   @db.Text        // the STYLES.md section
  productions ContentProduction[]
}

model ContentDeliverable {
  id           String @id @default(cuid())
  productionId String
  production   ContentProduction @relation(fields: [productionId], references: [id], onDelete: Cascade)
  path         String            // repo-relative, where it was produced
  objectKey    String?  @unique  // R2 key; null until uploaded
  uploadedAt   DateTime?
  kind         ContentAssetKind
  bytes        BigInt
  sha256       String            // verified after upload
  width        Int?
  height       Int?
  durationSec  Float?
  @@unique([productionId, path])
}

model ContentPlatformPost {
  id           String @id @default(cuid())
  productionId String
  production   ContentProduction @relation(fields: [productionId], references: [id], onDelete: Cascade)
  platform     ContentPlatform
  publishedOn  DateTime? @db.Date       // null + scheduled=true means planned
  scheduled    Boolean   @default(false)
  @@unique([productionId, platform])
}

enum ContentType      { video image_set watermark program }
enum ContentStatus    { requested in_progress delivered published parked }
enum ContentAssetKind { video image doc audio }
enum ContentPlatform  { facebook instagram pinterest x tiktok youtube }
```

Notes on choices:

- `number` is `String`, not `Int` — `"0022"` is the identifier everywhere else
  and zero-padding must survive the round trip.
- `usd` is `Decimal(10,2)`, not `Float` — money.
- `ContentPlatformPost` has a row only for platforms actually used, so absence
  means "not published", matching the current `null` semantics.
- No tenant or project FK. Content work is not multi-tenant and inventing a
  tenant for it would be noise.

## Direction of truth

**`registry.json` stays authoritative. Neon is the durable, queryable copy.**

One-way push avoids the merge problem entirely: the file is edited by the CLI and
by hand, it lives in git, and production work keeps running with no network at
all. Two-way sync would need conflict resolution for zero benefit.

## Workflow — how a production reaches production

```bash
# 1. produce locally, exactly as today. nothing changes here.
# 2. you review and rate it
python3 scripts/social/productions.py --rate 0022 --editor 4

# 3. push it up: records to Neon, deliverables to R2
python3 scripts/social/productions.py --upload 0022

# variants
--upload 0022 --dry-run     # show what would go, byte counts, no network
--upload --all              # every production at status delivered or published
--upload 0022 --records-only  # Neon rows, skip the media
--verify 0022               # re-hash R2 objects against local files
```

Rules baked into `--upload`:

- **Only `delivered` or `published` productions.** A half-finished render has no
  business in production. `requested`/`in-progress` are refused with a message.
- **Idempotent.** Upsert by `number`; skip any object whose R2 SHA-256 already
  matches local. Re-running is a no-op.
- **Never deletes.** Removing something from production is a separate explicit
  `--unpublish-object` action, never a side effect of a sync.
- **Verify after write.** Re-read each object's checksum; a mismatch fails loud
  and leaves the row's `uploadedAt` null.
- **`--dry-run` first** on the initial bulk upload.

## What Neon buys that JSON does not

Beyond durability — right now every record and every render exists on one
laptop, and 268 MB of deliverables are deliberately **not** in git.

Queries that are awkward today:

- Editor and visitor averages **per style** — the dashboard computes flat
  averages in Python.
- Cost per published minute of video, by style and by month.
- Full-text search across every request and caption at once.
- "Which delivered productions have sat unpublished longest" — the review
  bottleneck already visible in the ratings data.
- Rating history over time, once `syncedAt` snapshots accumulate.

And a shareable URL per deliverable, since R2 can serve the object directly.

## Prerequisites (currently unmet)

1. **Production credentials reachable from this machine.** `DATABASE_URL` and
   the four `S3_*` vars exist in Vercel production env but are not in the local
   root `.env` (which points at `localhost:5433`). Getting them here needs
   `vercel env pull` — **which was blocked by the permission classifier this
   session**, so either you run it, or you approve that command for me.
2. **Approval for this module.**
3. **Approval to write to production and to use R2**, per the `CLAUDE.md` rule on
   external/paid services. Cost is ~$0.004/month but the rule is the rule.

Note the migration must run against Neon with `prisma migrate deploy`, not
`migrate dev` — never `migrate dev` against a production database.

## Gates

| Gate | Content                                                                                                                                         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Approval; production credentials available; branch `feat/aivs-contentdb-016`                                                                    |
| 1    | Prisma models + enums above; generate migration locally against a shadow DB; `npx prisma generate`                                              |
| 2    | `prisma migrate deploy` against Neon; confirm the 12 existing migrations are unchanged and the app still boots                                  |
| 3    | Seed `ContentStyle` rows 1–5 from `library/STYLES.md`                                                                                           |
| 4    | `--upload` in `productions.py`: Neon upsert by number + R2 put, `--dry-run`, `--records-only`, `--verify`                                       |
| 5    | `--upload --all --dry-run`, review the manifest, then upload the 22 delivered/published productions                                             |
| 6    | Verify: per-style aggregates from SQL match the dashboard exactly; every object's R2 checksum matches local; second `--upload --all` is a no-op |
| 7    | `pnpm verify` green; verification report in `docs/environment/AIVS-CONTENTDB-016-verification-report.md`; merge ff to main                      |

## Risks

- **Migrating a production database.** Additive only — new tables, new enums, no
  change to the 21 existing models, so no data migration and nothing to
  backfill. `migrate deploy`, never `migrate dev`.
- **Schema drift with the studio app.** Mitigated by the `Content*` prefix and
  zero FKs into app tables.
- **Production credentials on a laptop.** They stay in the root `.env`, which is
  gitignored. Worth checking that is still true before pulling them down.
- **Upload silently wrong.** Every object is re-hashed after write; gate 6 proves
  idempotency and cross-checks aggregates against the dashboard rather than
  trusting them.
- **R2 deletion is immediate and final** — no versioning, per
  `docs/operations/BACKUP-AND-DELETION-POLICY.md`. Hence `--upload` never
  deletes, and local files are never removed after upload.

## Decisions needed from you

1. Approve as module **AIVS-CONTENTDB-016**?
2. Approve writing to production Neon + using the R2 bucket (~$0.004/month)?
3. Upload only `OUTPUT/` deliverables (268 MB, recommended), or the `work/`
   intermediates too (891 MB total)?
4. Do you run `vercel env pull`, or approve me running it?
