#!/usr/bin/env python3
"""
0034 cards: the Arabic Alif teaching card, and the wordmark watermark.

The Alif card has two jobs. It delivers the teaching visual the rhyme needs, and
it **covers a generation defect**: Omni Flash rendered garbled pseudo-text
("UXely") in the upper right from ~8.4s to the end, despite the prompt forbidding
text three ways. The card is sized and placed to hide it completely.

Arabic is rendered locally with GeezaPro. Never ask a model for Arabic letters.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

HERE = Path(__file__).parent
W, H = 720, 1280

AR = "/System/Library/Fonts/GeezaPro.ttc"
GEO_B = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
GOLD = (214, 176, 106)
CREAM = (250, 247, 238)
EMERALD = (10, 46, 36)


def shape(t: str) -> str:
    return get_display(arabic_reshaper.reshape(t))


def alif_card() -> None:
    """Covers x 210-710, y 80-360 — the region the garbled text occupies."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    box = (210, 80, 710, 360)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((box[0] + 6, box[1] + 8, box[2] + 6, box[3] + 8), 46,
                        fill=(0, 0, 0, 70))
    d.rounded_rectangle(box, 46, fill=CREAM + (252,), outline=GOLD + (255,), width=6)
    img.alpha_composite(layer)

    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(AR, 190)
    s = shape("ا")
    b = d.textbbox((0, 0), s, font=f)
    cx = (box[0] + box[2]) // 2
    d.text((cx - (b[2] - b[0]) // 2 - b[0] - 70, box[1] + 40), s, font=f, fill=EMERALD)

    f2 = ImageFont.truetype(GEO_B, 62)
    b2 = d.textbbox((0, 0), "Alif", font=f2)
    d.text((cx - (b2[2] - b2[0]) // 2 - b2[0] + 60, box[1] + 120), "Alif",
           font=f2, fill=EMERALD)
    img.save(HERE / "card-alif.png")
    print("card-alif.png")


def watermark() -> None:
    wm = Image.new("RGBA", (420, 80), (0, 0, 0, 0))
    d = ImageDraw.Draw(wm)
    f = ImageFont.truetype(GEO_B, 30)
    d.text((3, 3), "Riwaq Al Ilm", font=f, fill=(0, 0, 0, 110))
    d.text((0, 0), "Riwaq Al Ilm", font=f, fill=GOLD + (200,))
    wm.crop(wm.getbbox()).save(HERE / "watermark.png")
    print("watermark.png")


if __name__ == "__main__":
    alif_card()
    watermark()
