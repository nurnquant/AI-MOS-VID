# Production plan — "The Dream of Every Parent" (45s, 9:16)

Source: `storyToCreate/Riwaq Al Ilm --- "The Dream of Every Parent".md`
Model: **veo3_1 fast** (most realistic + native dialogue audio). 720x1280 actual
(ffprobe before concat — Veo claims 768x1344).
Pipeline: nano_banana_pro master still → scene stills (image reference) →
veo3_1 image-to-video per scene (start_image) → local concat + end card.
Preflight every job with `get_cost:true`. If "IN THE DARK" preset interceptor
fires (night/warm scenes likely), retry with `declined_preset_id`.

## Character lock (goes in every prompt)

Father: Middle-Eastern man, late 30s, short black beard, warm brown eyes,
olive skin, navy henley shirt. Son: boy age 6, curly dark hair, green
pajamas. Home: warm modern apartment, emerald-and-gold accents, soft lamp
light, Quran on wooden shelf.

## Stills (nano_banana_pro, 2cr each)

- S0 master: father + son portrait in living room (character lock source)
- S1..S7: one per clip below, via image reference to S0

## Clips (veo3_1 fast, 8s, 22cr each — ALL dialogue pinned: "speaks IN

ENGLISH ONLY except the Arabic greeting in clip 6")

1. **Hook (0–6 final)** — Father stands in doorway at night watching son
   sleep on couch; slow push-in; visible in room: graduation cap on shelf,
   stethoscope on hook, laptop, Quran on shelf. Audio: heartbeat + soft
   piano, no speech. (Hook on-screen text rendered LOCALLY, drawtext —
   never AI text.)
2. **Scene 1 (3–8)** — Father alone at dining table, late night, gazes at
   sleeping son. Inner-voice VO (English): "I want him to succeed. I want
   him to become someone great."
3. **Scene 2 (8–14)** — Dream montage: son in white doctor's coat with
   stethoscope; son as engineer with hard hat over blueprints; son in
   graduation gown receiving diploma. VO: "A doctor... An engineer...
   A leader..."
4. **Scene 3 (14–20)** — Close on father's face, dream imagery fades to
   dark, he looks at the Quran on shelf. VO: "But one day... who will
   teach him about Allah?"
5. **Scene 4 (20–28)** — Son awake, pads over, tugs father's sleeve.
   Son (English): "Baba, can you teach me?" Father smiles, pulls him
   close: "Let's learn together."
6. **Scene 5 (28–36)** — Laptop on desk, warm-faced male teacher in white
   thobe on screen video call, son seated with father behind. Teacher:
   "Assalamu Alaikum, my dear student." Son, beaming: "Wa Alaikum
   Assalam!" (the ONLY Arabic — greeting phrase exact, no other Arabic).
7. **Scene 6 (36–42)** — Golden-hour shot, father and son reading Quran
   together on couch. VO: "Success is not only about a career. Success is
   also about faith, character, and a heart connected to Allah."

## Assembly (local ffmpeg)

- Trim clips to slot durations above (~40s story), concat.
- Hook text overlay (drawtext, Georgia, cream + shadow):
  "Every parent dreams of their child's future..." then
  "...but what if we're forgetting the most important part?"
- End card = ANIMATED (DONE): `endcard-animated-720x1280.mp4` — supplied
  `suppliedMedia/pomelli_creative_video_9_16_0803.mp4` (official animated
  logo arch, 8s, silent) + CTA overlay `cta-overlay.png` faded in at 1s.
  Append after story; total ≈ 48s. Add soft piano tail or silence
  (anullsrc) over end segment at concat. Static
  `endcard-720x1280.png` kept as fallback.
- Watermark: offer, apply on request.
- Output: `renders/dream-of-every-parent/riwaq-dream-of-every-parent-9x16.mp4`
- User must verify greeting audio in clip 6 before publishing.

## Cost estimate

8 stills × 2cr = 16cr; 7 clips × 22cr = 154cr. **Total ≈ 170cr ≈ $5.60**
(Ultra ≈ $0.033/cr), excluding re-rolls.

## After production

Append one row to ProductionCost tab (ONLY that tab) in
`costTracker/social-media-tracker.xlsx`, cols C–L incl. model `veo3_1 fast`,
storyBook = `Riwaq Al Ilm --- "The Dream of Every Parent".md`.
