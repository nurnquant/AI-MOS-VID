# AIVS Roadmap — agreed backlog (2026-07-27)

State when written: modules 001-010 PASS; PROV-009 track complete —
all four provider slots (Claude scripts / ElevenLabs voice / fal-Kling
video / YouTube publishing) run real in production; UX-010 design
system live. Governance unchanged: no module starts without explicit
user approval (draft master prompt → approval → gates → report →
merge).

## 1. HARDENING-011 (recommended next)

Production now handles real money + child media, but:

- **No monitoring/alerting** — worker stalls silently (Railway credit
  exhaustion = invisible failure). `/api/services` is now a real
  health probe (probes Neon/Redis/R2) — wire an uptime pinger +
  alerts to it.
- **Malware scanner always-pass** — ClamAV adapter so uploads are
  truly scanned before trust.
- **Email console-only** — invites/notifications need Resend
  enablement (`RESEND_API_KEY` placeholder exists).
- **Guardian identity verification still stubbed.**

One module, closes the biggest risk gaps.

## 2. PROJECTS-012

Nav still says "Projects (soon)". Real project CRUD; organize
scripts/assets/publications per project. Small, visible feature
module.

## 3. Provider polish

- Provider usage/budget dashboard page (ProviderUsage ledger visible
  in UI, spend per day/month vs caps).
- Azure Speech Arabic voice bake-off (vs ElevenLabs premade; plan
  upgrade would unlock the "Arabic Coach" library voice).
- Video model quality experiments (Veo vs Kling via `FAL_VIDEO_MODEL`).

## 4. Loose ends — no module needed (~30 min, mostly owner clicks)

- [ ] Railway service → track `main` (kills the force-push workaround;
      recommended regardless — caused the one prod deploy race).
- [ ] Prod video generation re-verify (~$4, one full 4-scene run on
      the fixed worker image).
- [ ] Rotate Neon password + Railway Redis URL (chat-exposed during
      INFRA-007 setup; low urgency). After rotation: update Vercel +
      Railway env vars, rerun migrations with the new non-pooled URL.
