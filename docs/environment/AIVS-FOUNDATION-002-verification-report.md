# AIVS-FOUNDATION-002 Verification Report

**Result:** **PASS**
**Date:** 2026-07-14
**Branch:** `feature/aivs-foundation-002-assets-workflow` (gates 0-6 in commits `79347c8` → `fe5b3cd`)
**ADR:** `docs/architecture/ADR-AIVS-002-asset-and-workflow-model.md` (Accepted; user approved gate 0)

## 1. Scope delivered

| Gate | Deliverable                                                        | Commit    |
| ---- | ------------------------------------------------------------------ | --------- |
| 0    | ADR-AIVS-002 (data model, state machine, queues, keys, presets)    | `79347c8` |
| 1    | `packages/database`: Prisma 7 schema, migration, idempotent seed   | `36867f0` |
| 2    | `packages/storage` (MinioStorageProvider) + `packages/queue`       | `f90be2e` |
| 3    | `packages/assets`: state machine, validators, ingest, consent gate | `caba8c2` |
| 4    | media-core normalize/thumbnail + presets; worker on both queues    | `8ea2323` |
| 5    | studio-web asset API (Zod, tenant-scoped) + minimal status page    | `2e10ce1` |
| 6    | integration + e2e suites, verify green, evidence                   | `fe5b3cd` |

76 files changed, ~4,900 insertions over ENV-001.

## 2. Definition of Done — evidence

| DoD item                                                      | Status | Evidence                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADR approved before implementation                            | ✅     | User approved 2026-07-14; commit `34e9e95`                                                                                                                                                                                                                                    |
| Migrations reproducible from empty DB                         | ✅     | `prisma migrate reset --force` → drop + reapply `20260714173637_foundation_002_init` → `migrate deploy`: "No pending migrations" → seed OK                                                                                                                                    |
| Real fixture travels full pipeline                            | ✅     | Integration: upload → quarantined → validating → ready with audit trail `[uploaded, quarantined, validating, ready]`, quarantine object deleted after promotion, thumbnail fetched via signed URL (HTTP 200). E2e: UI upload reaches `ready` badge in ~3.5 s with live worker |
| `featuresMinor` without consent blocked                       | ✅     | 3 integration tests: no consent → `rejected/consent-missing` with quarantine object **retained**; valid consent attached → reprocess → `ready`; expired consent → still blocked                                                                                               |
| Rejected assets keep audit trail + reason; quarantine cleaned | ✅     | unknown-type and kind-mismatch rejections assert `rejectionReason` persisted and quarantine object deleted; byte-cap rejection audited `size-cap-exceeded`                                                                                                                    |
| ENV-001 quality gates still pass                              | ✅     | `pnpm verify` exit 0 (env-check, prettier, eslint, typecheck, unit tests, media smoke, build)                                                                                                                                                                                 |
| No secrets committed                                          | ✅     | `gitleaks git .` — 13 commits scanned, no leaks found                                                                                                                                                                                                                         |
| Test counts                                                   | ✅     | 42 unit tests across packages; 15 integration tests (5 files); 3 Playwright e2e                                                                                                                                                                                               |

## 3. Security baseline enforcement (now in code)

- Quarantine-first ingestion; nothing served or processed from `quarantine/`.
- Magic-byte allowlist (mp4/mov/webm, mp3/aac/wav/flac, jpeg/png/webp; SVG and
  everything else rejected) + ffprobe/sharp deep decode; claimed-vs-detected
  kind mismatch = reject + audit row.
- Generated UUID storage keys, injection-checked parts; original filenames are
  sanitized display metadata only.
- Streaming upload cap enforced mid-stream (aborts the multipart upload), 413
  at the API; per-kind size/duration limits at validation.
- Signed URLs only (default 15 min, hard cap 24 h); quarantine keys refused.
- Tenant scoping on every table, query, and storage key.
- Malware scanning boundary stubbed (`AlwaysPassScanner`) behind a
  `MalwareScanner` interface — ClamAV adapter required before external uploads.
- Consent gate: `featuresMinor` asset cannot leave quarantine without a valid
  (unexpired, unrevoked) consent record; the object is held for later consent.

## 4. Deviations from ADR (all minor)

1. **Thumbnails are png, not webp** — the Homebrew ffmpeg 8.1.2 build has no
   webp encoder. png is on the image allowlist; ADR §6 updated.
2. **Added `uploaded → rejected` edge** to the state machine so a tripped byte
   cap or failed upload stream leaves an audited rejection instead of a
   deleted row (master prompt requires rejected assets keep audit trails).
3. **Added `rejected → validating` edge** for the reprocess path (implied by
   ADR §3 reprocess semantics).

## 5. Operational notes

- **Prisma 7.8** requires the datasource URL in `prisma.config.ts` (loads root
  `.env` via `process.loadEnvFile`) and a driver adapter (`@prisma/adapter-pg`);
  generated client lands in `packages/database/src/generated/` (gitignored,
  regenerated on `pnpm install` via postinstall).
- **Prisma warns Node 26 is unsupported** (supports 20.19+/22.12+/24.x). All
  operations work; revisit if Prisma hard-fails later (ADR-001 already flags
  the Node 26 deviation).
- `prisma migrate reset` now has an AI-agent consent guard; humans running
  `pnpm db:reset` locally are unaffected.
- Node type-stripping requires erasable-only TS: relative imports carry `.ts`
  extensions and constructor parameter properties are banned (one runtime
  failure was caught and fixed in gate 6 e2e).
- Worker start: `pnpm --filter @aivs/worker start` with root `.env` sourced
  (e2e spawns it automatically).

## 6. Risks / follow-ups

| Risk                                                                  | Severity                     | Mitigation                                                    |
| --------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------- |
| Malware scanner is always-pass                                        | High before external uploads | Ship ClamAV adapter before any non-trusted upload source      |
| No authentication; tenant via header                                  | High before network exposure | Auth module next; schema already tenant-scoped                |
| Retention/deletion policies (baseline §9) not yet automated           | Medium                       | Needs a scheduled cleanup worker in a later module            |
| BullMQ jobs orphaned if Postgres rows deleted out-of-band             | Low                          | Job rows are source of truth; queues drained in test teardown |
| Upload route buffers nothing but holds one HTTP connection per upload | Low                          | Presigned-PUT revisit with auth module                        |

## 7. Next-module recommendation

**AIVS-AUTH-003 — Authentication, authorization, and tenant onboarding.**
Everything downstream (consent capture UX, publishing approvals, signed-URL
issuance rules) depends on real identities and roles; the schema is already
tenant-scoped so this bolts on without migration pain. Alternative if content
work is more urgent: script/storyboard module against mock providers.

**Do not start the next module without explicit user approval.**
