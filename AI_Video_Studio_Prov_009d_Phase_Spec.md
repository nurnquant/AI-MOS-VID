# AIVS-PROV-009 Phase D Spec — Real Platform Publishing

**Status:** Draft for approval; no code until approved
**Date:** 2026-07-27
**Parent:** `AI_Video_Studio_Prov_009_Master_Prompt.md` (Phase D)

## 1. Recommendation: YouTube first, everything else deferred

| Platform     | Verdict           | Why                                                                                                                                                                                                     |
| ------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **YouTube**  | **Phase D scope** | Official Data API v3; free (quota-based, ~6 uploads/day at default quota); OAuth for your own channel; explicit "made for kids" designation exists — the cleanest compliant path for children's content |
| Meta (FB/IG) | Deferred          | Requires business verification + app review (weeks); Reels API restrictions                                                                                                                             |
| TikTok       | Deferred          | Restrictive API access program; unclear minors-content posture for API uploads                                                                                                                          |
| WhatsApp     | Deferred          | No public video-publishing API fit                                                                                                                                                                      |

## 2. Compliance requirements (children's content on YouTube)

These are hard requirements baked into the adapter, not options:

1. **`madeForKids: true` on every upload** (default; env-overridable
   only to `true`-equivalent per-tenant later). This is the
   COPPA-driven YouTube self-designation for child-directed content.
   YouTube then disables comments/personalized ads on those videos —
   aligned with our baseline.
2. **Privacy default `unlisted`** (`YOUTUBE_PRIVACY_STATUS`) — first
   uploads reviewable on the channel before anything is public.
   Flipping to `public` is an explicit operator choice.
3. **Baseline §10 unchanged:** the upload only ever runs from the
   worker publish job, which only exists after content review +
   guardian-scope check + final approval. No new path to publish.
4. **Real takedown (PUB-008 carry-over closes):** consent
   revocation/expiry enforcement calls `videos.delete` for published
   YouTube publications (best-effort, audited
   `publication.takedown` / `publication.takedown_failed`) before the
   media hard-delete proceeds. Retraction is no longer marker-only.
5. **Channel ownership:** uploads go to YOUR channel via OAuth consent
   you grant once. AIVS never handles YouTube passwords.

## 3. Design

- **`YouTubePublishingProvider`** behind the existing
  `PublishingProvider` contract, registered as
  `PUBLISH_PROVIDER=youtube` (mock stays default; fail-loud without
  credentials). Handles `platform === "youtube"` only — other
  platforms error clearly ("platform not enabled").
- **Media hand-off:** `PublishRequest` gains optional `getMedia()`
  accessor supplied by the workflow (streams the ready asset from
  storage) — provider-agnostic, mocks ignore it.
- **Auth:** OAuth 2.0 refresh-token flow. One-time local helper script
  walks you through browser consent and prints nothing but success —
  you place `YOUTUBE_REFRESH_TOKEN` (plus existing
  `YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET`) into env stores
  yourself, same rules as every phase.
- **Ledger:** rows with `provider: youtube`, `operation:
publish.upload`, `units: 1 calls`, `estimatedCostUsd: 0` (API is
  quota-based, not billed) — audit trail intact; budget caps not
  load-bearing here because the human approval matrix is the gate.
- **Quota:** `videos.insert` costs 1600 of the 10k default daily
  units → ~6 uploads/day. Acceptable; failures surface as job errors.

## 4. User actions (after approval, before smoke)

1. Google Cloud Console: create OAuth client (Desktop type), enable
   YouTube Data API v3 → `YOUTUBE_CLIENT_ID` + `YOUTUBE_CLIENT_SECRET`
   into local `.env`.
2. Run the one-time consent helper (I provide it) with your channel's
   Google account → put the printed `YOUTUBE_REFRESH_TOKEN` into
   `.env` (+ Railway worker vars for production later).
3. Smoke plan: publish ONE already-approved video as `unlisted` to
   your channel, verify it appears + `madeForKids` set + ledger row,
   test takedown, then decide production flip.

## 5. Out of scope

Meta/TikTok/WhatsApp adapters; scheduling; analytics; monetization;
public-by-default posting; any weakening of the approval matrix.
