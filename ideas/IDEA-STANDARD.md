# Idea standard

How the idea backlog works. Companion to
[PRODUCTION-STANDARD.md](../PRODUCTION-STANDARD.md).

## What an idea is

A proposal, not a request. It exists so a concept can be judged **before any
credits are spent** — hook, script sketch, why it should convert, and an honest
note on what could go wrong.

One idea per file, `INNN-slug.md`. `registry.json` is the source of truth;
`INDEX.md` is generated from it.

## Lifecycle

| Tag         | Icon | Means                                                 |
| ----------- | ---- | ----------------------------------------------------- |
| `proposed`  | `·`  | Written up. Nobody has committed to it.               |
| `approved`  | `+`  | You said build it. It becomes a production.           |
| `delivered` | `✓`  | The linked production is finished and verified.       |
| `published` | `★`  | It is live on at least one platform.                  |
| `rejected`  | `✗`  | Decided against. Kept so it does not get re-proposed. |

Only you move an idea past `proposed`. Nothing self-approves, and no idea is
produced on the strength of being written down.

`delivered` and `published` are set on the idea **after** the linked production
reaches that state, so the two trees never disagree. The production remains the
record of what was actually made; the idea records why it was made.

## Commands

```bash
python3 scripts/social/ideas.py                              # regenerate INDEX.md
python3 scripts/social/ideas.py --new "Title" --series "B — The Hard Parts"
python3 scripts/social/ideas.py --set I001 --status approved
python3 scripts/social/ideas.py --set I001 --style 2         # you name the style
python3 scripts/social/ideas.py --link I001 --production 0036
python3 scripts/social/ideas.py --statuses                   # explain the lifecycle
```

`--link` also flips a `proposed` idea to `approved`, because linking one to a
production is a decision to build it.

## Rules

- **The style is never guessed.** An idea carries no style until you name one.
  Same rule as productions — see [library/STYLES.md](../library/STYLES.md).
- **Every idea file carries its risks.** An idea with no honest limits section is
  not finished. The risk section is what makes the backlog worth having; a list
  of thirty confident pitches would be worthless.
- **Aqeedah, fiqh and pedagogy claims get a scholarly read before production**,
  not after. Ideas that need one say so in their risk section.
- **Child privacy is a hard gate.** Any idea using a real child's words, face or
  voice needs written permission for that specific use, current, every episode.
  See `docs/security/AIVS-media-security-baseline.md`.
- **Captions are plain text.** No markdown characters in anything that gets
  pasted into a platform.
- Rejected ideas stay in the tree. The record of what was turned down and why is
  worth as much as the record of what was made.
