---
name: frontend-design
description: Conventions and guardrails for studio-web UI work (pages, components, styling, RTL/Arabic, accessibility). Use whenever building or changing UI in apps/studio-web.
---

# AIVS studio-web frontend conventions

## Current state — intentional

No design system yet. Every module so far shipped deliberately bare UI
(inline styles, native elements) because master prompts scope UI to
"minimal, no design work". A real design pass is its own future module —
**do not introduce a UI framework, component library, Tailwind, or design
tokens without explicit user approval** (same rule as any stack decision).

## Until then, match what exists

- Client components (`"use client"`), plain `useState`/`useEffect` +
  `fetch` polling; no state/data libraries.
- Native elements: `<table>`, `<select>`, `<button>`, `<form>`. Inline
  styles only, matching existing spacing (`0.4rem` cells, `0.5rem` gaps).
- Status badge palette (keep consistent):
  ready/active `#2e8b57` · validating `#1e90ff` · quarantined/expired
  `#b8860b` · rejected/revoked/errors `#b22222` · muted `#888`.
- Every fetch handles `401 → redirect /login` and `403 → role-denied
notice` (see `/consents` page for the pattern).
- Destructive actions (revoke, remove member) need an explicit
  confirmation with typed reason where the API requires one.

## Hard requirements regardless of future design

- **Accessibility-first markup**: real roles/labels — Playwright e2e
  locates by `getByRole`/`getByPlaceholder`; unlabeled divs break tests.
- **Arabic/RTL readiness**: content is Islamic-education media, Arabic
  strings are first-class (sanitizer already preserves them). Prefer CSS
  logical properties (`marginInlineStart`, `textAlign: "start"`) over
  left/right; never assume LTR in new layouts.
- **Child-media signals**: minor-featuring assets show the 🛡️ flag;
  consent/role-gated data must degrade to an explicit denied state, never
  a silent empty list.
- No client-side secrets; signed URLs are short-lived — never cache or
  persist them.

## When the design module arrives

Propose direction (library vs hand-rolled tokens, dark mode, Arabic
typography) as a master-prompt decision for the user — like every other
stack choice in this repo.
