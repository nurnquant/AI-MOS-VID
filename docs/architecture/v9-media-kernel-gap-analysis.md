# Media Kernel v9 — gap analysis against AIVS as built

Analysis only. **Nothing implemented, no module started, no schema touched.**

Compares `riwaq_media_kernel_v9.md` (1,356 lines, 32 sections, phases MK-01→MK-09)
against what exists in this repo today, verified by reading the schema, packages and
tests rather than from memory.

Verified baseline: **12 migrations · 21 models · 2 apps · 13 packages · 9 e2e specs.**

## Headline

**Roughly 55–60% of the kernel already exists**, under different names. The v9
document proposes a **new monorepo** (`riwaq-media-kernel/`) that would rebuild
identity, tenancy, content versioning, jobs, queues, storage, provider abstraction,
audit and publishing — all of which AIVS has running and migrated.

The genuinely missing parts are not the foundations. They are **governance,
scheduling, analytics and the Meta adapter**.

---

## 1. Where v9 is already satisfied

| v9 asks for                                    | AIVS has          | Notes                                                                                          |
| ---------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------- |
| Monorepo, pnpm + Turborepo                     | ✅                | same stack the spec recommends                                                                 |
| PostgreSQL + Prisma                            | ✅                | Prisma 7, 12 migrations applied                                                                |
| Redis + BullMQ queues, workers                 | ✅                | `packages/queue`, `apps/worker`                                                                |
| Object storage adapter                         | ✅                | `packages/storage`, MinIO/S3 → R2-compatible                                                   |
| Identity + sessions                            | ✅                | Better Auth: `User`, `Session`, `Account`, `Verification`                                      |
| Workspace / multi-tenant isolation             | ✅                | `Tenant`, `Project`, `Membership`, `Invitation`                                                |
| RBAC, server-side                              | ✅                | `MembershipRole` enum, enforced in route handlers                                              |
| Canonical objects + versions                   | ✅                | `Asset` + `AssetVersion` + `AssetTransition`                                                   |
| Provenance on generations                      | ✅ (partial)      | `Generation`, `SceneGeneration` record status, attempts, assets                                |
| Audit history                                  | ✅                | `AuditEvent` (tenant, user, type, detail, createdAt)                                           |
| Provider abstraction, no SDK in business logic | ✅                | `packages/providers` — contracts + factory + 8 adapters                                        |
| Cost/usage tracking                            | ✅ **exceeds v9** | `ProviderUsage` with units, unit type, estimated USD, budget gates                             |
| Publishing records + approval                  | ✅ (partial)      | `Publication`, `PublicationApproval`, `PublishPlatform`, `PublicationStatus`                   |
| Content lifecycle                              | ✅ (partial)      | `ScriptStatus`, `AssetStatus`, `PublicationStatus`                                             |
| Testing: unit, integration, e2e                | ✅                | Vitest + Playwright, 9 e2e specs                                                               |
| Child-safety governance                        | ✅ **exceeds v9** | `ConsentRecord`, `ConsentScope`, `child_media_reviewer` role, quarantine, deletion enforcement |
| ADRs                                           | ✅                | 11 ADRs in `docs/architecture/`                                                                |

**AIVS is ahead of v9 in two places the spec does not cover well:** provider
budget/usage accounting, and the consent + child-media quarantine regime.

---

## 2. Real gaps — what v9 asks for that does not exist

| #   | Gap                                                                                             | Size      | Notes                                                                        |
| --- | ----------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------- |
| G1  | **Policy engine** (10 categories, PASS/WARN/**BLOCK**)                                          | **Large** | Nothing equivalent. The core of v9's value.                                  |
| G2  | **Islamic content verification** — Quranic text + hadith attribution against a canonical source | **Large** | Needs a source of truth for Arabic text; not merely code.                    |
| G3  | **Brand Guardian** — automated brand-rule enforcement                                           | Medium    | Rules exist as prose in `library/`, unenforced.                              |
| G4  | **Prompt registry + versioned prompts**                                                         | Medium    | No `Prompt`/`PromptVersion`. Prompts live in code and briefs.                |
| G5  | **Meta adapter** (Facebook/Instagram publishing)                                                | Medium    | Only YouTube is built. `PublishPlatform` has the enum values but no adapter. |
| G6  | **Scheduler app** + `Schedule` model                                                            | Medium    | No `apps/scheduler`. Publishing is manual.                                   |
| G7  | **Analytics** — ingestion, `AnalyticsSnapshot`, performance linkage                             | **Large** | Nothing. Zero matches for "analytics" in code.                               |
| G8  | **Experiments** / A-B infrastructure                                                            | Medium    | Nothing.                                                                     |
| G9  | **Event bus** (Redis Streams, typed envelopes, event naming)                                    | Medium    | Queues exist; a published event bus does not.                                |
| G10 | **Observability** — OpenTelemetry traces, Sentry                                                | Medium    | No OTel or Sentry dependency anywhere.                                       |
| G11 | **Teacher registry** — `Teacher` model, teacher-fact governance                                 | Medium    | Nothing.                                                                     |
| G12 | **Testimonial integrity** workflow                                                              | Small     | Nothing.                                                                     |
| G13 | **Approval workflow engine** — distinct chains per content class                                | Medium    | `PublicationApproval` + `ApprovalKind` is a seed, not an engine.             |
| G14 | **Richer lifecycle** — v9 wants 15 states on one object                                         | Small     | AIVS splits status across Script/Asset/Publication. Mapping, not rebuilding. |
| G15 | **Agent packages** (8 named agents with a shared contract)                                      | Medium    | Generation is orchestrated procedurally, not as agents.                      |
| G16 | **Content types** — 12 platform types incl. Pinterest, stories, ads                             | Small     | `PublishPlatform` lacks Pinterest and X.                                     |
| G17 | **Portal screens** — approval centre, prompt registry, analytics dashboards                     | **Large** | Studio exists; these screens do not.                                         |

---

## 3. Naming: same concept, different word

Most of the "missing" model list is a rename, not a rebuild.

| v9                               | AIVS                     |
| -------------------------------- | ------------------------ |
| `Workspace`                      | `Tenant`                 |
| `ContentItem` / `ContentVersion` | `Asset` / `AssetVersion` |
| `GenerationRun`                  | `Generation`             |
| `MediaAsset`                     | `Asset`                  |
| `Approval`                       | `PublicationApproval`    |
| `Publication`                    | `Publication`            |
| `AuditEvent`                     | `AuditEvent`             |
| `Role`                           | `MembershipRole`         |

Genuinely absent as objects: `Prompt`, `PromptVersion`, `Teacher`, `Campaign`,
`Schedule`, `AnalyticsSnapshot`, `Experiment`.

---

## 4. Phase-by-phase verdict

| Phase                       | Status against AIVS                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------- |
| MK-01 Kernel foundation     | **~90% done** — monorepo, Postgres, Prisma, Redis, identity, workspace, audit all exist |
| MK-02 Content registry      | **~75% done** — versions and provenance exist; lifecycle needs mapping                  |
| MK-03 Prompt runtime        | **~30%** — provider abstraction and generation runs exist; prompt registry does not     |
| MK-04 Governance            | **~10%** — the big build; only consent governance exists                                |
| MK-05 Asset runtime         | **~80%** — R2/S3 adapter, assets, versions all exist                                    |
| MK-06 Scheduler & publisher | **~35%** — publication records and idempotency thinking exist; no scheduler, no Meta    |
| MK-07 Analytics             | **0%**                                                                                  |
| MK-08 Portal                | **~35%** — studio exists; approval centre, prompt registry, analytics do not            |
| MK-09 Hardening             | **~50%** — tests and runbooks exist; no OTel, no DR                                     |

---

## 5. Two conflicts worth naming

**A. It contradicts the smaller plan already on the table.** `AIVS-CONTENTDB-016`
proposes four `Content*` tables mirroring `registry.json` into Neon — days of work.
v9 is a months-long programme. They solve overlapping problems at very different
scales, and both are currently unapproved. **Pick one.**

**B. It points away from where the actual work is happening.** The content that
ships today comes from `productions/` — briefs, Higgsfield, local ffmpeg, manual
posting. 34 productions, ~$67, six posts live on Facebook and Instagram. v9 governs a
pipeline that does not currently produce anything, while the pipeline that does
produce is not modelled by v9 at all.

---

## 6. What this analysis does not decide

Deliberately left open, because they are the user's calls:

1. **New monorepo vs extend AIVS.** The spec says new. The evidence says ~55–60% of
   the foundation already exists here, migrated and tested.
2. **Whether the goal is governance or throughput.** v9 is a governance system. If
   the current bottleneck is review and publishing capacity, the governance layer is
   not the constraint.
3. **Sequencing against CONTENTDB-016.**
4. **Whether Islamic verification (G2) is even a software problem** — it needs a
   canonical text source and a qualified reviewer before any code matters.

No recommendation is made here beyond the measurements above.
