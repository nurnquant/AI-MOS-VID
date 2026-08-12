# AIVS-CONTENTDB-016 — Content productions in Postgres

**Status: DRAFT — pending user approval. No code, no migration, no DB write
has been made.**

Requested 2026-08-12: _"can we be able to store all request, scripts, video in
any db?"_ → answered **"Use the AIVS Postgres."**

This is a schema change, so per `CLAUDE.md` it can only happen via a Prisma
migration inside a numbered module with explicit approval. Hence a draft.

## Why a module and not a quick script

Two rules in `CLAUDE.md` bind here:

- _"Schema changes only via Prisma migrations. Never edit the database manually."_
- _"Never start a new module without explicit user approval."_

Adding tables for content productions is a schema change to the same Prisma
schema the studio app owns (21 models, 12 migrations). It needs a migration
file, a regenerated client, and `pnpm verify` green.

## Scope

Make `productions/registry.json` queryable and durable, without changing how
production work is actually done.

**In scope:** four new tables, a sync command on the existing
`scripts/social/productions.py`, request and caption markdown stored as text,
deliverable files catalogued by path + hash + dimensions.

**Out of scope:** storing video bytes in Postgres; wiring content productions
to the studio app's UI; any social platform API; a publishing calendar.

## What "store the video" means here

Video bytes do **not** go in Postgres. A single 9:16 60s render is 3–12 MB and
Neon storage is metered — 25 productions of media would bloat the database for
no query benefit. Instead:

| Thing                             | Where it lives                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| Request brief (`00-REQUEST.md`)   | **Postgres**, full text                                                                |
| Notes, captions, scripts, VO text | **Postgres**, full text                                                                |
| Style spec                        | **Postgres**, one row per style                                                        |
| Ratings, platforms, cost, dates   | **Postgres**, typed columns                                                            |
| The mp4/png itself                | **Disk**, catalogued in Postgres by relative path, size, SHA-256, dimensions, duration |

Phase 2 (separate, not in this module) could push the bytes to the MinIO/S3
bucket that `packages/storage` already talks to, and store the object key. Worth
doing only if these files ever need to be served or survive this machine.

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
  path         String            // repo-relative
  kind         ContentAssetKind
  bytes        BigInt
  sha256       String
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

**`registry.json` stays authoritative. Postgres is a queryable mirror.**

One-way sync avoids the merge problem entirely: the file is edited by the CLI
and by hand, it lives in git, and it works with the DB down (which it is right
now). Two-way sync would need conflict resolution for zero benefit.

```bash
python3 scripts/social/productions.py --sync-db     # push registry.json -> Postgres
python3 scripts/social/productions.py --sync-db --check   # diff only, no write
python3 scripts/social/productions.py --sql "…"     # convenience read-only query
```

`--sync-db` is idempotent: upsert by `number`, replace the deliverable and
platform rows for each production, never delete a production row that has
vanished from the registry without `--prune` being passed explicitly.

## What Postgres buys that JSON does not

Concretely, the queries that are awkward today:

- Editor and visitor averages **per style**, with confidence — the dashboard
  currently computes flat averages in Python.
- Cost per published minute of video, by style and by month.
- Full-text search across every request and caption at once.
- "Which delivered productions have sat unpublished longest" — the review
  bottleneck already visible in the ratings data.
- Rating history over time, once `syncedAt` snapshots accumulate.

## Prerequisites (both currently unmet)

1. **A reachable database.** `colima is not running` and port 5433 is closed.
   Either `colima start && pnpm infra:up` for local, or current Neon
   credentials in root `.env` for the live one.
2. **Approval for this module**, including the migration name.

## Gates

| Gate | Content                                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------- |
| 0    | Approval; confirm target DB (local 5433 vs Neon); branch `feat/aivs-contentdb-016`                      |
| 1    | Prisma models + enums above; `npx prisma migrate dev --name content_productions`; `npx prisma generate` |
| 2    | Seed `ContentStyle` rows 1–5 from `library/STYLES.md`                                                   |
| 3    | `--sync-db` in `productions.py` (psycopg, upsert by number, `--check` and `--prune`)                    |
| 4    | Backfill all 25 productions; verify counts and per-style aggregates match the dashboard exactly         |
| 5    | Read-only query helpers for the five queries above                                                      |
| 6    | `pnpm verify` green; `--sync-db --check` clean on a second run (idempotency proof)                      |
| 7    | Verification report in `docs/environment/AIVS-CONTENTDB-016-verification-report.md`; merge ff to main   |

## Risks

- **Schema drift with the studio app.** Mitigated by the `Content*` prefix and
  zero FKs into app tables — the two halves can evolve independently.
- **Neon storage cost.** Text-only, so tiny; the media stays on disk.
- **Sync silently wrong.** Gate 4 compares DB aggregates against the dashboard's
  numbers rather than assuming; gate 6 proves idempotency.
- **Registry and DB diverge.** `--sync-db --check` is the guard, and it should
  run whenever the registry changes.

## Decisions needed from you

1. Approve as module **AIVS-CONTENTDB-016**, or do it as a lighter additive
   change outside the module process?
2. Target the local Postgres (needs `colima start`) or Neon (needs credentials)?
3. Phase 2 — push the media bytes to MinIO/S3 too, or leave files on disk?
