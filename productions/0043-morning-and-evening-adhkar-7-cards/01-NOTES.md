# 0043 — Morning & Evening Adhkar, 7 cards · notes

Delivered 2026-08-24. **Seven 1080x1350 cards. Zero credits.**
From idea [I031](../../ideas/I031-morning-evening-adhkar-7-posts.md).

## Nothing was retyped

The Arabic, transliteration and translation are **parsed straight out of the
user's source document** by `work/render.mjs` reading `work/cards.json`, which is
generated from the markdown. No human or model retyped a single graded Arabic
passage.

Verified afterwards, codepoint by codepoint: **all 21 strings — seven Arabic,
seven transliterations, seven translations — appear verbatim in the source.
329 harakat in total.**

## Rendered through a browser, and that is not a preference

The source document says: "do not rely on AI image/video models to generate
Arabic." Correct, and there is a second half to it — **Pillow cannot do it
either.** This machine has no libraqm, so Pillow silently drops every harakat; a
voweled and a stripped string render to identical images. That was measured on
0039, not assumed.

**All 329 harakat here exist because a browser placed them.** No image model went
near the Arabic.

## Design

Deep emerald ground with a soft gold glow, a thin gold frame with corner marks,
the series kicker and a **day counter** at the top — the counter is what makes
seven posts a series rather than seven posts.

Then Arabic, transliteration in gold italic, English, and a footer carrying the
source reference and the wordmark with the primary signature 🌿📖🌙✨.

**Type sizes adapt to length.** Post 7, Sayyid al-Istighfar, is ten times post 1
— 293 Arabic characters against 30. A fixed size would either shrink post 1 to
nothing or overflow post 7. Every card is checked for overflow at render time and
all seven report 0 px.

**The first pass was top-heavy** — content pinned to the top with a void above
the footer, and type far smaller than the space allowed. Arabic went from 74 px
to 92 px at the short end, the block is now vertically centred and the footer
pinned. Only visible by looking at the sheet.

## The gate that has not moved

**These have not been reviewed by anyone qualified.** I031 flagged it, the source
document asks for it in its own production notes, and it is still outstanding:
Arabic, transliteration, translation, repetition counts, context and sources all
need a human check before publishing.

The cards being correct against the _supplied document_ is not the same as the
document being correct. This production verified the first and cannot verify the
second.

## Still open

- Scholarly sign-off on all seven.
- Style not named.
- ~~The captions need flattening.~~ **Done — `OUTPUT/CAPTION.md`.**
- No video. Images only, as asked.

## Captions (2026-08-24)

Fourteen blocks — Facebook and Instagram for each of the seven days — in
`OUTPUT/CAPTION.md`.

**Generated, not typed.** `work/captions.py` composes them from the same
`cards.json` the cards render from, so the Arabic, transliteration, translation,
timing and source are identical in the card and the caption by construction.
Only the human framing is hand-written. Retyping seven graded Arabic passages
into fourteen captions is exactly the sort of task that quietly introduces one
error.

Verified: **all 21 strings appear in both the captions and the source document**,
and the fourteen paste-blocks contain **no markdown characters at all** — the
source document's bold has been flattened, because platforms print asterisks
literally.

### The framing is what makes seven cards into seven posts

The Arabic is fixed, so the variation has to come from the opening line:

| day | title                                  |
| --- | -------------------------------------- |
| 1   | The Easiest Hundred You Will Ever Say  |
| 2   | The Sentence That Answers Who You Are  |
| 3   | What To Say Before You Leave The House |
| 4   | For The End Of A Heavy Day             |
| 5   | The Whole Day, Handed Over In One Line |
| 6   | Name Three Before You Check Your Phone |
| 7   | If You Only Memorise One, Make It This |

Every caption carries **Day N of 7**, which is the follow mechanism. Posting them
out of order or as a batch throws that away.

**Day 6 has the best ask** — "what are your three this morning?" — answerable in
three words by someone not confident writing about religion. **Day 7 is the
strongest and the longest**; if one gets boosted, that one.

Sources stay in every caption. They cost one line and they are the reason this
reads as teaching rather than as a quote graphic.

## Day 1 video — converted to 9:16, and DO NOT PUBLISH IT

`OUTPUT/0043-day1-subhanallah-9x16.mp4` — 1080x1920, 30.05 s. The conversion is
done and clean. **The video has a defect that makes it unpublishable as it
stands.**

### The conversion (this part is fine)

The supplied file was named "Vertical" and was **1920x1080 landscape** — the real
picture pillarboxed at **608x1080, x=656**, on white. Detected rather than
guessed: `cropdetect` on a negated copy and a per-column white test on a sampled
frame both returned `608:1080:656:0`.

608/1080 = **0.5630** against 9:16's 0.5625. The content was authored vertical and
only the container was wrong, so this is a crop and nothing is lost. Cropped,
scaled to 1080x1920, audio stream-copied. Edges verified clean — no bars remain.

### The defect

**The burned calligraphy on screen reads سبحاني — "Subḥānī" — where it must read
سبحان الله.**

The word **الله is absent**, and a yaa has been added to سبحان. That turns _"Glory
be to Allah"_ into, near enough, _"my glory"_.

Enlarged evidence: `work/DEFECT-burned-arabic-zoom.png`, three frames at 14, 15
and 16 s.

**The video's own subtitle track spells it correctly** — `سبحان الله وبحمده`. So
the picture and the subtitles inside the same file disagree with each other, which
is what a generated-calligraphy error looks like.

This is precisely the failure the I031 source document warned about in its own
production notes: _"do not rely on AI image/video models to generate Arabic."_
The seven cards in this production avoid it by rendering Arabic through a browser.
This video did not.

### What it would take

The picture is good and the recitation is right. Only the calligraphy is wrong,
and it is burned in, so it cannot be patched — it would have to be **covered** or
**re-rendered**. Covering it with correctly-rendered Arabic in the brand style is
free and local, and is the same technique used to fix 0034.

**Nothing about this is subtle to the audience.** A page that teaches Arabic
posting سبحاني in place of سبحان الله will be corrected in the comments within the
hour, and rightly.

## Published 2026-08-24 — Facebook, Instagram, YouTube, TikTok

**Only the Day 1 video is live.** `OUTPUT/0043-day1-subhanallah-9x16.mp4`, on four
platforms. The registry marks the production published because something of it is
live; the **seven cards are not posted** and still await the qualified review.

**It went out with the calligraphy defect known and in front of the decision.**
Raised in full before publishing — the burned text reads سبحاني where it must read
سبحان الله — and the user chose to publish. Recorded here so it is clear this was
decided rather than missed, and so anyone reading later has the context.

The fix does not expire. Covering the calligraphy with correctly-rendered Arabic
is free and local, and a corrected re-upload is a normal thing to do — platforms
do not penalise replacing a post. If a comment raises it, that is the answer
rather than a scramble.
