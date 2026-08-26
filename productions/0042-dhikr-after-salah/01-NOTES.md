# 0042 — Dhikr After Salah · notes

Supplied finished and filed as delivered, 2026-08-24. **0 credits.**
`source/dhikr-after-salah.mp4` — 1920x1080, 30 fps, 30.05 s, with an embedded
`mov_text` subtitle track (extracted to `source/embedded-subtitles.srt`).

## The content is sound

The three adhkar are the standard post-salah remembrance, in the usual order:

1. Astaghfirullāh, three times
2. Allāhumma Antas-Salāmu wa minkas-salām, tabārakta yā Dhal-Jalāli wal-Ikrām
3. Lā ilāha illallāhu waḥdahu lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa Huwa
   ʿalā kulli shayʾin qadīr

Transliteration in the caption is taken verbatim from the video's own subtitle
track, so what is written matches what is heard and shown.

## Read this before it is published

**The imagery invites a reading nobody intended.** A solitary bearded man in
white robes and a head covering, riding a **white horse**, eyes lowered, moving
toward a vast glowing tree in an otherworldly landscape.

White horse, robed figure, luminous ascent — a meaningful part of a Muslim
audience will read that as an attempt to depict the Prophet ﷺ, or an allusion to
the Isrāʾ and Miʿrāj. Depicting the Prophet is impermissible in mainstream Sunni
practice, and for an academy teaching Qur'an the accusation costs as much as the
act.

**This is not a claim that the video does depict him.** It is that the visual
grammar points there, and a viewer who lands on it mid-scroll has only the
grammar to go on.

Second, smaller: the glowing orbs and swirling magical tree read as fantasy
rather than reverence. It is the opposite of the grounded, warm rooms in the rest
of the library.

**Raised before publishing; the user decided to keep it as is** (2026-08-24) and
it went out on four platforms. Recorded so it is clear this was a decision taken
with the concern in front of it, not something nobody noticed. Nothing further to
do unless the comments say otherwise — in which case this note is the starting
point, not a surprise.

## It is also the wrong shape

**1920x1080 landscape.** Everything the account publishes is 9:16 or 4:5. A 9:16
crop keeps 31% of the width; padding fills 69% of the frame. Same constraint that
came up on the market image, and there is no cheap fix — the composition is built
for a wide frame.

## Supplied but empty

`work/in-EMPTY-as-supplied.md` was moved across as the intended post description.
**It is zero bytes.** The caption in `OUTPUT/CAPTION.md` was written from the
video's own subtitle track instead. If there was meant to be text in that file,
send it and the caption gets replaced.

## Still open

- The imagery review above.
- Who made it, and whether it is ours to publish.
- Style not named.

## Published 2026-08-24 — Facebook, Instagram, YouTube, TikTok

Kept as supplied. Four platforms, the same spread as 0039 and 0040, which makes
its number directly comparable to theirs.

### What this one actually tests

It is the first **landscape** piece published, against a library of 9:16 and 4:5.
Every other measured production is vertical.

So the number answers a question worth knowing: **how much does aspect ratio
cost?** If a 1920x1080 video on Reels and TikTok lands anywhere near 0039's 138
or 0040's 185 reactions per day per platform, the vertical-first rule is worth
less than assumed. If it lands far below, that is the cost of the wrong shape,
measured rather than argued.

It is also a short Islamic reminder, the category that holds the top three
places, so category and format are separable here for once.

**Rate it in 24 h** with `--reactions N --visitors N`. Also worth splitting by
platform if the numbers are available: YouTube and TikTok treat landscape very
differently from Reels, and an average across four would hide that.

## Why it did not show on the dashboard, and the fix

The video was filed only in `source/`, and the dashboard scans **`OUTPUT/`**
alone — `deliverables()` in `productions.py` looks nowhere else. So 0042 showed
"no output yet" and had no preview.

Corrected to match the convention every other supplied-finished production uses
(0017, 0018, 0019): the original stays untouched in `source/`, and the deliverable
sits in `OUTPUT/` under the production number.

`OUTPUT/0042-dhikr-after-salah-16x9.mp4` is a **byte-for-byte copy** of the
source. Nothing was re-encoded — there was nothing to change, and re-encoding a
finished file to make it appear in a listing would cost quality for no reason.

Checked the rest of the tree at the same time: **no other delivered or published
production is missing its media from OUTPUT/.** This was the only one.

## Marked AI-ONLY · editor 4/5 (2026-08-24)

`provenance: ai-only` in the registry, shown as a red pill on the dashboard card.

**Why the field exists.** It is the first production in the library with no human
element at all — no filmed footage, no recorded voice. 0039, 0040 and 0041 all
carry Ustadh Abdul Baset Nadim's voice, and that is the thing a competitor cannot
copy. Knowing which pieces have it and which do not is a real distinction, not
bookkeeping.

**It also matters for disclosure.** Meta requires AI-generated content to be
labelled where it is photorealistic, and enforcement is at the platform's
discretion. A production marked `ai-only` is one where that question has to be
answered before publishing, rather than discovered afterwards.

**Only 0042 is tagged so far.** The others could be marked `human-voice` on the
same basis — the user has stated the reciter for three of them — but nothing has
been tagged that the user did not say out loud.

## Engagement: 140 reactions, visitors 3/5 — and it answered its question

**18 reactions per day per platform.** The lowest of any short Islamic reminder in
the library by a wide margin, against 117 to 232 for the four vertical ones.

This is the release that was framed as a test of what aspect ratio costs, and it
returned a clear number: **vertical mean 168 against 18. Roughly ten times.** Even
the weakest vertical piece is 6.7x this one.

**The bias runs the right way.** 0042 was counted at two days and the others at
one; reach front-loads, so a two-day average is usually the lower figure. The gap
is if anything understated.

**Two things stay confounded and should not be glossed.** 0042 is also the only
`ai-only` production, and its imagery drew a flag before publishing — the robed
figure on a white horse — which could suppress sharing by itself. Format is the
most plausible driver because the mechanism is known: Reels and TikTok are
vertical surfaces and a 16:9 video is letterboxed into a strip. But one release
cannot separate three variables.

**What it is worth:** supplied landscape footage is now known to be expensive.
Reframe before publishing, or keep it off Reels and TikTok. That is a real
decision rule bought for one post.
