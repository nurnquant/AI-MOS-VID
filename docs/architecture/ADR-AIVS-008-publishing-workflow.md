# ADR-AIVS-008 — Publishing Workflow and Child-Media Approval Matrix

**Status:** Accepted (user approved the PUB-008 master prompt and
authorized implementation on 2026-07-26)
**Date:** 2026-07-26
**Deciders:** User + Claude Code
**Related:** ADR-AIVS-002..007, `docs/security/AIVS-media-security-baseline.md` §10,
`AI_Video_Studio_Pub_008_Master_Prompt.md`

## Context

Pipeline stages exist through generation; publishing is the last gap.
Baseline §10 mandates a two-step human approval for child media before it
reaches any platform. Platform APIs stay mocked (existing
`PublishingProvider` contract).

## Decision

### 1. Model

- `Publication`: tenant-scoped; `assetId` → **ready video** asset
  (`SetNull` so consent hard-deletes never break rows); `platform` enum
  matching the provider contract (`facebook|instagram|tiktok|youtube|
whatsapp`); `caption`; `status`; `externalId` (provider result);
  `error`; `createdBy`.
- `PublicationApproval`: one row per approval kind per publication
  (`@@unique([publicationId, kind])`), `approvedBy`, optional notes.
  Kinds: `content_review`, `guardian_scope`, `final_approval`.

### 2. Status machine

```
draft → in_review → approved → published
  ↑         │           │
  └─(reject)┘           └→ failed → (resubmit → in_review)
retracted ← consent enforcement (from in_review/approved/published)
```

- Reject clears approval rows (changed content restarts review).
- Resubmit (from `failed` or `draft`) also clears approvals.
- `retracted` is terminal, written by consent enforcement **before** the
  asset row is deleted; real-platform takedown is a flagged TODO for the
  real-provider module.

### 3. Approval matrix (baseline §10 in code)

| Asset                 | Required approval rows                                 | Who                                  |
| --------------------- | ------------------------------------------------------ | ------------------------------------ |
| non-minor video       | `final_approval`                                       | `admin`+                             |
| `featuresMinor` video | `content_review` + `guardian_scope` + `final_approval` | reviewer+, system-verified, `admin`+ |

- **Content review:** `child_media_reviewer`+ action. The same action
  runs the **guardian-scope check**: the asset's consent record must be
  active, `scope=publishing`, and list the target platform. Pass →
  both `content_review` and `guardian_scope` rows are written (approver =
  the reviewer; the guardian row records the verified consent id). Fail →
  409 with the precise reason, no rows.
- **Final approval:** `admin`+; for minor assets it requires the other
  two rows to exist first (409 otherwise).
- When the required set completes, status flips to `approved` and the
  publish job is enqueued automatically.

### 4. Execution

- New `publishing` queue, job `publish-publication` (deterministic id
  `publish-publication__{publicationId}__{epoch-by-resubmit-count}` — no
  colons per BullMQ rule). Worker calls `MockPublishingProvider`
  (deterministic external ids from platform+asset, zero network; captions
  containing `[force-failure]` fail — deliberate test hook). Success →
  `published` + externalId; failure → `failed` + error. Idempotent:
  published rows skip.
- Services live in new `packages/publishing` (deps: database, auth,
  providers, queue). Consent retraction lives in the existing
  `enforceConsent` (assets package) as a direct prisma update — no
  package cycle.

### 5. RBAC + API + UI

| Route                            | Method                 | Role                                                                                                    |
| -------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `/api/publications`              | GET                    | viewer+ (publications of `featuresMinor` assets hidden below reviewer — same visibility rule as assets) |
| `/api/publications`              | POST                   | editor+                                                                                                 |
| `/api/publications/{id}/actions` | POST `submit`          | editor+                                                                                                 |
| `/api/publications/{id}/actions` | POST `content_approve` | child_media_reviewer+                                                                                   |
| `/api/publications/{id}/actions` | POST `final_approve`   | admin+                                                                                                  |
| `/api/publications/{id}/actions` | POST `reject`          | child_media_reviewer+                                                                                   |

UI: `/publications` — create form (ready-video selector, platform,
caption), list with status badges, approvals progress (`n/m`), action
buttons per status, externalId when published, retraction visible.

## Alternatives considered

| Area           | Alternative                                     | Why rejected                                                                                                                   |
| -------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Guardian check | Separate manual second click                    | The check is mechanical (consent fields); a second manual step adds ceremony, not safety — the row still records it distinctly |
| Approvals      | JSON column on Publication                      | Separate rows give per-approval audit (who/when/notes) + uniqueness                                                            |
| Retraction     | Publishing service subscribed to consent events | Direct update inside enforcement is atomic with deletion; no event bus exists                                                  |
| Package        | Extend packages/content                         | Publishing is compliance-heavy and platform-facing; distinct domain                                                            |

## Security implications

- Child media cannot be published without an active publishing-scope
  consent covering the exact platform — enforced at approval time, not
  just creation time.
- Consent revocation retracts publications in the same enforcement pass
  that deletes media; audit rows carry no child PII.
- Mock provider: no network, no keys; gitleaks stays clean.
