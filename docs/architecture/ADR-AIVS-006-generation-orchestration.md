# ADR-AIVS-006 — Mock Media Generation Orchestration

**Status:** Accepted (user approved the GEN-006 master prompt and
authorized implementation on 2026-07-15)
**Date:** 2026-07-15
**Deciders:** User + Claude Code
**Related:** ADR-AIVS-002/-005, `AI_Video_Studio_Gen_006_Master_Prompt.md`

## Context

CONTENT-005 produces approved scripts; FOUNDATION-002 owns the asset
pipeline. Missing link: turning an approved script into media. Real
providers stay out (paid); local ffmpeg synthesis produces honest,
playable files so the entire loop — script → clips → assembled,
preset-normalized video — runs and is testable offline.

## Decision

### 1. Model

- `Generation`: tenant + script scoped, `targetPreset` (media-core preset
  name), status `queued → running → succeeded | failed | partial`,
  `startedBy`, `finalAssetId?` (SetNull), `error?`.
- `SceneGeneration`: one row per scene (`position` copied for stable
  ordering), status `queued → running → succeeded | failed`, `assetId?`
  (SetNull), `error?`. **One muxed clip per scene** (synth video + synth
  narration audio in a single mp4) instead of the master prompt's separate
  `clip|narration` rows — the concat step needs uniform single-stream
  pairs anyway; documented deviation.
- Only `approved` scripts can start a generation (editor+; content was
  already admin-approved). Generated media is always `featuresMinor=false`.
- Audit: `generation.started`, `generation.completed`
  (detail.status `succeeded|partial`), `generation.failed`.

### 2. Local synthesis

- `packages/media-core` gains `synthesizeSceneClip(outputPath, {duration,
label, width, height, fps})`: ffmpeg `testsrc2` video + `sine` audio,
  h264/aac, fixed intermediate format 1280×720@25 (uniform streams make
  lossless concat possible).
- Provider bindings in `packages/providers`: `LocalSynthVideoProvider` /
  `LocalSynthVoiceProvider` implement the existing contracts by writing
  real files and returning `file://` URLs (in-memory job map). The
  orchestrator resolves `file://` locally today; a real provider swap
  later means fetching `https://` in the same spot.

### 3. Orchestration — `packages/generation`

- `startGeneration`: validates approved script + known preset, creates
  Generation (running) + queued SceneGeneration rows, enqueues one
  `generate-scene` job per scene on the new `generation` queue
  (deterministic ids `generate-scene__{sceneGenerationId}`).
- `processGenerateScene`: idempotent (assetId set → no-op). Synthesizes
  the clip at the scene's target duration, ingests it through the normal
  pipeline as a system actor with `enqueueValidation: false` (new
  ingest option), then runs `validateAsset` synchronously — quarantine →
  ready inside the job, no duplicate validation job racing it.
- After each scene job the worker runs `checkGeneration`: all scenes
  succeeded → enqueue `assemble-video`; no scenes pending and any failed
  → finalize `partial` (successful clips keep their assets) or `failed`
  (none succeeded), audited.
- `processAssembleVideo`: idempotent (finalAssetId set → no-op).
  Downloads scene assets in order, ffmpeg concat-demuxer copy (uniform
  streams), `normalizeVideo` to the target preset, ingest + validate,
  stamp `finalAssetId`, status `succeeded`, audit.
- Failure semantics: BullMQ retries (3, backoff) per job; final failure
  marks the SceneGeneration/Generation with the error. Crash-safe: every
  step re-checks persisted state before acting.

### 4. API + UI

- `POST /api/scripts/{id}/generations` (editor+) `{targetPreset}` → 202.
- `GET /api/scripts/{id}/generations` (viewer+) → generations with scene
  progress and final asset id.
- Script editor shows a Generations section for approved scripts: preset
  selector + start button, per-generation progress (`x/y scenes`,
  status badges), final-video link that fetches a signed URL.

## Alternatives considered

| Area             | Alternative                               | Why rejected                                                                                               |
| ---------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Synthesis entry  | Write objects straight to MinIO `assets/` | Bypasses quarantine/state machine — forbidden by module rules                                              |
| Scene validation | Let the enqueued validation job do it     | Racing job + synchronous need; dead-job handler could fight the state machine                              |
| Assembly         | Re-encode concat filtergraph              | Concat-demuxer copy of uniform intermediates is faster and lossless; single re-encode happens at normalize |
| Rows per scene   | Separate clip/narration rows              | Mux happens inside one job; split rows model states that can't diverge                                     |
| Package          | Extend `packages/content`                 | Generation orchestrates assets+queues+media — distinct concern, distinct deps                              |

## Consequences

- Full creative loop runs offline; swapping real providers later touches
  provider bindings + the URL-fetch branch only.
- Intermediate 720p25 synthesis caps mock quality — irrelevant for mocks,
  revisit with real providers.
- `generation` queue joins the worker; retention sweep and media jobs
  unaffected.

## Security implications

- No network, no keys; gitleaks clean.
- Generated assets flow through the same quarantine/validation as any
  upload; system actor recorded in the audit trail; `featuresMinor`
  always false so consent machinery is untouched.
