# AI Video Studio — Mock Media Generation Orchestration Master Prompt

**Document ID:** AIVS-GEN-006
**Version:** 0.1 (DRAFT — pending user review)
**Status:** Draft for approval; do not execute until approved
**Project:** Riwaq Al Ilm Enterprise AI Video Production Studio
**Depends on:** FOUNDATION-002, AUTH-003, CONSENT-004, CONTENT-005 (all PASS)
**Primary Objective:** Close the local creative loop: an **approved script**
becomes per-scene clips and one assembled, platform-normalized video —
orchestrated through the job/asset pipeline with **local synthesis
providers** (ffmpeg-generated media; zero external calls). When real
providers are approved later, only the provider bindings change.

---

## 1. Claude Operating Role

Principal Software Architect, Media Pipeline Engineer, Backend Engineer,
Senior QA Automation Engineer. All prior non-negotiables remain, plus:

1. Branch `feature/aivs-gen-006-generation`.
2. **Local synthesis only.** New `LocalSynthVideoProvider` /
   `LocalSynthVoiceProvider` implement the existing provider contracts by
   producing real files with ffmpeg (color/testsrc video at the scene's
   target duration; sine-tone narration audio). Real playable media, no
   network, no keys. Existing URL-returning mocks stay for contract tests.
3. Generated media enters the system **only through the existing ingestion
   pipeline** (quarantine → validate → ready) as a system actor — no
   bypassing the asset state machine.
4. Generated content is synthetic: `featuresMinor=false` always; consent
   machinery untouched.
5. Generation may start **only from `approved` scripts** (editor+ to
   start — approval already gated the content at admin level).

## 2. Scope

### In scope

- **Schema:** `Generation` (tenant/script scoped, target preset, status
  `queued → running → succeeded | failed | partial`, startedBy, timings)
  and `SceneGeneration` rows (sceneId, kind `clip|narration`, status,
  resulting `assetId`, error). Audit: `generation.started`,
  `generation.completed`, `generation.failed`.
- **Queue:** new `generation` BullMQ queue; jobs `generate-scene`
  (synthesize clip + narration → mux → ingest → link asset) and
  `assemble-video` (after all scenes ready: concat scene assets in order,
  normalize to the generation's target preset, ingest as the final
  asset). Existing retry/backoff and Job-row bookkeeping conventions.
- **Orchestration service (`packages/content` or `packages/generation`):**
  start generation (validates approved script + preset), fan-out scene
  jobs, completion tracking (assemble only when every scene succeeded;
  `partial` when some scenes dead), idempotent re-delivery.
- **API + UI:** start-generation action on an approved script; generation
  status endpoint; script editor gains a Generations section (per-scene
  progress badges, final video row with signed-URL link when ready);
  polling like the assets page.
- **Tests:** unit (status derivation/orchestration edges), integration
  (approved script → generation → scene assets ready → assembled video
  ready in MinIO, playable and probe-verified; failure path → partial),
  e2e (approve script in UI → start generation → watch final video appear
  with worker running).

### Out of scope (later modules)

- Real video/voice/music providers (user approval + budget gates)
- Music tracks, transitions, subtitles/captions, thumbnails-per-scene
- Multi-preset fan-out per generation (one preset per run for now)
- Publishing, review/approval of generated output (consumes existing
  asset machinery later)

## 3. Execution Gates

- **Gate 0 — ADR-AIVS-006:** generation model, queue topology, assembly
  strategy (concat demuxer), provider synthesis design. Stop unless
  pre-authorized.
- **Gate 1 — Schema + migration.**
- **Gate 2 — Local synthesis providers (+tests).**
- **Gate 3 — Orchestration services + queue + worker.**
- **Gate 4 — API routes.**
- **Gate 5 — UI (generation section in script editor).**
- **Gate 6 — Validation:** suites + `pnpm verify` + evidence.
- **Gate 7 — Verification report** + next-module recommendation.

## 4. Definition of Done

- Approved script → one command/click → final normalized mp4 asset in
  `ready` state, fetchable via signed URL; ffprobe confirms target
  preset resolution/fps and duration ≈ sum of scene targets (tested)
- Every scene clip is itself a `ready` asset that traveled quarantine →
  validation (tested)
- Non-approved script cannot start generation (409, tested)
- A failing scene job leaves the generation `partial` with the error
  recorded; successful scenes keep their assets (tested)
- Re-delivered jobs are idempotent (no duplicate assets) (tested)
- All lifecycle events audited
- `pnpm verify` green; gitleaks clean; migrations reproducible
- Verification report; user approval before next module
