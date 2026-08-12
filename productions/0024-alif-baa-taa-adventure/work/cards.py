#!/usr/bin/env python3
"""
Style 7 text cards for 0024 — Alif, Baa, Taa Adventure.

All text is rendered HERE, locally, and composited by ffmpeg later. Nothing
textual is ever asked of the image/video models: they garble Arabic and cannot
be relied on for English either.

Host constraints that shaped this:
  * ffmpeg has no drawtext / libass, so text must arrive as RGBA PNGs
  * Pillow has no raqm on this host, so harakat cannot stack — isolated letter
    forms only, which is exactly what an alphabet rhyme needs anyway
  * GeezaPro.ttc is the Arabic face; Georgia carries the English
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

W, H = 720, 1280
HERE = Path(__file__).parent

AR = "/System/Library/Fonts/GeezaPro.ttc"
GEO = "/System/Library/Fonts/Supplemental/Georgia.ttf"
GEO_BI = "/System/Library/Fonts/Supplemental/Georgia Bold Italic.ttf"
GEO_B = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"

GOLD = (214, 176, 106, 255)
CREAM = (247, 243, 233, 255)
EMERALD = (10, 46, 36, 255)
WHITE = (255, 255, 255, 255)


def shape(text: str) -> str:
    """Arabic must be reshaped and bidi-ordered before Pillow sees it."""
    return get_display(arabic_reshaper.reshape(text))


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def fit(path: str, text: str, size: int, max_w: int) -> ImageFont.FreeTypeFont:
    """Shrink until the line fits. Georgia Bold Italic at 60pt overflowed 720px."""
    probe = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    while size > 20:
        f = font(path, size)
        b = probe.textbbox((0, 0), text, font=f)
        if (b[2] - b[0]) <= max_w:
            return f
        size -= 2
    return font(path, size)


def centre(d: ImageDraw.ImageDraw, y: int, text: str, f, fill, shadow=True):
    x0, y0, x1, y1 = d.textbbox((0, 0), text, font=f)
    x = (W - (x1 - x0)) // 2 - x0
    if shadow:
        d.text((x + 3, y + 3), text, font=f, fill=(0, 0, 0, 120))
    d.text((x, y), text, font=f, fill=fill)
    return y1 - y0


def scrim(img: Image.Image, top: int, bottom: int, strength: int = 150):
    """Soft vertical scrim so text survives a bright classroom."""
    g = Image.new("L", (1, H), 0)
    px = g.load()
    for y in range(H):
        if top <= y <= bottom:
            span = max(bottom - top, 1)
            t = (y - top) / span
            edge = min(t, 1 - t) * 2          # 0 at edges, 1 in the middle
            px[0, y] = int(strength * min(edge * 1.6, 1.0))
    mask = g.resize((W, H))
    layer = Image.new("RGBA", (W, H), EMERALD[:3] + (255,))
    layer.putalpha(mask)
    img.alpha_composite(layer)


def panel(img: Image.Image, box, radius: int = 46, fill=(247, 243, 233, 238),
          border=(214, 176, 106, 255), width: int = 5):
    """A cream rounded card. Keeps the classroom bright instead of darkening it."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = box
    d.rounded_rectangle((x0 + 5, y0 + 7, x1 + 5, y1 + 7), radius, fill=(0, 0, 0, 60))
    d.rounded_rectangle(box, radius, fill=fill, outline=border, width=width)
    img.alpha_composite(layer)


def dot_row(d: ImageDraw.ImageDraw, cy: int, n: int, above: bool):
    """Draw the letter's actual dots, so the count is visual, not just words."""
    if not n:
        return
    r, gap = 13, 46
    total = (n - 1) * gap
    for i in range(n):
        cx = W // 2 - total // 2 + i * gap
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=GOLD, outline=EMERALD, width=3)


def letter_card(name: str, arabic: str, translit: str, line: str, dots: int,
                above: bool = True):
    """The teaching card: big Arabic letter on a cream panel, dots drawn as dots."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    panel(img, (150, 210, 570, 700))
    d = ImageDraw.Draw(img)

    f = font(AR, 250)
    s = shape(arabic)
    x0, y0, x1, y1 = d.textbbox((0, 0), s, font=f)
    x = (W - (x1 - x0)) // 2 - x0
    d.text((x, 300), s, font=f, fill=EMERALD)

    centre(d, 570, translit, font(GEO_BI, 78), (10, 46, 36, 255), shadow=False)
    if above:
        # counting markers sit clear above the glyph, which starts at y=300
        dot_row(d, 268, dots, above)
    else:
        # Baa's dot is under its own glyph. A filled marker there collides with
        # it and a marker lower down lands on the name, so ring the real dot
        # instead — it points at the thing being taught rather than covering it.
        d.ellipse((332, 522, 388, 578), outline=GOLD, width=6)

    # the rhyme's own line, on a gold pill just under the panel
    f2 = fit(GEO_B, line, 40, W - 140)
    bb = d.textbbox((0, 0), line, font=f2)
    pw = (bb[2] - bb[0]) + 70
    px = (W - pw) // 2
    panel(img, (px, 745, px + pw, 830), radius=42,
          fill=(214, 176, 106, 240), border=(247, 243, 233, 255), width=4)
    d = ImageDraw.Draw(img)
    centre(d, 760, line, f2, (10, 46, 36, 255), shadow=False)

    img.save(HERE / f"card-{name}.png")
    print(f"card-{name}.png")


def line_card(name: str, top: str, bottom: str, where: str = "top"):
    """A two-line lyric card for the intro and the ending."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    y = 170 if where == "top" else 900
    scrim(img, y - 90, y + 240, 105)
    d = ImageDraw.Draw(img)
    centre(d, y, top, fit(GEO, top, 46, W - 70), CREAM)
    centre(d, y + 80, bottom, fit(GEO_BI, bottom, 60, W - 60), GOLD)
    img.save(HERE / f"card-{name}.png")
    print(f"card-{name}.png")


def all_four_card():
    """The chorus: four letters, each on its own tile so none crowd the next."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    letters = ["ا", "ب", "ت", "ث"]          # reversed below for RTL reading
    names = ["Alif", "Baa", "Taa", "Saa"]
    tile, gap = 150, 16
    total = tile * 4 + gap * 3
    left = (W - total) // 2
    top = 300

    for i, (ch, nm) in enumerate(zip(reversed(letters), reversed(names))):
        x = left + i * (tile + gap)
        panel(img, (x, top, x + tile, top + tile), radius=34)
        d = ImageDraw.Draw(img)
        f = font(AR, 108)
        s = shape(ch)
        x0, y0, x1, y1 = d.textbbox((0, 0), s, font=f)
        d.text((x + (tile - (x1 - x0)) // 2 - x0, top + 22), s, font=f, fill=EMERALD)
        f2 = font(GEO_B, 26)
        b = d.textbbox((0, 0), nm, font=f2)
        d.text((x + (tile - (b[2] - b[0])) // 2 - b[0], top + tile + 14), nm,
               font=f2, fill=CREAM, stroke_width=3, stroke_fill=(10, 46, 36, 220))

    d = ImageDraw.Draw(img)
    f3 = font(GEO_BI, 64)
    bb = d.textbbox((0, 0), "Mā shā’ Allāh!", font=f3)
    pw = (bb[2] - bb[0]) + 80
    px = (W - pw) // 2
    panel(img, (px, 560, px + pw, 660), radius=48,
          fill=(214, 176, 106, 240), border=(247, 243, 233, 255), width=4)
    d = ImageDraw.Draw(img)
    centre(d, 575, "Mā shā’ Allāh!", f3, (10, 46, 36, 255), shadow=False)
    centre(d, 700, "Four letters. One little step at a time.",
           fit(GEO_B, "Four letters. One little step at a time.", 34, W - 70), CREAM)

    img.save(HERE / "card-chorus.png")
    print("card-chorus.png")


def end_card():
    """Emerald brand close. Same furniture as style 1's, kids' tagline."""
    img = Image.new("RGBA", (W, H), EMERALD)
    d = ImageDraw.Draw(img)

    logo = Image.open(
        HERE.parents[2] / "suppliedMedia" / "Riwaq_Logo_V6_Circle_Transparent.png"
    ).convert("RGBA")
    lw = 300
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    img.alpha_composite(logo, ((W - lw) // 2, 300))

    f = font(AR, 130)
    letters = ["ا", "ب", "ت", "ث"]
    gap = W // 5
    for i, ch in enumerate(reversed(letters)):
        s = shape(ch)
        x0, y0, x1, y1 = d.textbbox((0, 0), s, font=f)
        x = gap * (i + 1) - (x1 - x0) // 2 - x0
        d.text((x, 690), s, font=f, fill=GOLD)

    centre(d, 860, "Riwaq Al Ilm", font(GEO_B, 62), CREAM, shadow=False)
    centre(d, 940, "Learn · Grow · Love the Qur’an", font(GEO_BI, 38), GOLD, shadow=False)
    centre(d, 1040, "FREE trial class · Al-Azhar teachers", font(GEO, 34), CREAM, shadow=False)
    centre(d, 1090, "riwaqalilm.com/free-trial", font(GEO_B, 36), GOLD, shadow=False)
    img.convert("RGB").save(HERE / "endcard.png")
    print("endcard.png")


def watermark():
    """Small gold wordmark, composited at rotating positions by the build."""
    img = Image.new("RGBA", (420, 90), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f = font(GEO_B, 34)
    d.text((3, 3), "Riwaq Al Ilm", font=f, fill=(0, 0, 0, 110))
    d.text((0, 0), "Riwaq Al Ilm", font=f, fill=(214, 176, 106, 205))
    img.crop(img.getbbox()).save(HERE / "watermark.png")
    print("watermark.png")


if __name__ == "__main__":
    line_card("intro", "Come along, come sing with me —", "Arabic is fun, you’ll see!")
    letter_card("alif", "ا", "Alif", "Alif stands up tall!", 0)
    letter_card("baa", "ب", "Baa", "One little dot below!", 1, above=False)
    letter_card("taa", "ت", "Taa", "Two little dots on top!", 2)
    letter_card("saa", "ث", "Saa", "Three little dots on top!", 3)
    all_four_card()
    line_card("ending", "Little steps along the way —", "we’ll learn some more another day!",
              where="bottom")
    end_card()
    watermark()
