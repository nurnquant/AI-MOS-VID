# AI Video Studio — Script and Storyboard Foundation Master Prompt

**Document ID:** AIVS-CONTENT-005
**Version:** 0.1 (DRAFT — pending user review)
**Status:** Draft for approval; do not execute until approved
**Project:** Riwaq Al Ilm Enterprise AI Video Production Studio
**Depends on:** AIVS-FOUNDATION-002, AIVS-AUTH-003, AIVS-CONSENT-004 (all PASS)
**Primary Objective:** Start the creative pipeline: briefs → scripts →
scene-level storyboards, generated against a **mock** script provider and
editable by humans — so the future generation module (video/voice/music)
has an approved, structured input format to consume.

---

## 1. Claude Operating Role

Principal Software Architect, Backend Engineer, Content-Pipeline Engineer,
Senior QA Automation Engineer. All prior non-negotiables remain, plus:

1. Branch `feature/aivs-content-005-script-storyboard`.
2. **Mock provider only.** `ScriptProvider` contract in
   `packages/providers` with a deterministic local mock (no LLM calls, no
   API keys read). Enabling a real LLM provider is a later, user-approved
   integration.
3. Content is Islamic-education material for children — the mock generator
   emits neutral, wholesome placeholder content; Arabic is a first-class
   script language (`ar` | `en`), stored and rendered correctly (RTL-safe
   UI per the frontend-design skill).
4. Referencing media in storyboards follows existing safety rules: only
   `ready`, tenant-scoped assets; `featuresMinor` assets are referencable
   and visible only to `child_media_reviewer`+.
5. Schema via Prisma migrations; every status change audited.

## 2. Scope

### In scope

- **Schema:** `Script` (tenant + project scoped, title, brief, language
  `ar|en`, target platform presets, status `draft → in_review → approved`
  with audit trail via new `script.*` audit events, createdBy) and ordered
  `Scene` rows (position, narration text, visual/storyboard description,
  target duration seconds, optional `referenceAssetId`).
- **Provider contract:** `ScriptProvider.generate(brief) → scenes` in
  `packages/providers` + `MockScriptProvider` (deterministic output from
  the brief text — same brief, same script; structured scenes with
  narration + visual descriptions + durations).
- **Services (`packages/content`):** create script (blank or generated
  from brief), update metadata, scene CRUD + reorder, attach/detach
  reference asset (validating tenant/status/child-media visibility),
  submit for review, approve (role-gated), audit events
  `script.created|generated|submitted|approved|rejected`.
- **RBAC:** create/edit/generate = `editor`+; approve/reject = `admin`+
  (owner included). Viewers read only. Scripts referencing a
  `featuresMinor` asset show that reference only to reviewers+.
- **API + UI:** scripts list page (status badges), script detail/editor
  page (brief, generate button, scene table with inline edit + reorder,
  reference-asset selector from ready assets, submit/approve buttons).
  Zod-validated routes. UI per frontend-design skill (bare, RTL-safe:
  `dir` attribute follows script language).
- **Tests:** unit (mock determinism, reorder logic, status transitions),
  integration (full lifecycle: generate → edit → reference asset →
  approve; RBAC denials; child-media reference visibility), e2e (editor
  generates a script from a brief, edits a scene, approves as owner).

### Out of scope (later modules)

- Real LLM/script providers, translation workflows
- Video/voice/music generation from scripts (next module consumes
  approved scripts)
- Rendering, timelines, publishing
- Collaborative editing/locking; comments

## 3. Execution Gates

- **Gate 0 — ADR-AIVS-005:** content model (Script/Scene), status machine,
  provider contract shape, RBAC map. Stop unless pre-authorized.
- **Gate 1 — Schema + migration.**
- **Gate 2 — Provider contract + mock.**
- **Gate 3 — Content services + audit.**
- **Gate 4 — API routes.**
- **Gate 5 — UI (list + editor).**
- **Gate 6 — Validation:** full suites + `pnpm verify` + evidence.
- **Gate 7 — Verification report** + next-module recommendation.

## 4. Definition of Done

- Same brief → identical mock script (deterministic, tested)
- Full lifecycle draft → in_review → approved with audit rows; illegal
  transitions rejected (tested)
- Scene reorder is stable and gap-free after arbitrary moves (tested)
- Reference rules enforced: non-ready asset 409, cross-tenant 404,
  featuresMinor reference hidden below reviewer (tested)
- RBAC: viewer cannot mutate (403); editor cannot approve (403) (tested)
- Arabic script renders RTL in the editor (`dir="rtl"` when `ar`)
- `pnpm verify` green; gitleaks clean; migrations reproducible
- Verification report; user approval before next module
