# AI Video Studio — UX/Design Module Master Prompt

**Document ID:** AIVS-UX-010
**Version:** 0.1 (DRAFT — pending user review)
**Status:** Draft for approval; do not execute until approved
**Project:** Riwaq Al Ilm Enterprise AI Video Production Studio
**Depends on:** Modules 001-009 (all PASS; full real-provider pipeline live)
**Primary Objective:** Replace the deliberately bare UI with a coherent,
accessible, **Arabic/RTL-first** design system across every existing
page (home, login/register, invite, assets, consents, scripts,
publications, members, status) — zero behavior changes, zero API
changes; e2e suite must stay green (locators are role/label-based by
design, so a visual redesign must not break them).

---

## 1. Direction decisions (YOUR CALL — pick per row, defaults marked)

Per the frontend-design skill, stack choices need explicit approval:

| Decision           | Option A (recommended)                                                                                                                                                                                          | Option B                | Option C                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------- |
| Styling foundation | **Hand-rolled design tokens** (CSS custom properties + a small `ui/` component set: Button, Badge, Card, Table, Field, Dialog) — zero new dependencies, full RTL control, fits the repo's no-frameworks posture | Tailwind CSS v4         | Component library (shadcn/radix — brings React deps) |
| Dark mode          | **Yes — `prefers-color-scheme` + manual toggle**, tokens make it cheap                                                                                                                                          | Light only              | Dark only                                            |
| Arabic typography  | **IBM Plex Sans Arabic** (self-hosted via `next/font`, excellent Arabic+Latin pairing, no external font CDN)                                                                                                    | Noto Naskh/Kufi pairing | System font stack only                               |
| Locale direction   | **Per-content RTL** (Arabic content blocks `dir="rtl"`; app chrome follows a global toggle, logical properties throughout)                                                                                      | Full-app RTL flip       | LTR chrome only                                      |
| Visual character   | **Warm educational**: cream/sand surfaces, deep teal primary, existing status palette kept (ready `#2e8b57` etc.), rounded/soft, child-friendly but professional dashboard                                      | Neutral/enterprise gray | User supplies brand palette                          |

Approve defaults by replying "approved" — or name changes per row.

## 2. Scope

### In scope

- **Token layer:** colors (light+dark), spacing, radii, typography
  scale, status palette — CSS custom properties in `globals.css`;
  every inline style migrated to tokens/classes.
- **`ui/` primitives** (plain React + CSS, no deps): Button (variants:
  primary/secondary/danger), Badge (status colors), Card, Table,
  Field/Input/Select, Dialog (confirmation pattern incl. typed-reason
  destructive flow), PageHeader, EmptyState (incl. explicit
  role-denied state), Spinner.
- **Layout:** app shell — header with nav (current `session-nav`),
  workspace/tenant indicator, responsive down to tablet; consistent
  page structure.
- **Page-by-page redesign:** home dashboard, login/register/invite,
  assets (upload, list, signed-url viewer, 🛡️ child-media flag
  treatment), consents (registry + lifecycle actions), scripts (list +
  editor with RTL narration editing), publications (create, review
  queue, approvals progress, status), members, status.
- **Hard requirements carried:** role/label a11y markup (e2e depends
  on it), logical CSS properties everywhere, 401→login / 403→denied
  patterns preserved, child-media signals prominent, no client-side
  secrets.
- **Tests:** e2e suite green unchanged (role-based locators);
  visual sanity via existing flows; `pnpm verify` green.

### Out of scope

- New features/pages, API changes, state libraries, i18n message
  framework (UI copy stays English; Arabic is content), marketing
  site, video player beyond current `<video>`.

## 3. Execution gates

- **Gate 0 — direction lock:** decisions table above approved.
- **Gate 1 — tokens + primitives** (with a small showcase on /status).
- **Gate 2 — shell + auth pages.**
- **Gate 3 — content pages** (assets, consents, scripts).
- **Gate 4 — publishing + members + home.**
- **Gate 5 — dark mode + RTL polish pass.**
- **Gate 6 — validation:** full e2e + verify; screenshots in report.
- **Gate 7 — verification report → merge ff → push** (Vercel deploys).

## 4. Definition of Done

- Zero inline hex/spacing literals left in pages (tokens only)
- All 10 e2e specs pass unmodified
- Dark + light render correctly on every page; RTL narration editing
  correct in scripts editor
- Child-media 🛡️ + denied-state patterns visually distinct
- `pnpm verify` green; no new runtime dependencies beyond approved
  decisions (fonts via `next/font` count as approved if Option A)
- Verification report with before/after screenshots
