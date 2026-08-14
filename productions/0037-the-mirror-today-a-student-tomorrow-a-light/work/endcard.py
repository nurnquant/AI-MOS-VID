#!/usr/bin/env python3
"""0037 end card — the brief's closing line over the brand tag."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
W, H = 720, 1280
GEO = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
GEO_I = "/System/Library/Fonts/Supplemental/Georgia Bold Italic.ttf"
CREAM = (247, 244, 236, 255)
GOLD = (222, 184, 118, 255)

card = Image.open(HERE / "tag-base.png").convert("RGBA")
d = ImageDraw.Draw(card)


def wrap(text, font, maxw):
    out, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if d.textlength(t, font=font) <= maxw:
            cur = t
        else:
            out.append(cur); cur = w
    out.append(cur)
    return out


# The brief's own closing line, in the empty upper third of the tag.
f_big = ImageFont.truetype(GEO, 44)
f_sm = ImageFont.truetype(GEO_I, 34)

y = 108
for ln in wrap("Today, a student.", f_big, W - 110):
    d.text(((W - d.textlength(ln, font=f_big)) / 2, y), ln, font=f_big, fill=CREAM)
    y += 56
y += 6
for ln in wrap("Tomorrow, a source of light for others.", f_sm, W - 120):
    d.text(((W - d.textlength(ln, font=f_sm)) / 2, y), ln, font=f_sm, fill=GOLD)
    y += 44

card.convert("RGB").save(HERE / "endcard.png")
print("endcard.png written")
