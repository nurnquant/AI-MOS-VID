# inbox — drop anything you want produced or finished here

The entry point. Works for **both** kinds of request:

- a story or brief you want generated from scratch
- a video/audio/image you already have, that needs watermarking, an end card,
  captions, a trim, or a re-cut

Any filename is fine **here** — spaces, quotes, em dashes, diacritics. Intake
renames everything on the way in.

## The four shapes it accepts

```
inbox/
  my next video idea.md          brief alone      -> generate from scratch
  clip.mp4                       media alone      -> finishing job, I ask what to do
  clip.mp4 + clip.md             same basename    -> finishing job WITH your brief
  thank-you-allah/               a folder         -> ONE production, any mix inside
    brief.md
    verse1.mp4  verse2.mp4  verse3.mp4
  README.md                      (ignored)
```

**Use a folder when several files belong to one job.** Three verses of the same
nasheed in a folder become one production; three loose mp4s at the top level
become three separate productions. That is the only thing intake cannot guess
for you.

Recognised media: `.mp4 .mov .png .jpg .jpeg .webp .wav .m4a`

## What happens next

When I pick it up, or when you run:

```bash
python3 scripts/social/productions.py --intake
```

each job in this folder:

1. gets the next production number
2. brief moves to `productions/NNNN-slug/00-REQUEST.md`
3. media moves to `productions/NNNN-slug/source/` — **bytes untouched**, but the
   filename is slugified, and the original name is recorded in the request
4. gets registered in `productions/registry.json`
5. appears in `INDEX.md` and `index.html`

If you dropped media with no brief, `00-REQUEST.md` is **stubbed** with the file
list and a prompt asking what to do with it — so a job is never blank. Fill it in
or just tell me.

`type` is guessed from what you dropped: images only → `image-set`, any
video/audio → `watermark` (finishing work), brief only → `video`.

**Style is never guessed.** Name one in the brief (see
[../library/STYLES.md](../library/STYLES.md)) or I ask before spending credits.

The inbox goes back to empty. **An empty inbox means nothing is waiting.**

## What does NOT go here

| You have                                                          | Put it                                  |
| ----------------------------------------------------------------- | --------------------------------------- |
| A brief, or media needing work                                    | **here** (`inbox/`)                     |
| Brand assets reused everywhere — logo, character reference photos | `suppliedMedia/`                        |
| More source files for a job already numbered                      | that job's `productions/NNNN-*/source/` |
| A reference doc or plan, not a thing to produce                   | `library/`                              |
