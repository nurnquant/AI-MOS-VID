# 0040 — recitation with a soft bed · notes

Placeholder production, 2026-08-21. **0 credits.**

## The bed is in the recitation's own key

The reciter's pitch was measured before anything was synthesised: median F0
290.9 Hz across 1771 voiced frames, and the pitch-class weight came out
**D 36.6%, D# 25.9%, C 18.2%**.

D as tonic with a strong D# beside it is maqam behaviour — a neutral or flattened
second. So the pad is **root and fifth only, no third**. A major or minor third
would have argued with the maqam on every phrase. Root D (146.83 Hz) and fifth A
(220.25 Hz) are consonant against any of them.

`work/makepad.py` synthesises it: three soft partials per side, slight detune
between left and right for width, a slow 11-second swell so it never sits
perfectly still, one-pole low pass at 900 Hz, and four- and five-second fades.

## Ducking was tried and rejected on evidence

The first mix sidechained the pad to the voice, which is the right instinct and
what worked on 0036.

**It was wrong here.** This recitation is continuous with only **6.8 dB** of
dynamic range, so the pad stayed clamped for the whole take and measured **27 dB
below** the voice — present in the file, inaudible in the room. A bed that
measures correct and cannot be heard is not a bed.

Replaced with a steady calibrated level. Ducking needs gaps; there are none.

## The recitation was not touched, and that was verified

No EQ, no compression, no normalisation, no re-encode of the source.

Proven rather than asserted: subtracting the scaled pad from the finished mix
should return the original recitation. First attempt showed a 3.5 dB residual,
which looked like the voice had been altered — **it was the AAC encoder delay**,
measured at 239 samples (5.0 ms). After aligning, the residual is **-30.2 dB
relative to the voice**: the pad was added and nothing else changed.

Worth keeping: a verification that fails is not automatically a defect found. It
is equally often the check being wrong, and the way to tell is to explain the
number rather than accept or dismiss it.

## Worth raising once, then it is the user's call

**Instrumental music under Qur'anic recitation is something a part of this
audience will object to**, on a page whose whole business is teaching Qur'an. The
pad here is a wordless drone rather than a melody, which sits more comfortably
than a piano would, but it is still an instrument.

Two alternatives if that matters, both local and free:

- a **natural ambience** bed — soft wind, distant birds, room tone — which
  carries emotion without an instrument
- **no bed**, as 0039 shipped

Asked, not argued. The three mixes are ready either way.

## Still open

- ~~The surah is not identified.~~ **Identified 2026-08-21: Surat Al-Ahzab,
  ayah 35.** The user supplied the text, and it matches: whisper's garbled read
  contains recognisable distortions of this verse's distinctive paired plurals,
  in order — "المستمرين" for المسلمين, "الصادقان" for الصادقين, "الصاعدومين" for
  المتصدقين, "الخسائمين" for الخاشعين/الصائمين. Thirty words against a 29.56 s
  take also fits. Text filed at `source/al-ahzab-35.md`; production renamed.
  **No English translation supplied yet** — needed before any on-screen
  translation, same rule as 0039.
- Which of the three bed levels to keep.
- No video yet — this is audio only.
- Style not named.

## The video (2026-08-21)

`OUTPUT/0040-al-ahzab-35-4x5.mp4` — 30.00 s, **1080x1350 (4:5)**, zero credits.
Built with `/riwaq-audio-montage` and `/riwaq-ayah-overlay`.

Audio is the **raw supplied recitation**, not one of the bed mixes. The user
pointed at `source/recitation-source.mp4`, and the bed question is still open.

### The market image was declined, with reasons

The user offered a souk photograph to animate. It was not used, and the argument
is in the conversation and worth keeping:

- **Al-Ahzab 35 names men and women in parallel ten times.** That repetition is
  the verse's whole point. The market image has two women, small and mid-ground,
  behind a foreground of men trading. Thirty seconds of "and the believing
  women… and the truthful women…" over that reads as a contradiction.
- The verse is about devotion — prayer, fasting, charity, chastity, dhikr. A souk
  is about commerce. Only "the truthful" has an obvious trade link.
- It is **1376x768 landscape**. A 9:16 crop keeps 31% of the width and then needs
  a 2.5x upscale from 432 px; padding fills 69% of the frame with filler.
- 30 s of generated motion is 90 credits against a balance of 40.1.

The images used instead are the **textless originals** behind 0015, which show
men, women and children in devotion — the verse's own structure.

### 4:5, not 9:16, and the reason is the verse

Thirty words of Arabic plus a sixty-word translation need six lines each at 9:16
and swallow the picture completely. At 4:5 it is five lines and four, and the room
still reads. The 0015 sources are natively 928x1152 — **0.806 against 4:5's
0.800** — so the crop keeps 99% of the width.

### Phrase-level timing was attempted, verified, and abandoned

The intention was ten cards, one per pair, timed to the recitation. Energy
analysis found 19 candidate breaks; six spans were fitted to them by word count.

**Then each span was transcribed on its own to check it** — and the check failed.
By 23.76 s the reciter is only at _الصائمات_, where the fitted timing expected the
closing line. The drift grows through the take: this recitation is far slower at
the start than proportional, and whisper is too unreliable on a 41 kbps source to
correct for it.

So the whole verse is held on screen throughout, with only the English changing
at the halfway point. **A caption that is roughly right is worse than one that is
simply complete** — a viewer who sees the wrong phrase highlighted against sacred
audio notices, and there is no upside to risking it.

Recorded because the verification is the useful part: it cost ten minutes and
prevented shipping something subtly wrong.

### Legibility was tuned against the pictures, three passes

- **Heavy scrim** (the skill default): text perfectly readable, images erased —
  the frames came back as empty ceilings.
- **Light scrim at 0.45:** images beautiful, English unreadable over busy rooms.
- **0.78 with a 1.5x text shadow, scrim height 0.68:** both hold.

For Qur'anic text, legibility wins over seeing the sofa. The skill now takes
`CARD_SCRIM`, `CARD_SHADOW` and `CARD_SCRIM_H` so this is tunable rather than
hard-coded, which is a direct improvement from this production.

### No watermark and no end card

Consistent with 0039. Easy to add if wanted; the standing rule is that a
watermark stops before any end card.

## Reels cut (2026-08-21)

`OUTPUT/0040-al-ahzab-35-reel-9x16.mp4` — 1080x1920, 30 s.

The 4:5 version is a **Feed** format. Reels and Stories want 9:16, so both now
exist and each is correct for where it goes:

| file                             | ratio     | for                         |
| -------------------------------- | --------- | --------------------------- |
| `0040-al-ahzab-35-4x5.mp4`       | 1080x1350 | Facebook and Instagram feed |
| `0040-al-ahzab-35-reel-9x16.mp4` | 1080x1920 | Reels, Stories, TikTok      |

**The two cuts are laid out differently, because they had to be.** At 4:5 the
Arabic and the translation share the screen. At 9:16 that is twelve lines and
does not fit above the UI zone, so they alternate — Arabic for the first sixteen
seconds while it is being recited, translation for the rest. Six lines then nine,
both clear of the bottom fifth, verified against a marked frame.

**One honest cost:** the 9:16 crop takes 648 px of width from a 928 px source and
upscales 1.67x, so the Reel is softer than the feed cut. The 4:5 version keeps 99%
of the width and needs only 1.16x. If one of the two is the priority, the feed cut
is the better picture.
