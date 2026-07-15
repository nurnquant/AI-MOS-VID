# ADR-AIVS-005 — Script and Storyboard Model

**Status:** Accepted (user approved the CONTENT-005 master prompt and
authorized implementation on 2026-07-15)
**Date:** 2026-07-15
**Deciders:** User + Claude Code
**Related:** ADR-AIVS-002/-003/-004, `AI_Video_Studio_Content_005_Master_Prompt.md`

## Context

Asset, identity, and consent foundations are done. The creative pipeline
needs its first stage: structured scripts with scene-level storyboards
that a future generation module can consume. No real LLM — a
deterministic mock behind a provider contract, same pattern as every
other provider in this repo.

## Decision

### 1. Data model

- `Script`: tenant + project scoped; `title`, `brief` (the generation
  input), `language` (`ar` | `en`), `targetPresets String[]` (platform
  preset names from media-core), `status`, `createdBy` (user id, plain
  string — audit rows carry the FK relationship), timestamps.
- `Scene`: ordered child rows (`position` int, service-normalized to a
  gap-free 0..n-1 — no DB unique on position; reorders would conflict),
  `narration`, `visualDescription`, `durationTargetSeconds?`,
  `referenceAssetId?` (FK → Asset, `onDelete: SetNull` so consent
  enforcement's hard deletes never break scripts).
- Storyboard = the ordered scene list itself; no separate entity (one
  less join, nothing yet needs storyboard-level fields).

### 2. Status machine (service-enforced, audited)

```
draft → in_review → approved
          ↓ (reject)
        draft
```

- Edits (metadata, scenes, references, regeneration) allowed in `draft`
  only; `in_review` is read-only except approve/reject; `approved` is
  terminal (a change means a new script — versioning is a later module).
- Audit events: `script.created`, `script.generated`, `script.submitted`,
  `script.approved`, `script.rejected` (reject reason in detail).

### 3. Provider contract + mock

`packages/providers`:

```ts
interface ScriptGenerationRequest {
  brief: string;
  language: "ar" | "en";
  sceneCount?: number;
}
interface GeneratedScene {
  narration: string;
  visualDescription: string;
  durationTargetSeconds: number;
}
interface ScriptProvider {
  name: string;
  generate(r: ScriptGenerationRequest): Promise<{ scenes: GeneratedScene[] }>;
}
```

`MockScriptProvider`: pure function of the request — an FNV-style hash of
the brief seeds template selection and scene count (3-5). Same brief +
language → byte-identical script (tested). Templates are neutral
educational placeholders in both languages; Arabic output is real Arabic
text so RTL rendering is exercised honestly.

### 4. Services — new `packages/content`

Depends on `database` + `auth` (audit) + `providers`. Not on `assets` —
asset reference checks are simple tenant/status queries.

- create (blank or generated), update metadata, regenerate (replaces
  scenes, draft only)
- scene add/update/delete/reorder (normalize positions)
- reference asset attach/detach: must be same-tenant + `ready`, else
  404/409; `featuresMinor` references are **masked at serialization** for
  callers below `child_media_reviewer` (scene shows `referenceMasked:
true`, no asset id)
- submit / approve / reject with transition validation (`ContentError`
  with HTTP-ish status codes, same pattern as ConsentError)

### 5. RBAC + API

| Route                                      | Method                           | Role                  |
| ------------------------------------------ | -------------------------------- | --------------------- |
| `/api/scripts`                             | GET                              | viewer+               |
| `/api/scripts`                             | POST (blank or `generate: true`) | editor+               |
| `/api/scripts/{id}`                        | GET                              | viewer+ (masked refs) |
| `/api/scripts/{id}`                        | PATCH (draft only)               | editor+               |
| `/api/scripts/{id}/generate`               | POST                             | editor+               |
| `/api/scripts/{id}/submit`                 | POST                             | editor+               |
| `/api/scripts/{id}/approve` \| `/reject`   | POST                             | **admin+**            |
| `/api/scripts/{id}/scenes` (+`/{sceneId}`) | POST/PATCH/DELETE                | editor+               |

Approval is admin+ because approved scripts authorize downstream
generation spend later — a governance act, per user-approved prompt.

### 6. UI

`/scripts` list (status badges: draft `#888`, in_review `#1e90ff`,
approved `#2e8b57`) and `/scripts/{id}` editor: metadata + brief,
generate button, scene table (inline narration/visual/duration edits,
up/down reorder, delete, reference selector filled from ready assets),
submit/approve/reject actions. Narration inputs get `dir="rtl"` when
`language === "ar"` (frontend-design skill rules apply).

## Alternatives considered

| Area       | Alternative                      | Why rejected                                                     |
| ---------- | -------------------------------- | ---------------------------------------------------------------- |
| Storyboard | Separate Storyboard entity       | No storyboard-level fields yet; scenes carry shot data           |
| Ordering   | `@@unique([scriptId, position])` | Reorder swaps violate the constraint mid-transaction             |
| Mock       | Random/LLM-ish output            | Determinism is the DoD; tests + future snapshots need it         |
| Approval   | editor+                          | Approval gates future paid generation — admin+ per user decision |
| Services   | In `packages/assets`             | Content is a distinct domain; assets package already large       |

## Consequences

- Future generation module consumes `approved` scripts only — same
  "consume only ready state" rule as assets.
- Swapping the mock for a real LLM changes one provider binding; contract
  and UI stay put (requires user approval + likely a safety-review gate
  for child-audience content).

## Security implications

- Child-media reference masking below reviewer role; hard-deleted assets
  (consent enforcement) null out references without breaking scripts.
- Mock provider reads no env vars, makes no network calls — nothing to
  leak; gitleaks stays clean.
