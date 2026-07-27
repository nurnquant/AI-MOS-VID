---
name: frontend-design
description: Conventions and guardrails for studio-web UI work (pages, components, styling, RTL/Arabic, accessibility). Use whenever building or changing UI in apps/studio-web.
---

# AIVS studio-web frontend conventions

## Design system (AIVS-UX-010, user-approved 2026-07-27)

Hand-rolled token system — **no UI framework, no Tailwind, no component
libraries** (adding one is a stack decision needing explicit user
approval). Everything lives in `src/app/globals.css`:

- **Tokens** (CSS custom properties): surfaces/text (`--bg`,
  `--surface`, `--surface-2`, `--border`, `--text`, `--text-muted`),
  brand (`--primary` deep teal, `--accent` amber), status
  (`--status-ok/info/warn/danger/muted` + `-soft` backgrounds), shape
  (`--radius`, `--space-1..6`). Full dark theme via
  `[data-theme="dark"]` overrides.
- **Classes**: `.card`, `.page-header`, `.btn` (+`-primary`,
  `-danger`, `-sm`), `.badge` (+`-ok/-info/-warn/-danger/-muted`),
  `.table`, `.input`/`.select`/`.textarea`, `.field`, `.form-row`,
  `.notice` (+`-ok`/`-error`), `.empty-state`, `.denied-state`,
  `.child-flag`, `.muted`, `.stack`, `.row`, `.content-rtl`, app shell
  (`.app-nav`, `.app-main`).
- **Status badges**: use `badgeClass(status)` from `src/lib/ui.ts` —
  never hand-pick badge classes for known statuses. Badge text must be
  the RAW status string (e2e locates `getByText("ready")` etc.).
- **Typography**: IBM Plex Sans Arabic via `next/font` in
  `layout.tsx` (`--font-sans`); no external font CDNs.
- **Dark mode**: pre-paint init script in `layout.tsx` + `ThemeToggle`
  (`theme-toggle.tsx`), persisted to `localStorage["aivs-theme"]`.

**Rules:** no inline hex or design values — tokens/classes only.
Structural inline styles (`maxWidth`, `minWidth`, `whiteSpace`) are
tolerated. New UI states get a class in `globals.css`, not one-offs.

## Hard requirements

- **e2e locator contract is load-bearing.** Playwright locates by
  role/label/placeholder/exact text. Never change: input placeholders,
  status badge text (raw status words), empty-state strings ("No
  assets yet — upload one above."), button labels — unless the spec
  changes with user approval in the same PR.
- **Accessibility-first markup**: real roles + `aria-label` on every
  input/select; unlabeled divs break tests.
- **Arabic/RTL readiness**: CSS logical properties only
  (`marginInlineStart`, `insetBlockStart`, `textAlign: "start"`);
  Arabic content blocks use `dir` attributes (script editor narration
  is `dir="rtl"` for Arabic scripts); never assume LTR.
- **Child-media signals**: minor-featuring assets show the 🛡️ flag via
  `.child-flag`; role-gated data degrades to `.denied-state` — never a
  silent empty list.
- Every fetch handles `401 → redirect /login` and `403 → denied
state`.
- Destructive actions (revoke, remove member) need explicit
  confirmation with typed reason where the API requires one.
- No client-side secrets; signed URLs are short-lived — never cache or
  persist them.

## Component patterns

- Client components (`"use client"`), plain `useState`/`useEffect` +
  `fetch` polling; no state/data libraries.
- Native elements (`<table class="table">`, `<select class="select">`,
  `<button class="btn">`, `<form class="form-row">`).
- Page skeleton: `.page-header` (h1 + muted subtitle) → `.card` for
  the action/form area → `.card` for the data table.
