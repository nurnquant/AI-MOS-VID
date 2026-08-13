#!/usr/bin/env python3
"""0036 — burn-in captions and the follow-ask card.

Every spoken line is also on screen. Facebook autoplays muted, so a piece whose
argument only exists in the audio has no argument for most of its viewers.

Text is composited here with Pillow, never with ffmpeg drawtext — the host
ffmpeg has no drawtext filter (see CLAUDE.md).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 720, 1280
HERE = Path(__file__).parent
OUT = HERE / "cards"
OUT.mkdir(exist_ok=True)

GEORGIA = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
GEORGIA_I = "/System/Library/Fonts/Supplemental/Georgia Bold Italic.ttf"
CREAM = (247, 244, 236, 255)
GOLD = (214, 178, 106, 255)

# Reels and Stories put their own furniture over the bottom fifth, so nothing
# that has to be read may sit below this line.
SAFE_BOTTOM = 1050


def wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=font) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def card(name, text, size=46, center_y=930, italic=False, scrim=0.55):
    """One caption. Scrim is drawn only behind the text block, not full-frame:
    a full-frame wash flattens the footage and these shots are the product."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(GEORGIA_I if italic else GEORGIA, size)
    lines = wrap(d, text, font, W - 96)
    lh = int(size * 1.34)
    block_h = lh * len(lines)
    top = center_y - block_h // 2

    if top + block_h > SAFE_BOTTOM:                 # never let text into the UI zone
        top = SAFE_BOTTOM - block_h

    pad_x, pad_y = 34, 26
    widest = max(d.textlength(ln, font=font) for ln in lines)
    box = [(W - widest) / 2 - pad_x, top - pad_y,
           (W + widest) / 2 + pad_x, top + block_h + pad_y]
    veil = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(veil).rounded_rectangle(box, radius=26,
                                           fill=(6, 20, 14, int(255 * scrim)))
    img = Image.alpha_composite(img, veil)
    d = ImageDraw.Draw(img)

    y = top
    for ln in lines:
        x = (W - d.textlength(ln, font=font)) / 2
        d.text((x + 2, y + 2), ln, font=font, fill=(0, 0, 0, 150))   # lift off the plate
        d.text((x, y), ln, font=font, fill=CREAM)
        y += lh
    img.save(OUT / f"{name}.png")
    return OUT / f"{name}.png"


# The hook and the turn sit high and large: they carry the whole piece for a
# muted viewer, and the first 1.5 s is where a scroll is won or lost.
card("t1", "You think you're not teaching your child deen.", size=58, center_y=430)
card("t2", "You are. You just don't count it.", size=58, center_y=430)
card("t3", "Bismillah before you left the house. They heard it.")
card("t4", "Alhamdulillah when you were exhausted.")
card("t5", "You apologised when you were wrong.")
card("t6", "Dua out loud when the news was bad.")
card("t7", "They learn deen the way they learned to talk. From you.",
     size=50, center_y=900)

# --- follow-ask, composited into the empty upper third of the brand tag ---
tag = Image.open(HERE / "tag-base.png").convert("RGBA")
d = ImageDraw.Draw(tag)
f_big = ImageFont.truetype(GEORGIA, 40)
f_sm = ImageFont.truetype(GEORGIA_I, 33)
f_cta = ImageFont.truetype(GEORGIA, 36)

y = 96
for ln in wrap(d, "Episode 2: the four words that teach tawakkul.", f_big, W - 110):
    d.text(((W - d.textlength(ln, font=f_big)) / 2, y), ln, font=f_big, fill=CREAM)
    y += 50
y += 8
for ln in wrap(d, "You already say three of them.", f_sm, W - 110):
    d.text(((W - d.textlength(ln, font=f_sm)) / 2, y), ln, font=f_sm, fill=GOLD)
    y += 42
y += 14
cta = "Follow so you catch it."
d.text(((W - d.textlength(cta, font=f_cta)) / 2, y), cta, font=f_cta, fill=CREAM)

tag.convert("RGB").save(HERE / "tag.png")
print("cards + tag written")
