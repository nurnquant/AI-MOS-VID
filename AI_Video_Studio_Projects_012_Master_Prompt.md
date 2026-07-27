# AI Video Studio — Projects Module Master Prompt

**Document ID:** AIVS-PROJECTS-012
**Version:** 0.1 (DRAFT — pending user review)
**Status:** Draft for approval; do not execute until approved
**Project:** Riwaq Al Ilm Enterprise AI Video Production Studio
**Depends on:** Modules 001-011 (all PASS)
**Primary Objective:** Turn "Projects (soon)" into a real feature:
project CRUD plus a workspace-wide active-project selector, so
assets/scripts (and their downstream generations/publications) are
organized per project instead of everything landing in the implicit
first project.

---

## 1. Scope

### In scope

- **API** (`/api/projects`): GET exists; add POST create (editor+),
  PATCH rename (admin+), DELETE (admin+, **only when the project has
  zero assets and zero scripts** — content-bearing projects cannot be
  deleted; no cascade, ever). Slugs derived from names, unique per
  tenant. All actions audited (`project.created/renamed/deleted` —
  new audit types).
- **`/projects` page:** list (name, asset/script counts, created),
  create form, inline rename, delete (empty only, confirmation),
  design-system styling.
- **Active-project selector:** dropdown in the app nav (next to the
  workspace switcher), persisted in `localStorage` per workspace;
  "All projects" default option.
- **Wiring:** assets + scripts pages filter by the active project
  (both APIs already accept `projectId`) and create INTO the active
  project (replacing the current `projects[0]` behavior; "All
  projects" → first project for creation, labeled in the form).
  Publications inherit project through their asset — a project column
  in the publications table, no filter (keep small).
- **Nav:** "Projects (soon)" → real `/projects` link.
- **Tests:** unit (slug derivation, delete-guard), integration
  (CRUD + delete-guard + audit), one NEW e2e spec (create project →
  create script in it → visible only under that project) — the
  existing 10 specs stay untouched and green.

### Out of scope

- Moving existing content between projects; per-project roles;
  project archiving; cross-project dashboards.

## 2. Execution gates

- **Gate 0 — mini-ADR** section inside the verification report (small
  module; no separate ADR file): slug rules, delete guard, selector
  persistence.
- **Gate 1 — API + services + audits.**
- **Gate 2 — /projects page + nav.**
- **Gate 3 — selector + assets/scripts wiring.**
- **Gate 4 — tests (incl. new e2e) + verify + gitleaks.**
- **Gate 5 — report → merge ff → push.**

## 3. Definition of Done

- Create/rename/list projects via UI; delete blocked with a clear
  message when the project holds content (all tested)
- Active project persists across pages + reloads; assets/scripts
  lists and creation respect it (e2e-tested)
- Existing 10 e2e specs pass unmodified; new spec green
- `pnpm verify` green; gitleaks clean; no schema migration needed
  (Project model already exists)
- Verification report; user approval before next module
