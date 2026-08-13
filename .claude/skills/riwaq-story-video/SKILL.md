---
name: riwaq-story-video
description: Produce a Riwaq Al Ilm cinematic story video from a brief — master still, per-beat scene stills, veo image-to-video clips, verified dialogue and recitation, local soundtrack, watermark, brand end card, tracking. Use for any narrative video request (style 1), and read it before spending credits on veo.
---

# Riwaq story video

Reverse-engineered from **0014 The Most Beautiful Sound** (52.8 s, 168 credits,
$5.54), with the corrections learned from 0022 and the rejected 0024 folded in.
Analysis of the reference file: `productions/0014-most-beautiful-sound/01-NOTES.md`.

**This is the expensive pipeline.** A 50-second piece costs **150–230 credits
($5–8)**, most of it in veo clips at **22 credits per 8-second clip**. Re-rolling
one clip costs 22. So the order below front-loads everything cheap: the brief, the
stills, the verification plan.

> **Before anything: is this a song?** A brief that says song, rhyme, sing-along,
> nasheed, chorus or verse needs **real sung vocals**. **Never substitute a spoken
> read** — that is what got 0024 rejected.
>
> **Veo can sing.** Proven by 0033: pin the lyric as sung and veo returns a genuine
> child singing voice with a melody (18.1-semitone pitch spread, 29 held notes in
> 8 s). This is the one case where veo's audio is **kept**, not discarded.
>
> **For a rhyme, reach for `gemini_omni` (Gemini Omni Flash) instead of veo.**
> Proven on 0034: **4–10 s in a single clip** with native audio, so a 10 s piece needs
> no stitching, and it **honours a written cut list** — a three-scene prompt produced
> measured cuts at 3.50 s and 6.54 s, where veo gave one locked-off shot. 30 credits
> for 10 s.
>
> **Generated vocals cannot be trusted with Arabic letter names. Do not try.**
> Four attempts across two models and three spellings — prose rule, `AH-lif`,
> `AL-if`, plain `Alif` — every one rendered as Elef, Ahlif or Elif. Changing the
> spelling also perturbs the picture: 0034 v3 lost one of its three cuts. Budget
> **zero** further attempts at steering pronunciation; get the vocal supplied and use
> the model for picture only, muxing locally at no credit cost.
>
> Open trade-off: veo's singing was far more melodic (18.1-semitone spread) than Omni
> Flash's (5.7, which is speech range and may be chanting). If the user's ear says
> chant, use a supplied sung vocal with Omni Flash for picture.
>
> **Both models draw text you did not ask for.** Omni Flash rendered garbled "UXely"
> across the last 1.6 s of 0034 despite three prohibitions. Plan a locally-composited
> card that can cover that region, and make it **fully opaque before** the garbage
> appears — a slow alpha fade let it show through. See `library/STYLES.md`.

## 1. Brief with numbered beats — do this properly, it is free

0014's brief is the model (`productions/0014-most-beautiful-sound/00-REQUEST.md`).
It carries, per beat: timing, what happens, **the exact words spoken**, the camera
move, and the audio rule. Plus a cast block fixing each character's age, clothing
and face.

Non-negotiable in the brief:

- **Exact spoken lines, verbatim.** They become the pinned prompt text and the
  thing whisper is checked against. A line you did not write down cannot be
  verified, and 0014 shipped with its Scene-5 line apparently missing.
- **One language rule.** 0014: everything English except one pinned Arabic
  recitation. Mixed-language improvisation is where mispronunciation enters.
- **Beat count × 8 s ≈ runtime.** Veo clips are 8 s. Six beats ≈ 48 s of story.
- Name the **style number** (see `library/STYLES.md`) or ask before producing.

Intake and register it:

```bash
python3 scripts/social/productions.py --intake
python3 scripts/social/productions.py --set 0033 --style 1 --status in-progress
```

## 2. Master still first, then one scene still per beat

This is what holds faces consistent, and it is cheap — **2–4 credits per still**.

```
model: nano_banana_pro   aspect: 9:16   resolution: 2k or 4k  ← pass explicitly
```

1. **S0 master**: the cast together, clearly lit, faces unobstructed. If the user
   supplied a character photo (`suppliedMedia/Johra.jpeg`), pass it as an image
   reference so the child is theirs, not invented.
2. **One still per beat**, each generated with **S0's job_id as image reference** so
   the same faces carry through. Name them `S1-…` … `S6-…` after the beat.

Prompt rules, all learned the hard way:

- **No text anywhere.** Veo and nano_banana garble lettering, Arabic worst. All
  on-screen text is Pillow-composited later.
- **No depiction of Allah**, pinned negatively.
- **Describe children upright** — standing, sitting, kneeling, crouching. "Lying",
  "reclining" and "low to the ground" trip the `nsfw` filter (three false
  positives so far, none charged).
- Say **resolution explicitly**; it silently defaults to 1k, which is where the
  rejected 0024's soft footage came from.

## 3. Clips: one veo call per beat, from that beat's still

```
model: veo3_1   variant: veo-3-1-fast   duration: 8   aspect_ratio: 9:16
medias: [{role: start_image, value: <that beat's still job_id>}]
declined_preset_id: 24bae836-2c4a-48e0-89b6-49fcc0b21612
```

- **`veo-3-1-fast`, 22 credits.** `veo-3-1-preview` is better and dearer — use it
  only when the user asks for maximum quality and knows the cost.
- **The preset interceptor fires** on warm or night prompts, refusing the whole
  batch with a recommendation. Retry with `declined_preset_id` above; it is not a
  failure and costs nothing.
- **Veo delivers 720×1280**, whatever you asked for.

For any beat with two people speaking, pin the order explicitly:

```
STRICT SPEAKING ORDER: FIRST <A> speaks the line "<exact words>", lips clearly
moving, while <B> listens with mouth closed. THEN <B> replies "<exact words>".
```

Without this, the wrong character's lips move — it happened on 0006 and 0009 and
the user caught both.

## 4. Audio: decide per beat whether veo's audio survives

This is the one place 0014 and 0022 legitimately differ, so decide deliberately:

| Case                                                                            | What to do                                                              |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Beat carries **veo-generated dialogue** (0014's mother and daughter)            | **Keep** the clip audio. The performance is in it.                      |
| Beat should be **ambient only**, or the narration is a separate TTS read (0022) | **Discard** all clip audio with `-an` and build the soundtrack locally. |

Veo adds a music bed even when the prompt forbids it — measured on 0022, 0024 and 0031. Genuine room tone sits at **−40 to −46 dB**; anything at **−17 to −27 dB**
has music or speech in it. Loudness alone cannot tell music from dialogue, so judge
per beat and whisper-verify whatever you keep.

Local, free soundtrack pieces:

- **Reverent piano** — `scripts/social/piano.m` (Apple DLS, Obj-C; the host's Swift
  cannot build against the installed SDK).
- **Children's marimba** — `scripts/social/kidsmusic.m`.
- Never pass off a synthesised drone as music. That was penalised once already.

If narration is TTS, record **one continuous read**, never stitched fragments with
fixed silences — that was half of why 0022 v1 was rated 2/5. Audition voices on the
real script: on 0024 only one preset of three pronounced "Alif" correctly.

## 5. Assemble

```bash
# per beat: scale, fps, trim, and -an only where audio is being discarded
ffmpeg -v error -y -i clips/b1.mp4 -an \
  -vf "scale=720:1280,fps=24,trim=duration=8,setpts=PTS-STARTPTS,format=yuv420p" \
  -c:v libx264 -crf 18 -preset medium seg/b1.mp4
```

Then, in one filter graph: overlay the Pillow cards, overlay the rotating
watermark, mix the audio, and append the end card.

Rules that each cost a rebuild when broken:

- **Filter concat, never the demuxer**, when joining the body to the end card. The
  demuxer drops a silent audio track and desyncs — 0022 shipped 64.5 s of video
  against 59.5 s of audio.
- **Card PNGs need `-loop 1 -framerate $FPS -t <dur>`** or they flash for one frame.
- **Watermark rotates per beat**, always clear of faces and of any text the footage
  already carries. If the source has its own burnt-in text, fix the watermark to the
  opposite region for the whole clip instead of rotating.
- **Carry the music under the end card.** 0014 ends with **8.09 s of silence** —
  15% of its runtime, and the last thing a viewer hears is nothing.
- Use `if … then … fi`, not `[ test ] && var=x`, inside `set -euo pipefail` scripts;
  the latter silently aborts the loop.
- zsh does not word-split unquoted variables — quote everything in loops.

## 6. Verify by measurement, then by eye and ear

```bash
python3 .claude/skills/riwaq-story-video/scripts/checkvideo.py \
  --video productions/0033-*/OUTPUT/0033-*-9x16.mp4 \
  --clips productions/0033-*/work/clips \
  --grid /tmp/beats.png
```

Reports duration, A/V desync, measured scene cuts, per-beat volume, silence runs, a
one-frame-per-beat contact sheet, and per-clip loudness. Exits non-zero on a hard
problem, so an assembly script can gate on it.

Measurement is not review. Then, by hand:

- **Whisper every spoken line** against the brief. For non-English recitation run a
  **forced-language pass** (`language="ar"`) — a mixed-language file gets detected as
  English and the Arabic comes back translated, which hides mispronunciation.
- **Check for MISSING lines**, not just wrong ones. Run one pass with
  `vad_filter=False` over the beat in question. 0014's Scene-5 VO — the line the
  film is named after — appears to be absent, and nothing but a transcript caught it.
- **Frame-check lips** on every two-speaker beat: is the right character speaking?
- **Frame-check the watermark** at each position.
- Suspect syllables are the user's call, not whisper's: on 0014 whisper heard "min
  Allah" where "Bismillah" was pinned. Report it as needing an ear, not as broken.

Whisper runs inside HField's `sandbox_exec`, which has `faster-whisper` preinstalled.
The sandbox is **fresh on every call**, so download the audio inside the same script,
and run it with `nohup … &` then poll, because a cold model load exceeds the 60 s
call limit.

## 7. Caption, cost, notes, tracking

```bash
python3 scripts/social/productions.py --set 0033 --status delivered
```

Write `OUTPUT/CAPTION.md` per platform, add a `ProductionCost` row to
`costTracker/social-media-tracker.xlsx` (header row 3; back it up first; production
number in `ID`), and write `01-NOTES.md` recording the beat table, what was
verified, and every known defect left in.

**Never invent a rating.** "Nice" is not a 1–5. Never scan live social accounts.

## Cost model

| Item                                            | Credits       |
| ----------------------------------------------- | ------------- |
| Still, 2k/4k                                    | 2–4           |
| Clip, `veo-3-1-fast` 8 s                        | **22**        |
| TTS read                                        | ~1            |
| Music, cards, watermark, assembly, verification | **0** — local |

0014: 7 stills + 7 clips (one discarded) = 168 cr / $5.54 for 52.8 s.
Budget **~30 credits per second of finished video**, and tell the user the estimate
before starting.

## Related

- `productions/0014-most-beautiful-sound/01-NOTES.md` — the measured reference
- `library/STYLES.md` — style 1 spec, and the song/sung-vocals hard rule
- `/riwaq-image-post` — the cheap sibling for static posts (4 credits)
