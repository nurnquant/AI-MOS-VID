# AIVS-RESUME-014 Verification Report

**Result:** **PASS**
**Date:** 2026-07-27
**Branch:** `feature/aivs-resume-014`
**Master prompt:** `AI_Video_Studio_Resume_014_Master_Prompt.md`

## 1. Scope delivered

- **`resumeGeneration`** (packages/generation): partial/failed only
  (409 otherwise); re-queues exactly the non-succeeded scenes
  (statuses reset, errors cleared, `attempts` incremented for fresh
  BullMQ job ids `…__r{n}`); generation back to `running`; when every
  scene already succeeded, re-enqueues assembly instead. Audited
  `generation.resumed` (scene count + assembly flag).
- **Migration:** `SceneGeneration.attempts Int @default(0)` — applied
  locally + production Neon.
- **API:** `POST /api/scripts/{id}/generations/{genId}/resume`
  (editor+). **UI:** `resume (n scenes)` button on partial/failed rows
  in the script editor's generations table.
- Budget interplay unchanged: resumed scenes pass through the same
  fail-closed preflight — a cap-interrupted generation (the 2026-07-27
  incident pattern) completes for the cost of its missing scenes only.

## 2. Definition of Done — evidence

| DoD item                                   | Status | Evidence                                                                                                                                                                                                   |
| ------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Only failed scenes re-render; clips reused | ✅     | Integration: 1 of N scenes fails via flaky provider → partial → resume → exactly ONE provider submit (counted), succeeded scenes' assetIds byte-identical, final video assembles at full expected duration |
| Non-resumable states guarded               | ✅     | Integration: running generation resume → 409 "only partial or failed"                                                                                                                                      |
| Assembly-only failure                      | ✅     | Integration: all scenes succeeded + failed generation → resume returns `{resumedScenes: 0, assemblyEnqueued: true}` → assembly completes, no scene re-rendered                                             |
| Audited                                    | ✅     | `generation.resumed` asserted                                                                                                                                                                              |
| Suites green; migration reproducible       | ✅     | **117 unit / 67 integration (3 new) / 11 e2e**; `pnpm verify` exit 0; gitleaks clean; migration applied local + Neon (11 total)                                                                            |

## 3. Production note

The stuck youtube-1080p generation from today (4/5 scenes, blocked by
the $5 daily cap) becomes completable after deploy: raise the cap or
wait for the UTC window, open the script, click `resume (1 scenes)` —
~$1 instead of ~$5.
