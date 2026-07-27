# AIVS-PROJECTS-012 Verification Report

**Result:** **PASS**
**Date:** 2026-07-27
**Branch:** `feature/aivs-projects-012`
**Master prompt:** `AI_Video_Studio_Projects_012_Master_Prompt.md`

## 1. Mini-ADR (gate 0 decisions)

- **Slug rules:** lowercase/dash normalization (same as workspace
  slugs), unique per tenant; collision → 409 with the offending name
  (no silent suffixing).
- **Delete guard:** delete only when the project holds zero assets AND
  zero scripts; content-bearing projects are undeletable — no cascade
  path exists anywhere.
- **Selector persistence:** `localStorage["aivs-active-project"]`,
  validated against the workspace's project list on every page load
  (stale/foreign ids fall back to "All projects"); switch reloads the
  page (same pattern as the workspace switcher).
- **No schema migration** — the Project model existed since
  FOUNDATION-002.

## 2. Scope delivered

- **Service** (`packages/auth/src/projects.ts`): create/rename/list
  (with content counts)/delete, tenant-scoped, audited
  (`project.created/renamed/deleted` — new audit types).
- **API:** `POST /api/projects` (editor+), `PATCH|DELETE
/api/projects/{id}` (admin+); GET now returns counts.
- **UI:** `/projects` page (create, inline rename, delete visible only
  on empty projects); nav "Projects (soon)" → real link;
  **active-project selector** in the nav.
- **Wiring:** assets + scripts pages filter their lists by the active
  project and create into it ("All projects" → first project);
  publications table gains a Project column (through the asset).

## 3. Definition of Done — evidence

| DoD item                                             | Status | Evidence                                                                                                                                  |
| ---------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| CRUD via UI; delete blocked on content               | ✅     | Integration: create/rename/delete + audits; "holds content" 409 with a script present; e2e: delete button absent on the non-empty project |
| Slug collision handling                              | ✅     | Integration: same-normalized name → "already exists" 409                                                                                  |
| Tenant scoping                                       | ✅     | Integration: foreign-tenant rename/delete → 404                                                                                           |
| Active project persists; lists + creation respect it | ✅     | New e2e: script created under project Alpha visible there, absent under Beta after switching                                              |
| Existing e2e untouched and green                     | ✅     | `git diff` on the 10 prior specs: empty; **11/11** e2e passed (46.5 s)                                                                    |
| verify green; gitleaks clean; no migration           | ✅     | verify exit 0 (**109 unit**, 2 new); "no leaks found"; migrations directory unchanged                                                     |

Totals: 109 unit / 62 integration (3 new) / 11 e2e (1 new).

## 4. Next

Roadmap remaining: provider polish (usage dashboard, Azure bake-off,
model experiments), loose ends (Railway branch → main, prod video
re-verify, credential rotation, uptime pinger + Resend user actions).
