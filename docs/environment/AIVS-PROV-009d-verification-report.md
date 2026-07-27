# AIVS-PROV-009 Phase D Verification Report

**Result:** **PASS (code complete; live smoke pending user OAuth credentials)**
**Date:** 2026-07-27
**Branch:** `feature/aivs-prov-009d-youtube`
**Spec:** `AI_Video_Studio_Prov_009d_Phase_Spec.md` (user-approved: YouTube now; Meta/Instagram/Pinterest/TikTok placeholders)

## 1. Scope delivered

1. **`YouTubePublishingProvider`** behind `PublishingProvider`
   (`PUBLISH_PROVIDER=youtube`; mock stays default; fail-loud when any
   of client id / secret / refresh token missing). OAuth2
   refresh-token flow; resumable upload (init + PUT); title from
   caption first line; category Education. **Compliance hard-coded:**
   `selfDeclaredMadeForKids: true` on every upload; privacy defaults
   `unlisted` (`YOUTUBE_PRIVACY_STATUS`). Only reachable through the
   worker publish job — i.e. after the full §10 approval matrix.
2. **Contract:** `PublishRequest` gains `getMedia()` accessor
   (workflow streams the ready asset from storage) + `tenantId`;
   `PublishingProvider.retract?` optional real takedown.
3. **Real takedown (PUB-008 carry-over closed):** consent enforcement
   calls `videos.delete` (best-effort, audited
   `publication.takedown` / `publication.takedown_failed`) for
   published YouTube items before the media hard-delete; 404 treated
   as already-gone.
4. **Ledger:** `provider: youtube, operation: publish.upload, units: 1
calls, $0` (quota-based API) with the video id as jobId.
5. **OAuth helper:** `scripts/youtube-oauth.mjs` — loopback consent
   flow, prints the refresh token once to the local terminal only.

## 2. Evidence

| Item                                          | Status | Evidence                                                                                                                                                                |
| --------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| madeForKids + unlisted on every upload        | ✅     | Unit: init request body asserted `{privacyStatus: "unlisted", selfDeclaredMadeForKids: true}`                                                                           |
| Non-YouTube platforms rejected clearly        | ✅     | Unit: instagram → "not enabled — only youtube… placeholders"                                                                                                            |
| Fail-loud on missing credentials              | ✅     | Unit: factory resolution throws naming the missing vars                                                                                                                 |
| Upload error paths surfaced, nothing recorded | ✅     | Unit: 403 init → error with status; media/tenantId guards                                                                                                               |
| Retract: delete, 404-tolerant, error surfaced | ✅     | Unit: 204 ok, 404 ok, 403 throws                                                                                                                                        |
| Enforcement takedown wiring                   | ✅     | Integration: published youtube item + retract-capable fake → retract(externalId) called, `publication.takedown` + `publication.retracted` audited, hard-delete proceeds |
| Mock default; suites offline                  | ✅     | 107 unit / 52 integration / 10 e2e green; `pnpm verify` exit 0; gitleaks "no leaks found"                                                                               |

## 3. Enablement (user actions)

1. Google Cloud Console: project → enable **YouTube Data API v3** →
   OAuth client type **Desktop app** → `YOUTUBE_CLIENT_ID` +
   `YOUTUBE_CLIENT_SECRET` into local `.env`.
2. `node --env-file=.env scripts/youtube-oauth.mjs` — browser consent
   with the channel's Google account → put the printed
   `YOUTUBE_REFRESH_TOKEN` into `.env`.
3. Smoke (local first): `PUBLISH_PROVIDER=youtube` — publish ONE
   approved video (unlisted) to the channel, verify madeForKids +
   ledger; test takedown; then production flip (Railway worker vars +
   Vercel? No — publish runs in the worker only).
4. Quota note: ~6 uploads/day at the default 10k daily quota.

## 4. Next

Live smoke on credentials. Afterwards the paid-provider track is
complete end-to-end (script/voice/video/publishing all real-capable);
next module: UX/design (user-ordered).
