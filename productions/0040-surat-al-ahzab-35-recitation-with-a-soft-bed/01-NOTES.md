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
