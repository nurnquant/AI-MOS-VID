# AIVS-PROV-009 Phase B Verification Report

**Result:** **PASS (code complete; live smoke pending user key)**
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

## 4. Enablement (user actions)

1. Create ElevenLabs account; put `ELEVENLABS_API_KEY` in local `.env`
   (+ Railway worker vars for production — voice runs in the worker,
   not Vercel).
2. Pick a voice (child-friendly, supports Arabic) and set `VOICE_ID`.
3. Set `VOICE_PROVIDER=elevenlabs` (local first for the smoke).
4. Live smoke: one script → generation → final video with real
   narration, ledger row verified — then production flip.

## 5. Next

Live smoke on key arrival, then Phase C (video generation, fal.ai) or
Azure Speech Arabic bake-off (optional comparison) — user's call.
