# Deploying the internal productions dashboard

**Project:** `aivs-productions` (Vercel, team `nurandriwaq`)
**Live (preview, protected):**
https://aivs-productions-79vsf0ra3-nurandriwaq.vercel.app

```bash
python3 scripts/social/build_site.py     # rebuild site/ from the current registry
cd site && npx vercel deploy --yes --archive=tgz
```

## What is deployed

The **internal** dashboard: per-production costs, editor ratings including the low
ones, parked work, engagement counts, and the idea backlog with its sign-off
gates. It is a workshop view, not a shopfront.

`site/` carries one primary video and one poster per production — 163 MB. Posters
are resized from the 4K masters (98 MB to 2 MB). The full 2.1 GB tree stays local
and is never uploaded. Links to assets that were not shipped are neutralised
rather than left as 404s.

## Access

**Vercel Authentication is on** — only members of the `nurandriwaq` Vercel team
can open it. Verified anonymously after deploying, not assumed:

- `/` → 302 to `vercel.com/login`, and an anonymous fetch contains **zero**
  occurrences of cost, rating, reaction or parked fields
- a video URL → 302 to the same login, so the media is protected too, not just
  the page

`X-Robots-Tag: noindex, nofollow, noarchive` is set on everything as a second
line of defence.

## DO NOT run `vercel deploy --prod` on this project

The account is on the **hobby** plan. The API refuses to set protection for
production deployments:

> `invalid_sso_protection` — Vercel Authentication is not available on your plan
> for production deployments

The project sits at `ssoProtection: all_except_custom_domains`, and the protection
verified above was verified on a **preview** deployment. Promoting to production,
or attaching a custom domain, risks publishing costs, ratings and unreleased work
to anyone with the URL.

**Keep it on preview deployments.** Each `vercel deploy` prints a fresh protected
URL. If a stable address is ever wanted, that needs a Pro plan, where password
protection and production-level authentication become available.

## Rebuilding after new work

`build_site.py` re-runs `productions.py` first, so the deployed page always
matches the registry. Deploy again for a new URL; old deployments stay protected.
