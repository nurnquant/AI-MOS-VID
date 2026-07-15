# AI Video Studio — Child-Media Consent Capture and Governance Master Prompt

**Document ID:** AIVS-CONSENT-004
**Version:** 0.1 (DRAFT — pending user review)
**Status:** Draft for approval; do not execute until approved
**Project:** Riwaq Al Ilm Enterprise AI Video Production Studio
**Depends on:** AIVS-FOUNDATION-002 (PASS), AIVS-AUTH-003 (PASS 2026-07-15)
**Primary Objective:** Turn the consent _gate_ into a consent _lifecycle_:
capture, attach, revoke, expire — with enforced retention/deletion
(security baseline §9-§10) and full audit, so child media is governed
end-to-end before any publishing work begins.

---

## 1. Claude Operating Role

Principal Software Architect, Backend Engineer, Security/Privacy Engineer,
Senior QA Automation Engineer. All prior non-negotiables remain, plus:

1. Branch `feature/aivs-consent-004-governance`.
2. Schema via Prisma migrations only.
3. No paid services; local email/log sender only; mocks only.
4. **Deletion is real deletion:** revocation/expiry hard-deletes storage
   objects (original + all derived versions + retained quarantine objects)
   and scrubs asset metadata, leaving only an audit tombstone (no
   child-identifying data in it).
5. Guardian identity verification is a stubbed boundary (interface +
   always-manual local implementation); real verification is a later,
   user-approved integration.
6. Every consent lifecycle action is audited (who, what, when, scope).

## 2. Scope

### In scope

- **Consent lifecycle:** derived status (`active` / `expired` / `revoked`),
  revocation with actor + reason, guardian contact field, optional document
  reference (path/URL string only — no file upload of consent documents in
  this module).
- **RBAC:** view consent registry = `child_media_reviewer`+; create /
  attach / revoke = `child_media_reviewer`+ (governance role), tenant-scoped.
- **Attach flow:** upload form gains featuresMinor + consent selection;
  post-hoc attach of consent to a `consent-missing` rejected asset
  auto-re-enqueues validation (asset becomes `ready` without re-upload).
- **Revocation/expiry enforcement:** new `consent-enforcement` queue job:
  hard-delete all linked assets' storage objects + versions + metadata,
  write `asset.child_media.deleted` audit tombstones; revocation enqueues
  immediately, expiry found by a **repeatable sweep job** (BullMQ cron,
  hourly locally). Sweep also deletes retained `consent-missing` quarantine
  objects older than 30 days (baseline §9 raw-upload retention).
- **API + UI (studio-web):** consent registry page (list with status,
  create form, revoke with confirmation + reason), asset detail shows
  consent linkage; Zod-validated routes.
- **Audit events:** `consent.created`, `consent.attached`,
  `consent.revoked`, `consent.expired_swept`, `asset.child_media.deleted`.
- **Tests:** unit (status derivation, guards), integration (attach →
  revalidate → ready; revoke → hard-delete verified in MinIO + DB; expiry
  sweep; quarantine retention sweep), e2e (reviewer captures consent,
  uploads minor-flagged asset, sees ready; revoke → asset gone).

### Out of scope (later modules)

- Publishing approval workflow (needs publishing module)
- Consent document file uploads / e-signature
- Real guardian identity verification
- Backup-rotation deletion guarantees (documented as operational note)
- Email notifications to guardians (console sender only)

## 3. Execution Gates

- **Gate 0 — ADR-AIVS-004:** consent state model, enforcement queue
  topology, deletion semantics + tombstone shape, retention sweep design.
  Stop for approval unless implementation is pre-authorized.
- **Gate 1 — Schema:** ConsentRecord extensions + migration.
- **Gate 2 — Consent services:** lifecycle + status derivation + audit.
- **Gate 3 — Enforcement:** deletion job, revocation trigger, sweep cron.
- **Gate 4 — API + UI.**
- **Gate 5 — Attach/revalidate flow wired into upload + asset detail.**
- **Gate 6 — Validation:** full suites + `pnpm verify` + evidence.
- **Gate 7 — Verification report** + next-module recommendation.

## 4. Definition of Done

- Consent-missing asset becomes `ready` after consent attach + reprocess,
  without re-upload (tested)
- Revocation hard-deletes every storage object and version of linked
  assets; MinIO verified empty; only audit tombstone remains (tested)
- Expired consent swept automatically; same deletion guarantees (tested)
- Retained consent-missing quarantine objects deleted after 30 days (tested
  with injected timestamps)
- All lifecycle actions audited; tombstones contain no child PII
- Roles enforced: below child_media_reviewer sees no consent data (tested)
- `pnpm verify` green; gitleaks clean; migrations reproducible
- Verification report; user approval before next module
