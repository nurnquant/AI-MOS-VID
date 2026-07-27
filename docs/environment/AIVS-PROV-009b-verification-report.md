# AIVS-PROV-009 Phase B Verification Report

**Result:** **PASS (live-smoked 2026-07-27, $0.0600)**
**Date:** 2026-07-27
**Branch:** `feature/aivs-prov-009b-elevenlabs-voice`
**Provider:** ElevenLabs TTS (`eleven_multilingual_v2` — covers Arabic + English)

## 1. Scope delivered

Real narration voice for generated videos. Two parts:

1. **`ElevenLabsVoiceProvider`** behind the `VoiceProvider` contract —
   REST text-to-speech, budget-gated (fail closed), spend ledger in
   characters, audio written locally and returned as `file://` (the
   orchestrator URL seam is untouched).
2. **Pipeline wiring (narration-first):** `processGenerateScene` now
   synthesizes the scene narration _first_, measures the real audio
   length (ffprobe), requests the video sized to it, and muxes the
   narration over the clip's video track (`replaceAudioTrack`: explicit
   stream maps + `apad` + `-shortest` — the video track defines clip
   duration; narration is padded with silence or trimmed). The voiced
   clip then goes through the normal quarantine → validation → ready
   pipeline unchanged. Previously the voice slot was dormant (tone audio
   baked inside the video synth).

## 2. Evidence

| Item                                                        | Status | Evidence                                                                                                          |
| ----------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| Budget preflight before any network; fail closed            | ✅     | Unit: zero-config budget → `ProviderBudgetError`, fetch never called                                              |
| Ledger records characters billed                            | ✅     | Unit: `ProviderUsage` row `{provider: elevenlabs, unitType: characters, units: text.length}`                      |
| Fail-loud on missing key                                    | ✅     | Unit: `VOICE_PROVIDER=elevenlabs` without key throws at resolution                                                |
| API error / empty audio surfaced clearly, nothing recorded  | ✅     | Unit: 401 → error with status; empty body → error                                                                 |
| Mock default; deterministic tests unchanged                 | ✅     | `LocalSynthVoiceProvider` honors new `durationTargetSeconds` hint — integration expectations intact               |
| Narration-first pipeline works end-to-end on mocks          | ✅     | 50 integration (full generation loop, duration ≈ scenes × target) + 10 e2e incl. generation UI flow               |
| Budget errors non-retryable at the worker                   | ✅     | `ProviderBudgetError` → BullMQ `UnrecoverableError` in the generation worker (carry-over closed)                  |
| `pnpm verify` green; gitleaks clean; migration reproducible | ✅     | verify exit 0 (89 unit); "no leaks found"; migration `prov_009b_unit_characters` (enum; applied to Neon, 9 total) |

## 3. Design notes

- `ProviderUnitType` gained `characters` (migration
  `20260727023302_prov_009b_unit_characters`).
- Contract additions (both optional, mocks ignore/honor):
  `VoiceSynthesisRequest.tenantId` (budget scoping) and
  `durationTargetSeconds` (mock determinism hint; real TTS ignores it —
  narration length rules).
- Cost model: `ELEVENLABS_USD_PER_1K_CHARS` (default 0.30 conservative);
  reconcile against the ElevenLabs dashboard.
- Voice selection: `VOICE_ID` env (a real ElevenLabs voice id) +
  optional `ELEVENLABS_MODEL_ID` override.

## 4. Live smoke — DONE 2026-07-27

User created the account and placed `ELEVENLABS_API_KEY` + `VOICE_ID` +
`VOICE_PROVIDER=elevenlabs` in local `.env` (key never in chat/repo).
Full local pipeline (mock script + **real ElevenLabs narration** +
local-synth video): 3 scenes → assembled `youtube-1080p` final video,
14.0 s, aac audio; ledger 3 × `voice.synthesize` rows, **$0.0600
total** (51/75/74 characters). Lesson: ElevenLabs **library/professional
voices return 402 on the free plan via API** — premade voices work
(smoke used premade "Jessica" `cgSgspJ2msm6clMCkdW9`; the multilingual
model speaks Arabic with premade voices too). Upgrading the plan
unlocks library voices like the user's original Arabic pick.

## 5. Production flip (user actions, when ready)

Add to **Railway worker** Variables (voice runs in the worker, not
Vercel): `ELEVENLABS_API_KEY`, `VOICE_ID`, `VOICE_PROVIDER=elevenlabs`,
`PROVIDER_DAILY_BUDGET_USD`, `PROVIDER_MONTHLY_BUDGET_USD` — then
restart the worker service. Rollback: `VOICE_PROVIDER=mock`.

## 6. Next

Phase C (video generation, fal.ai) or Azure Speech Arabic bake-off
(optional comparison) — user's call.
