# AI Video Studio — Generation Partial-Resume Master Prompt

**Document ID:** AIVS-RESUME-014
**Version:** 0.1 (DRAFT — pending user review)
**Status:** Draft for approval; do not execute until approved
**Project:** Riwaq Al Ilm Enterprise AI Video Production Studio
**Depends on:** Modules 001-013 (all PASS)
**Primary Objective:** A failed or partial generation can be RESUMED:
only the scenes that did not finish are re-rendered (and re-paid);
succeeded scene clips are reused as-is. Kills the current
$-per-full-retry economics (a 5-scene Kling video costs ~$5; today one
failed scene forces re-paying all five).

---

## 1. Scope

### In scope

- **Service `resumeGeneration`** (packages/generation): allowed only
  when the generation is `partial` or `failed`; flips only
  non-succeeded scene rows back to `queued` (clearing their errors),
  sets the generation back to `running` (clearing its error), and
  re-enqueues one job per resumed scene. Succeeded scenes keep their
  `assetId` untouched — `processGenerateScene`'s existing idempotency
  skip guarantees they are never re-rendered even on stray
  re-delivery. If every scene is already succeeded (assembly was the
  failure), resume re-enqueues assembly directly.
- **Job ids per attempt:** resumed jobs use
  `generate-scene__{sceneGenId}__r{attempt}` (attempt counter on the
  scene row — new `attempts Int @default(0)` column, migration) so
  BullMQ's deterministic-id dedup never swallows a resume; same for
  the assembly job.
- **API:** `POST /api/scripts/{scriptId}/generations/{generationId}/resume`
  (editor+; 409 unless partial/failed). Audited
  `generation.resumed` (new audit type) with the resumed-scene count.
- **UI:** script editor generations table — `resume (n scenes)`
  button on partial/failed rows; existing polling shows progress.
- **Budget interplay unchanged:** resumed scenes go through the same
  fail-closed budget preflight; a resume that still exceeds caps
  fails only the blocked scenes, resumable again later — by design
  this makes cap-interrupted generations (today's incident) cheaply
  completable after a cap raise or window reset.
- **Tests:** unit (resume guards); integration — scene 2 of 3 fails
  via injected flaky provider → generation `partial` → resume with a
  working provider → only the failed scene re-processes (succeeded
  scenes' assetIds asserted unchanged), assembly completes,
  `generation.resumed` audited; assembly-failure resume path.
  Existing 11 e2e specs untouched.

### Out of scope

- Automatic retry policies; per-scene manual re-render of succeeded
  scenes; cross-generation clip reuse; UI for assembling arbitrary
  clips.

## 2. Execution gates

- **Gate 1 — migration (`attempts`) + resume service + audit type.**
- **Gate 2 — API route + UI button.**
- **Gate 3 — tests + full suites + verify + gitleaks.**
- **Gate 4 — report → merge ff to main + push** (normal flow;
  production migration applied to Neon).

## 3. Definition of Done

- Partial generation with 4/5 succeeded scenes: resume re-renders
  exactly 1 scene, reuses 4 clips, finishes the video (integration-
  tested); ledger shows spend for 1 scene only
- Resume of a running/succeeded generation → 409
- Assembly-only failure resumable without re-rendering any scene
- All suites green; verify exit 0; gitleaks clean; migration
  reproducible + applied to Neon
- Verification report; production behavior confirmed on the next real
  cap-interrupted generation (no forced spend for verification)
