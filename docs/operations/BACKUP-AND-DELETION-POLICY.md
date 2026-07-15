# AIVS Backup & Child-Media Deletion Policy (INFRA-007)

Security baseline §9 requires deletion of child media "including backups".
This document states what production services retain and how the
CONSENT-004 deletion guarantees extend to them. **User acceptance of this
policy is a gate for allowing any production child media.**

## What each service retains

| Service                | Data                                       | Backup behavior                                                                  | Retention lever                                 |
| ---------------------- | ------------------------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| Vercel Postgres (Neon) | metadata: assets, consents, audit, scripts | Point-in-time restore window (plan-dependent, free tier ≈ 24 h history)          | Window length is the exposure bound             |
| Cloudflare R2          | media objects                              | **No automatic backups/versioning** unless enabled — we do NOT enable versioning | Deletion is immediate and final                 |
| Railway Redis          | transient queue state                      | none persistent across restarts that matter here                                 | jobs reference IDs only, no media, no child PII |

## Policy

1. **R2 object versioning stays OFF.** CONSENT-004 hard-deletes are then
   immediately final for media objects — the strongest guarantee in the
   system, unchanged from local MinIO behavior.
2. **Postgres PITR window = deletion lag bound.** Deleted asset rows and
   consent PII can be resurrected only within the restore window
   (≈ 24 h free tier). Accepted stance: **consent-driven deletions become
   irreversible after the PITR window expires.** This satisfies "deleted
   from backups within 30 days" (baseline §9) with large margin.
3. **Restores are a governed operation.** If a PITR restore is ever
   performed, the operator MUST re-run the consent enforcement sweep
   immediately afterwards (`retention-sweep` runs hourly regardless), so
   any resurrected rows pointing at already-deleted R2 objects are
   re-tombstoned. Media objects themselves cannot resurrect (no R2
   versioning).
4. **Audit tombstones are the durable record** of deletion (PII-free);
   they are intentionally retained.
5. **Queue payloads carry IDs only** — never narration text about minors,
   subject labels, or guardian data.

## Residual risk (accepted)

- Within the PITR window (~24 h), DB metadata about a deleted child-media
  asset (subject label, guardian name on the consent row) is technically
  recoverable by an operator with dashboard access. Mitigation: dashboard
  access is limited to the owner; window is short; media itself is gone.
- Provider-side infrastructure snapshots (Neon internal ops) are outside
  our control; covered by provider DPAs.

**Accepted by:** NuR (project owner), 2026-07-15 — "policy accepted".
