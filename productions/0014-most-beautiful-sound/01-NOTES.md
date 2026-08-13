# 0014 — The Most Beautiful Sound · analysis of the delivered file

Written 2026-08-13 by measuring the delivered mp4, not from memory. Produced
2026-08-05 · style **1** (Cinematic Reverent) · 168 credits · $5.54 ·
**delivered, unpublished, unrated**.

This is the reference production behind the `/riwaq-story-video` skill.

## What the file actually is

`OUTPUT/0014-most-beautiful-sound-9x16.mp4`

|          |                                        |
| -------- | -------------------------------------- |
| Duration | **52.79 s**                            |
| Video    | h264, **720×1280**, 24 fps, ~2.55 Mbps |
| Audio    | aac, 48 kHz stereo                     |
| Size     | 16.9 MB                                |

Veo was asked for 768×1344 and delivered **720×1280**, as always.

## Measured structure

Scene cuts detected at 8.00, 15.21, 22.71, 28.71, 36.71 s; silence begins
44.70 s.

| Beat | In–out      | Length   | Content                                             | Speech                |
| ---- | ----------- | -------- | --------------------------------------------------- | --------------------- |
| 1    | 0.00–8.00   | 8.00     | mother makes dua over sleeping Maryam               | VO                    |
| 2    | 8.00–15.21  | 7.21     | Maryam brings the Qur'an, asks about the first word | two-speaker dialogue  |
| 3    | 15.21–22.71 | 7.50     | mother watches her trace the page                   | VO                    |
| 4    | 22.71–28.71 | 6.00     | online lesson, headphones, teacher on laptop        | none by design        |
| 5    | 28.71–36.71 | 8.00     | Maryam recites; mother stops in the hallway         | **Arabic recitation** |
| 6    | 36.71–44.70 | 7.99     | mother and daughter read together at bedtime        | VO                    |
| end  | 44.70–52.79 | **8.09** | animated brand end card + CTA overlay               | **silent**            |

Six story beats ≈ 44.7 s, then an 8-second end card. Audio sits at −21 to
−25 dB through the beats and fades 43 → 45 s.

## Verified now, by transcription

Whisper on the delivered mix confirms four of the five spoken lines match
`00-REQUEST.md` exactly:

- b1 "Every night I ask Allah to guide her, but who will teach her His words?"
- b2 "Mama, what was the first word Allah sent down?" / "Iqra… Read."
- b3 "I dream of her success in everything, but true success begins with a heart
  connected to Allah."
- b6 "Stories fade, toys break, but the words of Allah remain forever."

## Two findings for your ear-check

**1. The Scene-5 VO line appears to be missing.** The brief specifies a whispered
English line over the recitation beat: _"This… is the most beautiful sound a parent
can ever hear."_ It is the emotional pivot of the film and the source of its title.
Three transcription passes — including one with voice-activity filtering disabled
over 36–45 s — found only the beat-6 line there. **Listen for it.** If it is truly
absent, the fix is local and free: generate the line and mix it into beat 5.

**2. The recitation's opening word needs your ear.** Forced-Arabic transcription of
28.7–36.7 s returns:

- 27–31 s → `من الله الرحمن الرحيم` — i.e. it heard _"min Allah ar-Rahman
  ar-Raheem"_, **not** _"Bismillah ar-Rahman ar-Raheem"_
- 31–36 s → `الحمد لله رب العالمين` — **correct**, Alhamdu lillahi Rabbil-'alameen

The second half is right. The first half is **suspect, not proven wrong**: whisper
`small` over a music bed mishears, and "Bismi-" is exactly the kind of soft opening
syllable it drops. This is a judgement only your ear should make — which is why
this file has been held unpublished.

**3. The end card is silent for 8.09 s** — 15% of the runtime, and the last thing
a viewer hears is nothing. The music fades out at 43–45 s instead of carrying
under the card. Fixable locally at no credit cost, and worth doing before publish.

## Cost, reconstructed

168 credits / $5.54 = **7 nano_banana_pro stills** (S0 master + 6 scene stills, 2 cr
each) + **7 veo-3-1-fast clips** (22 cr each). Six clips are in the cut;
`clip4-learning` was re-rolled as `clip4b-learning`, so one clip of the seven —
22 credits — was discarded.

Files still on disk: `work/stills/S0-master.png` … `S6-bedtime.png`,
`work/clips/clip1…clip6`, `work/watermark.png`, `work/endcard-tagline.png`, and
`work/frames/` holding the verification frames taken at the time (`fin-*` for the
final cut, `wm-*` for watermark placement, `c2-*` and `c4b-*` for specific beats).

## What the process was

Reverse-engineered from `00-REQUEST.md`, the artefacts on disk, and the measured
file. Now written up as a reusable pipeline in
`.claude/skills/riwaq-story-video/SKILL.md`.

1. Brief with numbered beats, exact spoken lines, per-beat camera, and audio rules.
2. One **master still** of the cast, then one **scene still per beat** generated
   with the master as image reference — this is what holds faces consistent.
3. One **veo-3-1-fast** clip per beat, each using its scene still as `start_image`.
4. Two-speaker beats pin **STRICT SPEAKING ORDER** and lip movement.
5. Whisper-verify every spoken line; RMS-check every clip for an unwanted music bed.
6. Trim, concat, rotate the watermark per beat, append the brand end card.
7. Frame-extract at each speech beat and each watermark position to confirm.

## Open

- Your ear-check on findings 1 and 2 above.
- The silent end card.
- Unrated, unpublished.
