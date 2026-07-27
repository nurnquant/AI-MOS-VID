# AI Video Studio — Production Hardening Master Prompt

**Document ID:** AIVS-HARDENING-011
**Version:** 0.1 (DRAFT — pending user review)
**Status:** Draft for approval; do not execute until approved
**Project:** Riwaq Al Ilm Enterprise AI Video Production Studio
**Depends on:** Modules 001-010 + PROV-009 (all PASS; real providers live)
**Primary Objective:** Close the four production risk gaps from
`docs/ROADMAP.md` §1: observable failures (monitoring/alerting),
trusted uploads (malware scanning), real email (invitations), and a
first real step of guardian verification — without weakening any
existing safety control.

---

## 1. Scope — four workstreams

### A. Monitoring & alerting (observability first)

- **Worker heartbeat:** worker writes a heartbeat (Redis key, 30 s
  interval). `/api/services` gains a `worker` check (heartbeat fresher
  than 2 min). One URL then covers web + Postgres + Redis + storage +
  **worker** — a stalled Railway worker (credit exhaustion!) finally
  becomes visible.
- **Alerting = external uptime pinger on that URL** (user account:
  UptimeRobot or BetterStack free tier — pings `/api/services`, emails
  on 503/timeout). No paid service calls from code; runbook documents
  the 5-minute setup (user clicks).
- Optional: `/api/services` also reports queue depths (waiting/failed
  counts) for at-a-glance debugging.

### B. Malware scanning (ClamAV)

- `ScanProvider` contract + `clamscan` CLI adapter behind
  `SCAN_PROVIDER=off|clamav` (default `off` = current always-pass,
  now **explicit and logged** instead of silent).
- Wired into asset validation (worker side) BEFORE promotion from
  quarantine; infected → `rejected` with reason `malware_detected`,
  audited.
- Local infra: `clamav` container added to docker-compose; validation
  integration test with the EICAR test string.
- Production: enabling means adding ClamAV to the Railway worker image
  (~300 MB + RAM for the signature DB). Shipped behind the flag with a
  runbook section; the **production flip is a separate user decision**
  (Railway resource/cost).

### C. Real email (Resend)

- `EMAIL_PROVIDER=console|resend` behind the existing email seam
  (`packages/auth/email.ts`, currently console-only). Resend REST
  adapter (simple fetch, no SDK dep).
- Sends: workspace invitation emails (link that currently only prints
  to server logs). Ledger-style audit `email.sent` (recipient +
  template, never bodies).
- User actions: Resend account, verified sending domain (or
  `onboarding@resend.dev` for testing), `RESEND_API_KEY` +
  `RESEND_FROM_EMAIL` into env stores.

### D. Guardian verification — first real step

- Guardian **email confirmation** on consent records: recording a
  consent with a guardian email sends a confirmation link (via C);
  clicking sets `guardianConfirmedAt`. UI shows confirmed/unconfirmed
  badge on the consent registry.
- **Non-breaking:** `ENFORCE_GUARDIAN_CONFIRMATION=false` default —
  the §10 guardian-scope check gains the requirement only when the
  flag is on (flip = later user decision once real guardians exist).
  Full identity verification (documents) stays out of scope.

## 2. Out of scope

Paid monitoring SaaS integrations in code; SMS/WhatsApp notifications;
document-based identity verification; log aggregation platforms;
Meta/TikTok/Pinterest publishing.

## 3. Execution gates

- **Gate 0 — ADR-AIVS-011** (heartbeat design, scan pipeline position,
  email seam, guardian-confirmation model + flag semantics).
- **Gate 1 — A: heartbeat + services route + queue depths.**
- **Gate 2 — B: scan contract + adapter + local ClamAV + validation wiring.**
- **Gate 3 — C: Resend adapter + invitation emails.**
- **Gate 4 — D: guardian confirmation flow + UI badge.**
- **Gate 5 — validation:** all suites + verify + gitleaks; EICAR test.
- **Gate 6 — report → merge ff → push;** runbook updates (pinger
  setup, ClamAV prod decision, Resend setup, flag semantics).

## 4. Definition of Done

- Stalled worker visible: kill worker locally → `/api/services` 503
  with `worker:false` within 2 min (tested)
- `SCAN_PROVIDER=clamav` locally rejects EICAR upload as
  `malware_detected`, audited; `off` logs the skip (tested)
- Invitation email delivered via Resend in a live smoke (user watches
  inbox); console provider remains test default
- Consent with guardian email → confirmation link → confirmed badge
  (tested); enforcement flag off by default, on-behavior tested
- No existing safety control weakened; e2e suite green; `pnpm verify`
  green; gitleaks clean
- Runbook + verification report; user actions listed per workstream

## 5. User actions (after approval, staged per gate)

1. Uptime pinger account + monitor on `/api/services` (guided, free).
2. Resend account + `RESEND_API_KEY`/`RESEND_FROM_EMAIL` in env stores.
3. Decisions: ClamAV production flip (worker image size), guardian
   enforcement flip — both later, both reversible.
