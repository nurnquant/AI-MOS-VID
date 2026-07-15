# ADR-AIVS-004 — Child-Media Consent Lifecycle and Enforcement

**Status:** Accepted (user approved the CONSENT-004 master prompt — including
hard-delete-on-revocation semantics — on 2026-07-15)
**Date:** 2026-07-15
**Deciders:** User + Claude Code
**Related:** ADR-AIVS-002/-003, `docs/security/AIVS-media-security-baseline.md` §9-§10,
`AI_Video_Studio_Consent_004_Master_Prompt.md`

## Context

FOUNDATION-002 shipped the consent _gate_ (featuresMinor without valid
consent stays quarantined); AUTH-003 shipped roles and audit. Missing: the
lifecycle around the gate — capture, attach, revoke, expire — and the
baseline §9 retention guarantees (hard deletion on revocation/expiry,
30-day raw-upload retention).

## Decision

### 1. Consent state model — derived, not stored

`ConsentRecord` status is computed, never persisted as a column:

```
revokedAt != null                → revoked
expiresAt <= now                 → expired
otherwise                        → active
```

Schema additions (one migration): `guardianContact String?`,
`documentRef String?` (path/URL string only), `revokedBy String?`,
`revokeReason String?`, `enforcedAt DateTime?` (set once deletion
enforcement has completed — the sweep's idempotency marker).

### 2. Lifecycle services (in `@aivs/assets`, `src/consent.ts`)

Consent operations live beside asset services (they orchestrate prisma +
storage + queues and reuse the audit writer from `@aivs/auth`):

- `getConsentStatus(record, now)` — pure derivation.
- `createConsent` — reviewer+, audited `consent.created`.
- `attachConsent` — validates same-tenant + `active`; sets
  `asset.consentRecordId`; audited `consent.attached`; if the asset is
  `rejected/consent-missing` with its quarantine object retained, it
  auto-re-enqueues validation → asset becomes `ready` without re-upload.
- `revokeConsent` — sets revokedAt/By/Reason, audits `consent.revoked`,
  enqueues enforcement immediately.
- `listConsents` — derived status + linked-asset count.

RBAC: **all** consent reads and writes require `child_media_reviewer`+
(deny-by-default below; editors can still upload featuresMinor assets —
they simply land in quarantine until a reviewer attaches consent).

### 3. Enforcement — hard delete, audit tombstone

New queue `consent-enforcement` with two jobs:

- `enforce-consent { consentId, tenantId, trigger: revoked|expired }` —
  for every linked `featuresMinor` asset: delete ALL storage objects
  (storageKey, retained quarantineKey, every version key), then delete the
  asset row (cascades versions/transitions), then write an audit tombstone
  `asset.child_media.deleted` whose detail carries only
  `{ assetId, versionCount, trigger }` — **no subject/guardian PII**.
  Finishes by setting `enforcedAt`. Idempotent: re-delivery finds no linked
  assets and only stamps `enforcedAt`.
- `retention-sweep {}` — repeatable (hourly locally):
  1. expired, unrevoked, un-enforced consents → audit
     `consent.expired_swept` + run enforcement;
  2. baseline §9 raw-upload retention: `rejected/consent-missing` assets
     whose quarantine object is older than 30 days → delete the object,
     null the key, keep the rejected row as audit trail; tombstone with
     `scope: "quarantine-retention"`.

The sweep takes `now` as a parameter (injected in tests; wall clock in the
worker). The worker registers the repeatable job on startup with a
deterministic job id.

Deletion order (object-first, then rows) means a crash mid-job leaves
DB rows pointing at deleted objects — the retry (3 attempts) re-runs and
converges; the reverse order could leak orphaned child media, which is the
worse failure.

### 4. API + UI

| Route                       | Method | Role      | Purpose                      |
| --------------------------- | ------ | --------- | ---------------------------- |
| `/api/consents`             | GET    | reviewer+ | registry with derived status |
| `/api/consents`             | POST   | reviewer+ | create                       |
| `/api/consents/{id}/revoke` | POST   | reviewer+ | revoke (reason required)     |
| `/api/assets/{id}/consent`  | POST   | reviewer+ | attach (+auto revalidate)    |

UI: `/consents` registry page (list, create form, revoke with
confirmation + reason); upload form gains a featuresMinor checkbox with a
consent selector (visible only when the consent list loads, i.e.
reviewer+); assets table flags minor-featuring rows.

## Alternatives considered

| Area          | Alternative                              | Why rejected                                                           |
| ------------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| Deletion      | Soft-delete + 30-day purge window        | Baseline §9 mandates hard delete on revocation/expiry; user confirmed  |
| Status        | Persisted status column                  | Derivation can't drift; expiry needs no writer to become true          |
| Enforcement   | Synchronous delete in the revoke request | Deletion fan-out belongs on the queue (retry/backoff, audit per asset) |
| Sweep         | OS cron / external scheduler             | BullMQ repeatable keeps it inside existing worker + infra              |
| Services home | New `packages/consent`                   | Thin layer over asset services; a 13th package adds no boundary value  |

## Consequences

- Revocation is irreversible by design — the UI requires explicit
  confirmation and a reason; the reason lands in the audit log.
- Tombstones let us prove deletion happened without retaining child PII.
- Publishing module later gets `scope=publishing` consents + platforms[]
  already modeled.

## Security implications

- Deny-by-default consent visibility below child_media_reviewer.
- Deletion covers original, quarantine and all derived versions; verified
  against MinIO in integration tests.
- Backup rotation is out of scope — documented operational note: local dev
  has no backups; production backup deletion policy must be defined before
  production child media exists.
