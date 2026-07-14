# AI Video Studio — Core Media Asset and Workflow Foundation Master Prompt

**Document ID:** AIVS-FOUNDATION-002
**Version:** 0.1 (DRAFT — pending user review)
**Status:** Draft for approval; do not execute until approved
**Project:** Riwaq Al Ilm Enterprise AI Video Production Studio
**Depends on:** AIVS-ENV-001 (verified PASS 2026-07-14)
**Primary Objective:** Build the persistent asset model, secure ingestion pipeline, and job/workflow foundation that every future module (script, storyboard, generation, publishing) will sit on.

---

## 1. Claude Operating Role

You are acting as a **Principal Software Architect, Backend Engineer, Media Pipeline Engineer, Security Engineer, and Senior QA Automation Engineer**.

Operate architecture-first and evidence-first. All AIVS-ENV-001 non-negotiable
rules remain in force, plus:

1. Work on a dedicated branch: `feature/aivs-foundation-002-assets-workflow`.
2. Every schema change ships as a Prisma migration — never edit the database manually.
3. Enforce the media security baseline (`docs/security/AIVS-media-security-baseline.md`) in code, not just docs: quarantine, magic-byte + ffprobe validation, generated storage keys, no public ACLs.
4. Still **no paid provider calls, no publishing, no deployment**. Mocks only.
5. No authentication yet — but every table and storage key is tenant-scoped from day one so auth can bolt on without migration pain.
6. Child-media consent: schema and enforcement hook exist in this module (an asset flagged `featuresMinor` without a consent record cannot leave quarantine); full consent workflows come later.

---

## 2. Scope

### In scope

- **Prisma + PostgreSQL schema:** tenants, projects, assets, asset versions, consent records, jobs, workflow transitions (audit trail).
- **Asset lifecycle state machine:** `uploaded → quarantined → validating → ready | rejected`, plus `archived`. Transitions only via a single service function; every transition recorded.
- **Ingestion pipeline:** upload API route (streaming, size-capped) → quarantine bucket prefix → validation worker job (magic bytes, ffprobe metadata, type allowlist, duration/size limits) → promotion to assets prefix or rejection with reason.
- **Media jobs (real implementations of ENV-001 placeholders):** `inspectMedia` persistence, video normalization (target resolution/fps presets for the 7 platform formats), thumbnail generation.
- **Storage service:** `MinioStorageProvider` implementing the `StorageProvider` contract (put/get/delete/signed URL), path-style, tenant-namespaced keys `tenant/{tenantId}/project/{projectId}/asset/{uuid}.{ext}`.
- **Queue architecture:** named BullMQ queues (`asset-validation`, `media-processing`) with retry/backoff policy, dead-letter handling, idempotent processors.
- **API routes (studio-web):** create/list/get assets, upload, asset status, trigger reprocess. Zod-validated. No UI beyond a minimal asset list/status page.
- **Tests:** unit for state machine + validators; integration for full pipeline (upload fixture → quarantine → validate → promote → thumbnail → signed URL fetch); e2e for upload-and-see-status flow.

### Out of scope (later modules)

- Authentication/authorization, real tenant onboarding
- Script/storyboard/prompt generation, any AI provider integration
- Publishing integrations, analytics
- Malware scanning engine (boundary stubbed: a `scan` job step that always passes locally, interface ready for ClamAV)
- Consent capture UX (schema + gate only)

---

## 3. Execution Gates

### Gate 0 — Design Review

Data model diagram, state machine definition, queue topology, storage key scheme → `docs/architecture/ADR-AIVS-002-asset-and-workflow-model.md`. **Stop for user approval of the ADR before writing code.**

### Gate 1 — Schema and Migrations

Prisma installed in `packages/database`; initial migration applied to local Postgres; seed script for a dev tenant + project.

### Gate 2 — Storage and Queue Services

`MinioStorageProvider` + queue wiring with tests.

### Gate 3 — Ingestion Pipeline

Upload route, quarantine, validation worker, promotion/rejection, consent gate.

### Gate 4 — Media Processing Jobs

Normalization presets + thumbnail jobs; results persisted as asset versions.

### Gate 5 — API and Minimal UI

Asset endpoints + status page.

### Gate 6 — Validation

Full test suite, `pnpm verify` green, pipeline demonstrated end-to-end with a real fixture video; evidence captured.

### Gate 7 — Verification Report

`docs/environment/AIVS-FOUNDATION-002-verification-report.md` with PASS/FAIL, evidence, risks, next-module recommendation.

---

## 4. Definition of Done

- ADR-AIVS-002 approved by user before implementation
- Prisma migrations reproducible from empty database (`pnpm db:reset && pnpm db:migrate`)
- A real video fixture travels the full pipeline locally with command evidence
- Asset flagged `featuresMinor` without consent record is blocked from promotion (tested)
- Rejected assets keep audit trail + reason; quarantine objects cleaned up
- All ENV-001 quality gates still pass (`pnpm verify`)
- No secrets committed; gitleaks clean
- Verification report complete; user approval requested before next module
