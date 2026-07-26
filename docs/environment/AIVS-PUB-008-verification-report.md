# AIVS-PUB-008 Verification Report

**Result:** **PASS**
**Date:** 2026-07-26
**Branch:** `feature/aivs-pub-008-publishing`
**ADR:** `docs/architecture/ADR-AIVS-008-publishing-workflow.md`

## 1. Scope delivered

The final pipeline stage. Ready videos flow through a governed review to
mock platform publishing, with the security baseline §10 **two-step
child-media approval** enforced in code — the pipeline is now complete
end-to-end: upload/consent → script → generation → **publish**.

## 2. Definition of Done — evidence

| DoD item                                                            | Status | Evidence                                                                                                                                                        |
| ------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Non-minor: create → submit → admin approve → published + externalId | ✅     | Integration + e2e (UI flow with live worker, `mock-youtube-…` id visible); full audit trail asserted                                                            |
| Minor blocked without content review or valid consent               | ✅     | Final approval without prior rows → 409; guardian check fails closed on: no consent, non-active, `internal` scope, platform not listed, sub-reviewer role (403) |
| Full minor flow publishes with both human steps recorded            | ✅     | Three approval rows (`content_review`, `guardian_scope` with verified consent id in notes, `final_approval`) with approvers; then published                     |
| Consent revocation retracts                                         | ✅     | Published item → revoke + enforce → `retracted`, assetId nulled, `publication.retracted` audited                                                                |
| Provider failure → failed, resubmittable                            | ✅     | `[force-failure]` caption hook → `failed`; resubmit clears approvals → re-approve → published                                                                   |
| Non-video / non-ready assets rejected                               | ✅     | 409 at creation                                                                                                                                                 |
| All audited; verify green; gitleaks clean; migrations reproducible  | ✅     | 7 `publication.*` audit types asserted; `pnpm verify` exit 0; "no leaks found"; reset → 6 migrations → seed                                                     |

Test totals: **63 unit**, **44 integration** (9 new publishing), **10 e2e**
(1 new publish flow; full suite 33 s).

## 3. What shipped

- **Schema:** `Publication` (ready-video only, platform enum, status
  `draft→in_review→approved→published|failed`, reject→draft, `retracted`
  terminal, SetNull asset link) + unique-per-kind `PublicationApproval`
  rows.
- **Approval matrix (§10):** non-minor = `final_approval` (admin+);
  child media = `content_review` (reviewer+) whose same action runs the
  **guardian-scope check** (consent active + `scope=publishing` + target
  platform listed → `guardian_scope` row records the verified consent id)
  - `final_approval` (admin+, blocked until the other rows exist).
    Completion auto-approves and enqueues publishing.
- **Execution:** new `publishing` queue; `MockPublishingProvider`
  (deterministic ids, `[force-failure]` hook); idempotent processor;
  worker consumes with final-attempt failure bookkeeping.
- **Consent interplay:** `enforceConsent` retracts affected publications
  before deleting assets (real-platform takedown flagged for the
  real-provider module).
- **API/UI:** create/list (child-media rows hidden below reviewer),
  single actions route with per-action role floors; `/publications` page
  with approvals progress `n/m`, role-appropriate buttons, external id.
- **Fix:** Better Auth rate limiting gated to `NODE_ENV=production` —
  e2e suites exceed 5 sign-ins/min locally; production keeps the limit.

## 4. Notes / limits

- Mock publishing marks state only; retraction of real platform posts and
  real OAuth flows arrive with individually-approved provider modules.
- Reject requires reviewer+; a plain editor cannot veto (matches "review
  is a governance act"). Revisit if a lighter withdraw-own-draft is wanted.
- Production deploy rides the standard merge (Vercel) + Railway rebuild;
  verify `/publications` after deploy.

## 5. Risks / follow-ups

| Risk                                                             | Severity  | Mitigation                                                  |
| ---------------------------------------------------------------- | --------- | ----------------------------------------------------------- |
| Real platform integrations (OAuth, quotas, takedowns)            | Future    | Per-platform user-approved modules behind the same contract |
| Approval UI shows all buttons to all roles (server rejects)      | Cosmetic  | Role-aware button hiding in a UI polish module              |
| Carry-overs (malware stub, guardian verification, email console) | unchanged | Pre-external-users work                                     |

## 6. Next-module recommendation

Pipeline is functionally complete on mocks. Natural next steps, all
requiring explicit approval:

1. **Real provider enablement track** — one provider at a time (LLM
   script, TTS voice, video gen, platform publishing), each with cost
   controls and a child-safety review gate.
2. **UX/design module** — the promised real UI pass (frontend-design
   skill's "design module" decision).
3. **Hardening module** — ClamAV adapter, monitoring/alerting, email
   (Resend) enablement.

**Do not start the next module without explicit user approval.**
