# AI Video Studio — Publishing Workflow Master Prompt

**Document ID:** AIVS-PUB-008
**Version:** 0.1 (DRAFT — pending user review)
**Status:** Draft for approval; do not execute until approved
**Project:** Riwaq Al Ilm Enterprise AI Video Production Studio
**Depends on:** Modules 001-007 (all PASS; production live)
**Primary Objective:** The last pipeline stage: ready videos → reviewed,
approved, and "published" through **mock** platform providers — with the
security baseline §10 **two-step child-media publishing approval**
(content reviewer + guardian-scope check) enforced in code. When real
platform APIs are approved later, only provider bindings change.

---

## 1. Claude Operating Role

Principal Software Architect, Backend Engineer, Security/Compliance
Engineer, Senior QA Automation Engineer. All prior non-negotiables remain,
plus:

1. Branch `feature/aivs-pub-008-publishing`.
2. **Mock publishing only.** `MockPublishingProvider` implements the
   existing `PublishingProvider` contract (deterministic publication ids,
   no network). Real Meta/YouTube/TikTok/WhatsApp integrations are later,
   individually user-approved modules.
3. **Baseline §10 is the core deliverable:** child media may reach
   `published` ONLY after (a) a content review approval by
   `child_media_reviewer`+, AND (b) a guardian-scope check verifying the
   linked consent record has `scope=publishing`, lists the target
   platform, and is active — both recorded as separate approval rows.
4. Consent revocation/expiry **retracts**: enforcement marks publications
   of deleted child media `retracted` (audited); real-platform takedown
   is flagged for the future real-provider module.
5. Every workflow action audited.

## 2. Scope

### In scope

- **Schema:** `Publication` (tenant-scoped; assetId → ready video asset,
  SetNull on delete; platform enum `facebook|instagram|tiktok|youtube|
whatsapp`; caption; status `draft → in_review → approved → published |
failed`, reject → draft, `retracted` terminal; externalId from the
  provider) + `PublicationApproval` rows (`content_review` |
  `guardian_scope`, approver, notes) — the two-step audit trail.
- **Status/approval rules:**
  - create/submit = `editor`+; only `ready` **video** assets publishable.
  - non-minor asset: one approval (`admin`+) → `approved`.
  - `featuresMinor` asset: `child_media_reviewer`+ content-review approval
    **and** guardian-scope check (validated against the consent record at
    approval time, recorded as its own approval row) **and** `admin`+
    final approval. Any missing piece blocks `approved`.
  - approval of a minor asset without a publishing-scope consent for that
    platform is rejected with a clear error.
- **Publish execution:** `publish-publication` job on a new `publishing`
  queue; worker calls `MockPublishingProvider`, stores `externalId`,
  status `published` (provider failure → `failed`, retryable via resubmit).
- **Consent interplay:** `enforceConsent` additionally marks affected
  publications `retracted` + audit `publication.retracted`.
- **Audit events:** `publication.created/submitted/approved/rejected/
published/failed/retracted` (+ approval detail rows).
- **API + UI:** `/publications` page — create form (ready video selector,
  platform, caption), review queue with role-appropriate approve/reject
  buttons, status badges incl. approvals progress (e.g. "1/3 approvals"),
  external id shown when published. Zod-validated routes.
- **Tests:** unit (approval-requirement derivation), integration (full
  non-minor flow; full minor flow incl. both approvals; blocked without
  publishing-scope consent; wrong-platform consent blocked; retraction on
  revoke; provider failure path), e2e (create → review → approve →
  published through the UI).

### Out of scope (later modules)

- Real platform APIs, OAuth to platforms, scheduled publishing
- Retraction calls to real platforms (flagged, mock marks only)
- Analytics/metrics, comment moderation
- Multi-asset campaigns

## 3. Execution Gates

- **Gate 0 — ADR-AIVS-008:** model, status machine, approval-matrix,
  queue topology. Stop unless implementation pre-authorized.
- **Gate 1 — Schema + migration.**
- **Gate 2 — Mock provider + approval-rules service.**
- **Gate 3 — Workflow services + publishing queue + worker.**
- **Gate 4 — API routes.**
- **Gate 5 — UI.**
- **Gate 6 — Validation** (suites + `pnpm verify` + evidence; production
  deploy of the module rides the normal merge → Vercel/Railway flow).
- **Gate 7 — Verification report.**

## 4. Definition of Done

- Non-minor ready video: create → submit → admin approve → mock-published
  with externalId (tested)
- Minor-featuring video CANNOT reach `approved` missing either the
  content-review approval or a valid publishing-scope consent covering
  the target platform (tested both ways)
- Full minor flow with both approvals publishes; both approval rows
  recorded with approvers (tested)
- Consent revocation retracts affected publications (tested)
- Provider failure → `failed`, resubmittable (tested)
- Non-video or non-ready assets rejected at creation (tested)
- All actions audited; `pnpm verify` green; gitleaks clean; migrations
  reproducible
- Verification report; user approval before next module
