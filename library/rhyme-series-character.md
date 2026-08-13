# Rhyme series — recurring character reference

Copy this block verbatim into every rhyme-series prompt, and pass the master still
as `start_image` (or as an image reference for new scene stills). Written text alone
will **not** hold a face stable — the still is what does that.

## Johra (animated)

A cheerful Muslim girl aged **5**. Round soft face, **large warm brown eyes**, rosy
cheeks, wide happy smile. **Soft cream headscarf** framing the face. **Emerald-green
dress with gold trim at the cuffs.** Premium preschool 3D-animation look: soft
rounded forms, smooth clean surfaces, **no outlines**.

**Master still:** `productions/0033-alif-baa-taa-rhyme-10s-sung-test/work/stills/S0-johra-master.png`
(1536×2752, generated 2026-08-13, nano_banana_pro 2k, job `21e0f975`)

**Default setting:** bright simple playroom — pale cream wall in the upper frame,
warm wooden floor and soft rug below, a few plain cushion and ball shapes far out of
focus. Nothing competes with her.

## Two framing traps, both hit on the first attempt

1. **Pin the vertical frame explicitly.** Asking for `9:16` is not enough — the first
   master came back as 16:9 content letterboxed inside a 9:16 canvas, with blank
   bands top and bottom, which would have made veo animate the letterbox. Say:
   _"VERTICAL 9:16 composition that FILLS THE ENTIRE TALL FRAME from the very top
   edge to the very bottom edge — no letterboxing, no horizontal blank bands, no
   borders."_
2. **Avoid "full body" and "mouth open" on a child.** That combination returned
   `nsfw` (false positive, not charged). **"Shown from the waist up"** or **"from the
   knees up"**, upright, "singing joyfully" passes. This is the fourth such false
   positive — the filter dislikes full-body and low-to-the-ground descriptions of
   children.

## Also pin every time

- **Blank toys.** Ask for "every toy and block COMPLETELY BLANK and PLAIN, no
  markings, NO alphabet blocks" — a playroom invites lettered blocks, and AI letters
  come out garbled.
- No text of any kind; all on-screen type is composited locally with Pillow.
- No depiction of Allah, no religious iconography.
