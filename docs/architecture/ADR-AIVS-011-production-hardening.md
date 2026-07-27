# ADR-AIVS-011 — Production Hardening: Observability, Scanning, Email, Guardian Confirmation

**Status:** Accepted (user approved the HARDENING-011 master prompt 2026-07-27)
**Date:** 2026-07-27
**Deciders:** User + Claude Code
**Related:** ADR-AIVS-002 (validation pipeline), ADR-AIVS-003 (email
boundary), ADR-AIVS-004 (consent), `AI_Video_Studio_Hardening_011_Master_Prompt.md`

## Decision

### A. Observability

- **Worker heartbeat:** the worker writes `aivs:worker:heartbeat`
  (epoch ms) to Redis every 30 s using its existing queue connection.
- **`/api/services`** adds `worker: heartbeat fresher than 120 s` to
  the existing real-dependency probes, plus per-queue
  `waiting/failed` counts under `queues` (informational, not part of
  up/down). One URL now covers web, Postgres, Redis, storage, worker.
- **Alerting is an external uptime pinger on that URL** (user's free
  account, runbook-guided). No alerting code paths in the app.

### B. Malware scanning

- `ClamdScanner implements MalwareScanner` (existing ADR-AIVS-002
  boundary — validation already rejects on `clean:false`): speaks the
  clamd **INSTREAM** protocol over TCP (`CLAMAV_HOST`/`CLAMAV_PORT`,
  default `127.0.0.1:3310`). No new dependencies.
- Selection: `SCAN_PROVIDER=off|clamav` in `createAssetServices`.
  `off` (default) keeps the always-pass scanner but the skip is now
  logged once at startup — explicit, never silent.
- Local: `clamav/clamav` compose service under profile `scan`
  (signature DB is heavy; not part of default `pnpm infra:up`).
  Integration test uploads the EICAR string → `rejected/malware`;
  the test skips itself when clamd is unreachable so default suites
  stay green.
- Production: flip = adding a ClamAV container/service next to the
  Railway worker + two env vars — documented in the runbook as a
  separate user decision (memory/cost).

### C. Email

- `resolveEmailSender()` behind `EMAIL_PROVIDER=console|resend`
  (console default; unknown → console, same fail-safe pattern as
  provider slots). `ResendEmailSender` = one `fetch` to
  `api.resend.com/emails` with `RESEND_API_KEY`, from
  `RESEND_FROM_EMAIL`; fail-loud at resolution when selected without
  key. Audit `email.sent` (recipient + subject, never bodies).
- Members route swaps its hardcoded `ConsoleEmailSender` for the
  resolver. The Resend stub class is deleted.

### D. Guardian confirmation

- Schema: `ConsentRecord.guardianConfirmationToken String? @unique`,
  `guardianConfirmedAt DateTime?`.
- Creating a consent whose `guardianContact` is an email generates a
  token and emails a confirmation link (via C). Public
  `GET /api/consents/confirm?token=…` — **unauthenticated by design**
  (guardians are not app users; the token is the credential; single
  use — cleared on confirmation) — sets `guardianConfirmedAt`, audits
  `consent.guardian_confirmed`.
- UI: confirmed/unconfirmed badge in the consent registry.
- Enforcement: `ENFORCE_GUARDIAN_CONFIRMATION` (default false). When
  true, the §10 guardian-scope check additionally requires
  `guardianConfirmedAt` — strengthening only, flag-gated, flip is a
  later user decision.

## Alternatives considered

| Area               | Alternative                    | Why rejected                                                                                                    |
| ------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Heartbeat          | DB row                         | Redis is the worker's native connection; no schema churn for a liveness bit                                     |
| Scanning           | clamscan CLI in worker image   | Couples scanning memory to the worker (OOM history); clamd service isolates it and works identically local/prod |
| Alerting           | In-app email alerts            | Needs a scheduler + dedup + escalation — an uptime pinger does it better for free                               |
| Guardian           | Document identity verification | Out of scope per master prompt; email confirmation is the honest first increment                                |
| Confirm route auth | Require login                  | Guardians are not users; tokenized public link is the standard pattern (single-use, unguessable)                |

## Security implications

- Confirmation tokens: 32-byte random, single-use, no PII in the URL
  beyond the token; confirmation page reveals only subjectLabel.
- Scanning failures fail CLOSED (scan error → validation error →
  asset stays quarantined/rejected), never silently pass.
- Email audit stores no message bodies; guardian emails only in the
  existing `guardianContact` field (minimal-PII rule unchanged).
- `off` scan mode is logged so production posture is always explicit.
