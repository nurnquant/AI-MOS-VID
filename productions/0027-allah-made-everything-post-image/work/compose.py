#!/usr/bin/env python3
"""
Compose 0027's title and couplet onto the generated illustration.

Text is rendered HERE, never by the image model — the model garbles lettering,
and the brief specifies exact wording that has to be exact.

Emoji note: Apple Color Emoji is a bitmap face and only rasterises at specific
ppem sizes. 96px works with `embedded_color=True`; anything else raises or
renders blank. So each emoji is drawn at 96 and scaled up with LANCZOS.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = Path(__file__).parent
OUT = HERE.parent / "OUTPUT"
BASE = HERE / "base-1x1-4k.png"
LOGO = HERE.parents[2] / "suppliedMedia" / "Riwaq_Logo_V6_Circle_Transparent.png"

GEO_B = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
GEO_BI = "/System/Library/Fonts/Supplemental/Georgia Bold Italic.ttf"
EMOJI = "/System/Library/Fonts/Apple Color Emoji.ttc"

EMERALD = (9, 58, 43)
CREAM = (250, 247, 238)
GOLD = (176, 132, 46)

TITLE = "ALLAH MADE EVERYTHING"
LINE1 = "The sun and moon, the birds and trees —"
LINE2 = "Allah made them all for us to see!"


def emoji(ch: str, size: int) -> Image.Image:
    """Render one colour emoji at its supported 96px, then scale."""
    f = ImageFont.truetype(EMOJI, 96)
    tile = Image.new("RGBA", (140, 140), (0, 0, 0, 0))
    ImageDraw.Draw(tile).text((10, 10), ch, font=f, embedded_color=True)
    tile = tile.crop(tile.getbbox())
    return tile.resize((size, int(tile.height * size / tile.width)), Image.LANCZOS)


def halo(img: Image.Image, text: str, font, xy, fill, ring=CREAM, w=14):
    """Cream outline so brand text survives a pale sky without a heavy scrim."""
    d = ImageDraw.Draw(img)
    d.text(xy, text, font=font, fill=ring + (235,), stroke_width=w, stroke_fill=ring + (235,))
    d.text(xy, text, font=font, fill=fill + (255,))


def soft_panel(img, box, radius, fill):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = box
    d.rounded_rectangle((x0 + 10, y0 + 16, x1 + 10, y1 + 16), radius, fill=(0, 0, 0, 55))
    layer = layer.filter(ImageFilter.GaussianBlur(12))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle(box, radius, fill=fill)
    img.alpha_composite(layer)


def main() -> None:
    base = Image.open(BASE).convert("RGBA")
    W, H = base.size
    img = base.copy()
    d = ImageDraw.Draw(img)

    # ---- title, upper sky -------------------------------------------------
    size = 250
    while size > 80:
        f = ImageFont.truetype(GEO_B, size)
        tw = d.textbbox((0, 0), TITLE, font=f)[2]
        if tw <= W * 0.68:
            break
        size -= 6
    f = ImageFont.truetype(GEO_B, size)
    b = d.textbbox((0, 0), TITLE, font=f)
    tw, th = b[2] - b[0], b[3] - b[1]

    em = int(size * 0.86)
    globe, leaf = emoji("\U0001F30E", em), emoji("\U0001F33F", em)
    gap = int(size * 0.34)
    total = globe.width + gap + tw + gap + leaf.width
    x = (W - total) // 2
    y = int(H * 0.075)

    img.alpha_composite(globe, (x, y + (th - globe.height) // 2 + int(size * 0.08)))
    halo(img, TITLE, f, (x + globe.width + gap - b[0], y - b[1]), EMERALD)
    img.alpha_composite(leaf, (x + total - leaf.width,
                               y + (th - leaf.height) // 2 + int(size * 0.08)))

    # ---- couplet, on a cream panel over the busy foreground ---------------
    fc = ImageFont.truetype(GEO_BI, 118)
    d = ImageDraw.Draw(img)
    w1 = d.textbbox((0, 0), LINE1, font=fc)[2]
    w2 = d.textbbox((0, 0), LINE2, font=fc)[2]
    pw = max(w1, w2) + 220
    ph = 400
    # 0.78 buried the lamb the brief asked for; sit lower, over flowers only
    px, py = (W - pw) // 2, int(H * 0.845)
    soft_panel(img, (px, py, px + pw, py + ph), 90, CREAM + (238,))

    d = ImageDraw.Draw(img)
    for i, (line, col) in enumerate(((LINE1, EMERALD), (LINE2, GOLD))):
        bb = d.textbbox((0, 0), line, font=fc)
        d.text(((W - (bb[2] - bb[0])) // 2 - bb[0], py + 82 + i * 165),
               line, font=fc, fill=col + (255,))

    # ---- small logo watermark, bottom-left (style 5 convention) -----------
    logo = Image.open(LOGO).convert("RGBA")
    lw = 300
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    logo.putalpha(logo.getchannel("A").point(lambda a: int(a * 0.80)))
    img.alpha_composite(logo, (150, H - logo.height - 150))

    OUT.mkdir(exist_ok=True)
    img.convert("RGB").save(OUT / "0027-allah-made-everything-titled-1x1-4k.png")
    base.convert("RGB").save(OUT / "0027-allah-made-everything-clean-1x1-4k.png")
    print("wrote titled + clean masters at", img.size)


if __name__ == "__main__":
    main()
