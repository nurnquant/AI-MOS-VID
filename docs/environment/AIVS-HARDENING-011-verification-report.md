# AIVS-HARDENING-011 Verification Report

**Result:** **PASS**
**Date:** 2026-07-27
**Branch:** `feature/aivs-hardening-011`
**ADR:** `docs/architecture/ADR-AIVS-011-production-hardening.md`

## 1. Scope delivered

| Workstream               | Shipped                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Monitoring            | Worker Redis heartbeat (30 s); `/api/services` gains `worker` check (stale > 120 s = down → HTTP 503) + per-queue waiting/failed depths. One URL covers web/DB/Redis/storage/worker; runbook documents the free uptime-pinger setup (user action).                                                                                                                                       |
| B. Malware scanning      | `ClamdScanner` (clamd INSTREAM over TCP, zero deps) behind `SCAN_PROVIDER=off\|clamav`; `off` is now logged loudly, never silent. Local `clamav` compose service (profile `scan`). Scan errors fail closed. Production flip documented as a separate decision.                                                                                                                           |
| C. Email                 | `resolveEmailSender()` behind `EMAIL_PROVIDER=console\|resend`; Resend REST adapter (fail-loud without key); invitation route uses the resolver; stub deleted.                                                                                                                                                                                                                           |
| D. Guardian confirmation | `guardianConfirmationToken` (single-use, unique) + `guardianConfirmedAt` on ConsentRecord (migration applied locally + Neon, 10 total); email-contact consents send a confirmation link; public tokenized `GET /api/consents/confirm`; confirmed/unconfirmed badge in the registry; `ENFORCE_GUARDIAN_CONFIRMATION` flag (default off) strengthens the §10 guardian-scope check when on. |

## 2. Definition of Done — evidence

| DoD item                           | Status | Evidence                                                                                                                                                                                                             |
| ---------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stalled worker visible             | ✅     | Live smoke: worker started → heartbeat key 19 s old (ALIVE); worker killed → key ages past the 120 s freshness window → `worker:false` → 503 (route logic)                                                           |
| ClamAV rejects EICAR; `off` logged | ✅     | Live: ClamAV container healthy → `ClamdScanner` passed a clean file and flagged EICAR `FOUND`; injected-dirty-scanner pipeline test → asset `rejected/malware`; `off` logs "uploads are NOT scanned"                 |
| Invitation email via Resend        | ⏳     | Adapter shipped + fail-loud tested; **live inbox smoke pending user's Resend key** (console remains default; nothing regressed)                                                                                      |
| Guardian confirmation flow         | ✅     | Integration: email link captured → token confirms once → second use 404 → audits `guardian_confirmation_sent`/`guardian_confirmed`; non-email contact → no token; email failure keeps record + audits `email.failed` |
| Enforcement flag                   | ✅     | Integration: flag on + unconfirmed → contentApprove 409 "confirmation is pending"; confirm → both approval rows written; default off unchanged                                                                       |
| Nothing weakened; suites green     | ✅     | 107 unit / **59 integration** (7 new) / 10 e2e unmodified; `pnpm verify` exit 0; gitleaks "no leaks found"                                                                                                           |

## 3. User actions (from the runbook)

1. **Uptime pinger** (5 min, free): monitor
   `https://aivs-studio-web.vercel.app/api/services`, alert on non-200.
2. **Resend** (when wanted): key + from-address + `EMAIL_PROVIDER=resend`
   in Vercel env → live email smoke.
3. **Decisions for later:** ClamAV production flip (Railway service +
   2 env vars); `ENFORCE_GUARDIAN_CONFIRMATION=true` once guardians
   actually confirm.

## 4. Next

Roadmap items remaining: PROJECTS-012, provider polish, loose ends
(Railway branch → main, prod video re-verify, credential rotation).
