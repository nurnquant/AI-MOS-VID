# Production Standard

How content work is organised in this repo. One rule above all others:

> **One number = one request = one output folder.**

## The kinds of input

| You have                                                | Put it                                 |
| ------------------------------------------------------- | -------------------------------------- |
| A story/brief you want produced                         | `inbox/` — **this is the entry point** |
| A clip/photo needing watermark, end card, captions, cut | `inbox/` — same place                  |
| Brand assets reused across jobs (logo, character refs)  | `suppliedMedia/`                       |
| More source files for a job already numbered            | `productions/NNNN-*/source/`           |
| A reference doc or plan, not a thing to produce         | `library/`                             |

`inbox/` takes **both** a brief to generate from and finished media to work on.
Four shapes, detailed in [inbox/README.md](inbox/README.md):

| Dropped                   | Becomes                                            |
| ------------------------- | -------------------------------------------------- |
| `idea.md`                 | generate from scratch, type `video`                |
| `clip.mp4`                | finishing job, request stubbed for you             |
| `clip.mp4` + `clip.md`    | finishing job with your brief (paired by basename) |
| `some-folder/` with a mix | **one** production from everything inside          |

A folder is how several files stay in one job — three verses of one nasheed in a
folder is one production; three loose mp4s are three. Media lands in the job's
`source/` with bytes untouched and the filename slugified, the original name
recorded in the request.

Any filename is fine **in the inbox** — spaces and punctuation, intake renames
everything. Then either tell me to produce it, or run:

```bash
python3 scripts/social/productions.py --intake
```

which assigns the next number, moves the brief to `00-REQUEST.md`, registers it
and refreshes the index. **An empty `inbox/` means nothing is waiting.**

## Layout

```
inbox/                          drop new requests here (stays empty once taken)
productions/
  INDEX.md                      generated overview table — start here
  registry.json                 machine source of truth (edit status here)
  0006-dream-of-every-parent/
    00-REQUEST.md               ← THE ENTRY POINT. Your brief lives here.
    01-NOTES.md                 what was produced, cost, verification, gotchas
    OUTPUT/                     ← deliverables. The only folder you need.
      0006-dream-of-every-parent-9x16.mp4
      CAPTION.md
    source/                     supplied inputs for THIS job, untouched originals
    work/                       intermediates: stills, clips, cards, build scripts
```

Everything about a job — the request you wrote, the finished file, and the
mess in between — sits in one folder. No cross-referencing two trees.

## The number

- **Four digits, zero-padded**: `0001`, `0017`, `0142`. Sorts correctly forever.
- **Assigned when the request is made**, not when it is finished. A request that
  has not been produced yet still gets a number and a folder.
- **Never reused, never renumbered.** If a job is abandoned it keeps its number
  and gets status `parked`.
- **One series for every kind of work** — videos, image sets, watermark jobs.
  The `type` field tells them apart. Avoids "was that V12 or I12?".

## Deliverable filenames

Every file in `OUTPUT/` starts with the production number:

```
0014-most-beautiful-sound-9x16.mp4
0011-fb-series-01-post3-true-success-16x9.png
```

So a file that has been dragged to a phone or sent to a client is still
traceable back to its request.

Suffix conventions: `-9x16` `-16x9` `-4x5` `-1x1` `-2x3` for aspect ratio.

## Captions — standing rules

**Every caption starts with a TITLE, and the title carries emoji.** One title per
platform, then the body. Format: `Title Words 🌿📖🌙✨`.

**Emoji come from [library/EMOJI-LIBRARY.md](library/EMOJI-LIBRARY.md)**, chosen
for what the post is about — not picked at random and not invented. The library
carries signatures per content type (children's, dua and reminders, family and
Qur'an, scholarly) and a meaning for each symbol. Use them in the body too, where
they mark a beat rather than decorate a line.

Set by the user 2026-08-23, and it applies to every production.

**Still plain text otherwise.** No asterisks, no underscores — the platforms
print them literally. Emoji are fine; markdown is not.

## Brand furniture — standing rules

**The watermark stops before the end card.** The end card already carries the
official logo and the wordmark; stamping the corner watermark on top of it is
brand furniture on top of brand furniture. Set by the user on 2026-08-13 and it
applies to every style, not just the one it came up in.

In ffmpeg terms, gate the overlay rather than compositing it over the whole
timeline:

```
overlay=W-w-22:22:format=auto:enable='lt(t,END_CARD_START)'
```

## Style

Every production records a **style** — the complete finishing treatment: text
setting, subtitles, ending card, watermark behaviour, audio bed, pacing.
Catalogue: [library/STYLES.md](library/STYLES.md).

```bash
python3 scripts/social/productions.py --styles              # list the catalogue
python3 scripts/social/productions.py --set 0026 --style 3  # record one
python3 scripts/social/productions.py --new "Title" --style 1
```

Two rules that do not bend:

1. **You name the style in the request.**
2. **If a request does not name one, I ask before producing.** Never assumed,
   never back-filled from a guess.

The dashboard groups editor and visitor averages by style, which is the whole
point of recording it — so "style 4 outperforms style 5" becomes a fact rather
than a hunch.

## Skills

Repeatable pipelines live in `.claude/skills/`. Invoke with `/<name>`.

| Skill               | Covers                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `riwaq-image-post`  | image posts end to end: 4K animated illustration, type composited locally, logo, every platform ratio, caption, tracking   |
| `riwaq-story-video` | cinematic story video (style 1): beat brief, master + scene stills, veo clips, verified speech, local soundtrack, end card |

Named threads: **RhymeBuilding** — CoComelon-style sung rhyme videos, see
[library/RHYME-BUILDING.md](library/RHYME-BUILDING.md).

Each ships a reusable script rather than prose alone:
`riwaq-image-post/scripts/postkit.py` turns one textless square into all five
platform sizes, and `riwaq-story-video/scripts/checkvideo.py` measures a finished
cut — desync, beat structure, per-beat volume, silent tails, per-clip loudness —
and exits non-zero on a hard problem.

## Path hygiene (learned the hard way)

Folder and file names use **lowercase kebab-case, ASCII only**.

**Never** in a path: spaces · quotes `"` `'` · colons `:` · trailing spaces ·
diacritics (`ā` `ḥ`) · emoji.

The old tree had `waterMarkNeeded/Learning Arabic /Title: "Bismillah, Let's
Learn Today".md` — a trailing space, a colon, quotes and spaces in one path.
That breaks shell globbing and cost real time repeatedly.

Full typography belongs **inside** the markdown, not in the path:
`0023-la-hawla/00-REQUEST.md` has the title `Lā ḥawla wa lā quwwata illā billāh`.

## Status vocabulary

| Status        | Meaning                                                       |
| ------------- | ------------------------------------------------------------- |
| `requested`   | brief written, nothing produced                               |
| `in-progress` | being produced now                                            |
| `delivered`   | output finished, awaiting your review/publish                 |
| `published`   | live on at least one platform (record which in `01-NOTES.md`) |
| `parked`      | deliberately stopped; number retained                         |

## Types

| Type        | Means                                                              |
| ----------- | ------------------------------------------------------------------ |
| `video`     | a produced video (any length)                                      |
| `image-set` | a batch of post images from one request                            |
| `watermark` | a supplied external video, watermarked + captioned                 |
| `program`   | an ongoing plan, not a single deliverable (see `library/pillars/`) |

## What is NOT a production

Planning and reference material lives in `library/`, unnumbered:

```
library/
  brand-identity-system.md      the FB post brand doc
  social-package-v4.md          the 49-post plan
  social-package-v3.md          superseded, kept for reference
  social-package-v3-review.md   the review that produced v4
  pillars/                      49-post program: manifest.json, per-pillar TODOs
  voice-samples/                TTS voice auditions, reusable across jobs
```

## Unchanged on purpose

`suppliedMedia/` (brand logo, reference photos), `scripts/social/`,
`costTracker/` keep their paths — scripts and build files reference them, and
renaming would break more than it would tidy.

## Adding a new request

**Normal way** — drop a markdown brief in `inbox/`, then:

```bash
python3 scripts/social/productions.py --intake
```

The title is read from the brief's first `#` heading (or a `TITLE:` line), so
the folder gets a sensible slug automatically.

**If you want the folder first** (to write the brief in place):

```bash
python3 scripts/social/productions.py --new "Title here" --type image-set
```

**Marking progress:**

```bash
python3 scripts/social/productions.py --set 0022 --status published
```

## Cross-references

- `costTracker/social-media-tracker.xlsx` — the ProductionCost `ID` column
  should carry the production number (e.g. `0014`) so spend maps to folders.
- `library/pillars/manifest.json` — pillar posts that get produced record their
  production number in a `production` field.
