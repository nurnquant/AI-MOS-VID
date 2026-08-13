#!/usr/bin/env python3
"""
Per-platform ratios for 0027, composed from the CLEAN base.

Why not just crop the accepted 1:1 post: its title and couplet are laid out for a
square. Cropping it clips the text and moves the logo off its corner. So each
ratio takes the textless illustration, frames it, and re-lays the type at a size
that suits that canvas.

Framing choice per ratio, and why:

  4:5  crop sides, shifted LEFT so the rabbit survives — Instagram feed
  2:3  crop sides, same bias — Pinterest
  16:9 crop top and bottom, keeping both children and enough sky for the title
  9:16 do NOT crop. A square cropped to 9:16 loses a child or both animals, so
       the full illustration sits sharp over a blurred fill of itself, and the
       bands above and below become clean space for the type.

The accepted `0027-...-titled-1x1-4k.png` is never rewritten by this script.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = Path(__file__).parent
OUT = HERE.parent / "OUTPUT"
CLEAN = OUT / "0027-allah-made-everything-clean-1x1-4k.png"
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

# name -> (w, h, mode, bias, platforms)
#   bias: crop window offset as a fraction of the slack, 0.5 = centred
PRESETS = {
    "4x5":  (3277, 4096, "crop-x", 0.24, "Instagram feed"),
    "2x3":  (2731, 4096, "crop-x", 0.20, "Pinterest"),
    # bias 0.42 cropped the rabbit and lamb clean out of frame; 0.80 keeps the
    # children AND both animals, at the cost of most of the sky
    "16x9": (4096, 2304, "crop-y", 0.80, "Facebook feed · X"),
    "9x16": (2304, 4096, "pad",    0.50, "TikTok · Reels · Stories"),
}


def emoji(ch: str, size: int) -> Image.Image:
    """Apple Color Emoji is a bitmap face: only 96px rasterises, so scale after."""
    f = ImageFont.truetype(EMOJI, 96)
    tile = Image.new("RGBA", (140, 140), (0, 0, 0, 0))
    ImageDraw.Draw(tile).text((10, 10), ch, font=f, embedded_color=True)
    tile = tile.crop(tile.getbbox())
    return tile.resize((size, int(tile.height * size / tile.width)), Image.LANCZOS)


def fit(path: str, text: str, max_w: int, start: int) -> ImageFont.FreeTypeFont:
    probe = ImageDraw.Draw(Image.new("RGB", (8, 8)))
    size = start
    while size > 16:
        f = ImageFont.truetype(path, size)
        if probe.textbbox((0, 0), text, font=f)[2] <= max_w:
            return f
        size -= 4
    return ImageFont.truetype(path, size)


def panel(img, box, radius, fill):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = box
    d.rounded_rectangle((x0 + 8, y0 + 14, x1 + 8, y1 + 14), radius, fill=(0, 0, 0, 55))
    layer = layer.filter(ImageFilter.GaussianBlur(10))
    ImageDraw.Draw(layer).rounded_rectangle(box, radius, fill=fill)
    img.alpha_composite(layer)


def frame(base: Image.Image, w: int, h: int, mode: str, bias: float) -> Image.Image:
    """Crop or pad the square illustration into the target canvas."""
    W, H = base.size
    if mode == "crop-x":
        need_w = int(H * w / h)
        x = int((W - need_w) * bias)
        return base.crop((x, 0, x + need_w, H)).resize((w, h), Image.LANCZOS)
    if mode == "crop-y":
        need_h = int(W * h / w)
        y = int((H - need_h) * bias)
        return base.crop((0, y, W, y + need_h)).resize((w, h), Image.LANCZOS)

    # pad: blurred fill behind the whole sharp illustration
    canvas = base.resize((w, int(H * w / W)), Image.LANCZOS)
    scale = max(w / W, h / H) * 1.25
    bg = base.resize((int(W * scale), int(H * scale)), Image.LANCZOS)
    bg = bg.filter(ImageFilter.GaussianBlur(int(w * 0.045)))
    bg = bg.crop(((bg.width - w) // 2, (bg.height - h) // 2,
                  (bg.width - w) // 2 + w, (bg.height - h) // 2 + h))
    bg = Image.blend(bg.convert("RGB"), Image.new("RGB", (w, h), (222, 236, 245)), 0.18)
    out = bg.convert("RGBA")
    out.alpha_composite(canvas.convert("RGBA"), (0, (h - canvas.height) // 2))
    return out


def compose(img: Image.Image, w: int, h: int, title_y: float, couplet_y: float,
            logo_frac: float, logo_at: tuple, couplet_w: float = 0.74,
            couplet_x=None) -> Image.Image:
    d = ImageDraw.Draw(img)

    # ---- title -----------------------------------------------------------
    f = fit(GEO_B, TITLE, int(w * 0.70), int(w * 0.075))
    b = d.textbbox((0, 0), TITLE, font=f)
    tw, th = b[2] - b[0], b[3] - b[1]
    em = int(th * 1.15)
    globe, leaf = emoji("\U0001F30E", em), emoji("\U0001F33F", em)
    gap = int(em * 0.42)
    total = globe.width + gap + tw + gap + leaf.width
    x, y = (w - total) // 2, int(h * title_y)

    img.alpha_composite(globe, (x, y + (th - globe.height) // 2))
    d.text((x + globe.width + gap - b[0], y - b[1]), TITLE, font=f,
           fill=CREAM + (235,), stroke_width=max(6, int(w * 0.0034)), stroke_fill=CREAM + (235,))
    d.text((x + globe.width + gap - b[0], y - b[1]), TITLE, font=f, fill=EMERALD + (255,))
    img.alpha_composite(leaf, (x + total - leaf.width, y + (th - leaf.height) // 2))

    # ---- couplet on a cream panel ----------------------------------------
    fc = fit(GEO_BI, LINE1, int(w * couplet_w), int(w * 0.040))
    d = ImageDraw.Draw(img)
    lh = d.textbbox((0, 0), LINE1, font=fc)[3] - d.textbbox((0, 0), LINE1, font=fc)[1]
    pw = max(d.textbbox((0, 0), LINE1, font=fc)[2],
             d.textbbox((0, 0), LINE2, font=fc)[2]) + int(w * 0.07)
    ph = int(lh * 3.5)
    px = (w - pw) // 2 if couplet_x is None else int(w * couplet_x)
    py = int(h * couplet_y)
    panel(img, (px, py, px + pw, py + ph), int(ph * 0.24), CREAM + (238,))

    d = ImageDraw.Draw(img)
    for i, (line, col) in enumerate(((LINE1, EMERALD), (LINE2, GOLD))):
        bb = d.textbbox((0, 0), line, font=fc)
        cx = px + (pw - (bb[2] - bb[0])) // 2 - bb[0]
        d.text((cx, py + int(ph * 0.20) + i * int(lh * 1.45)),
               line, font=fc, fill=col + (255,))

    # ---- logo, bottom-left ------------------------------------------------
    logo = Image.open(LOGO).convert("RGBA")
    logo = logo.crop(logo.getchannel("A").getbbox())
    lw = int(w * logo_frac)
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    lx = int(w * logo_at[0])
    ly = int(h * logo_at[1]) - logo.height
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sh = Image.new("RGBA", logo.size, (0, 0, 0, 0))
    sh.paste((0, 0, 0, 115), (0, 0), logo.getchannel("A"))
    glow.alpha_composite(sh, (lx + 5, ly + 8))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(int(w * 0.005))))
    img.alpha_composite(logo, (lx, ly))
    return img


# per-ratio type and logo placement, tuned by looking at each render
LAYOUT = {
    "4x5":  dict(title_y=0.055, couplet_y=0.845, logo_frac=0.088, logo_at=(0.028, 0.978)),
    "2x3":  dict(title_y=0.055, couplet_y=0.850, logo_frac=0.098, logo_at=(0.030, 0.978)),
    # landscape: subjects sit centre, so the couplet goes RIGHT instead of across
    # the middle where it covered both children
    "16x9": dict(title_y=0.045, couplet_y=0.615, logo_frac=0.062, logo_at=(0.014, 0.972),
                 couplet_w=0.40, couplet_x=0.555),
    # TikTok/Reels overlay their caption and buttons across roughly the bottom
    # 20%, so the couplet sits at 0.73 rather than 0.80 to stay readable in-app
    "9x16": dict(title_y=0.075, couplet_y=0.730, logo_frac=0.115, logo_at=(0.035, 0.945)),
}


def main() -> None:
    base = Image.open(CLEAN).convert("RGBA")
    for name, (w, h, mode, bias, platforms) in PRESETS.items():
        img = frame(base, w, h, mode, bias)
        img = compose(img, w, h, **LAYOUT[name])
        p = OUT / f"0027-allah-made-everything-{name}.png"
        img.convert("RGB").save(p)
        print(f"{p.name:44s} {w}x{h}   {platforms}")


if __name__ == "__main__":
    main()
