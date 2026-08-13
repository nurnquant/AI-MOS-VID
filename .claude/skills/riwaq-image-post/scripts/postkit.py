#!/usr/bin/env python3
"""
Riwaq image post kit — one textless illustration in, every platform size out.

Generalised from production 0027. Takes a square 4K illustration that contains
NO text, lays the brand type over it locally, and writes one file per platform
ratio.

    python3 postkit.py \
        --base productions/0027-.../work/base-1x1-4k.png \
        --out  productions/0027-.../OUTPUT \
        --prefix 0027-allah-made-everything \
        --title "ALLAH MADE EVERYTHING" \
        --emoji-left  "\N{EARTH GLOBE AMERICAS}" \
        --emoji-right "\N{HERB}" \
        --line1 "The sun and moon, the birds and trees —" \
        --line2 "Allah made them all for us to see!" \
        --ratios 1x1,4x5,2x3,16x9,9x16

Why the type is rendered here and never by the image model: the models garble
lettering, Arabic worst of all, and a brief's wording has to come out exact.

Host constraints baked in:
  * Apple Color Emoji is a bitmap face — only 96px rasterises with
    embedded_color=True, so emoji are drawn at 96 and scaled with LANCZOS.
  * The logo asset is a 1024x1536 canvas whose artwork occupies 1020x1415, so it
    is cropped to its opaque bbox before sizing. Sizing the canvas makes the
    visible circle far smaller than asked for.

Verify every output by eye before delivering. Brand furniture that covers
briefed content is a defect — see the notes in SKILL.md.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

EMERALD = (9, 58, 43)
CREAM = (250, 247, 238)
GOLD = (176, 132, 46)

GEO_B = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
GEO_BI = "/System/Library/Fonts/Supplemental/Georgia Bold Italic.ttf"
EMOJI_FONT = "/System/Library/Fonts/Apple Color Emoji.ttc"

# name -> (w, h, mode, crop bias, platforms)
# 4K square source, so nothing here upscales.
PRESETS = {
    "1x1":  (4096, 4096, "none",   0.50, "Facebook · Instagram square"),
    "4x5":  (3277, 4096, "crop-x", 0.24, "Instagram feed"),
    "2x3":  (2731, 4096, "crop-x", 0.20, "Pinterest"),
    "16x9": (4096, 2304, "crop-y", 0.80, "Facebook feed · X"),
    "9x16": (2304, 4096, "pad",    0.50, "TikTok · Reels · Stories"),
}

# Type and logo placement per ratio. Tuned by looking at renders, not derived.
#   couplet_x=None centres the panel; a float pushes it aside so it does not
#   cover the subject (needed for landscape, where subjects sit mid-frame).
LAYOUT = {
    "1x1":  dict(title_y=0.075, couplet_y=0.845, logo_frac=0.071, logo_at=(0.022, 0.977)),
    "4x5":  dict(title_y=0.055, couplet_y=0.845, logo_frac=0.088, logo_at=(0.028, 0.978)),
    "2x3":  dict(title_y=0.055, couplet_y=0.850, logo_frac=0.098, logo_at=(0.030, 0.978)),
    "16x9": dict(title_y=0.045, couplet_y=0.615, logo_frac=0.062, logo_at=(0.014, 0.972),
                 couplet_w=0.40, couplet_x=0.555),
    # 0.73 not 0.80: TikTok and Reels overlay caption and buttons over the
    # bottom fifth, which would swallow a lower panel.
    "9x16": dict(title_y=0.075, couplet_y=0.730, logo_frac=0.115, logo_at=(0.035, 0.945)),
}


def emoji_img(ch: str, size: int) -> Image.Image | None:
    if not ch:
        return None
    f = ImageFont.truetype(EMOJI_FONT, 96)          # only 96 rasterises
    tile = Image.new("RGBA", (150, 150), (0, 0, 0, 0))
    ImageDraw.Draw(tile).text((12, 12), ch, font=f, embedded_color=True)
    bb = tile.getbbox()
    if not bb:
        return None
    tile = tile.crop(bb)
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


def panel(img: Image.Image, box, radius: int, fill) -> None:
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
    if mode == "none":
        return base.resize((w, h), Image.LANCZOS).convert("RGBA")
    if mode == "crop-x":
        need = int(H * w / h)
        x = int((W - need) * bias)
        return base.crop((x, 0, x + need, H)).resize((w, h), Image.LANCZOS).convert("RGBA")
    if mode == "crop-y":
        need = int(W * h / w)
        y = int((H - need) * bias)
        return base.crop((0, y, W, y + need)).resize((w, h), Image.LANCZOS).convert("RGBA")

    # pad: keep the WHOLE illustration over a blurred fill of itself. Use this
    # when cropping would remove briefed content — a square cropped to 9:16
    # loses whatever sits at the left and right edges.
    sharp = base.resize((w, int(H * w / W)), Image.LANCZOS)
    scale = max(w / W, h / H) * 1.25
    bg = base.resize((int(W * scale), int(H * scale)), Image.LANCZOS)
    bg = bg.filter(ImageFilter.GaussianBlur(int(w * 0.045)))
    ox, oy = (bg.width - w) // 2, (bg.height - h) // 2
    bg = bg.crop((ox, oy, ox + w, oy + h)).convert("RGB")
    bg = Image.blend(bg, Image.new("RGB", (w, h), (222, 236, 245)), 0.18)
    out = bg.convert("RGBA")
    out.alpha_composite(sharp.convert("RGBA"), (0, (h - sharp.height) // 2))
    return out


def compose(img, w, h, title, el, er, line1, line2, logo_path,
            title_y, couplet_y, logo_frac, logo_at,
            couplet_w=0.74, couplet_x=None):
    d = ImageDraw.Draw(img)

    if title:
        f = fit(GEO_B, title, int(w * 0.70), int(w * 0.075))
        b = d.textbbox((0, 0), title, font=f)
        tw, th = b[2] - b[0], b[3] - b[1]
        em = int(th * 1.15)
        gl, lf = emoji_img(el, em), emoji_img(er, em)
        gap = int(em * 0.42)
        total = (gl.width + gap if gl else 0) + tw + (gap + lf.width if lf else 0)
        x, y = (w - total) // 2, int(h * title_y)
        tx = x + (gl.width + gap if gl else 0)
        if gl:
            img.alpha_composite(gl, (x, y + (th - gl.height) // 2))
        # cream halo instead of a scrim: keeps a bright illustration bright
        stroke = max(6, int(w * 0.0034))
        d.text((tx - b[0], y - b[1]), title, font=f, fill=CREAM + (235,),
               stroke_width=stroke, stroke_fill=CREAM + (235,))
        d.text((tx - b[0], y - b[1]), title, font=f, fill=EMERALD + (255,))
        if lf:
            img.alpha_composite(lf, (x + total - lf.width, y + (th - lf.height) // 2))

    if line1 or line2:
        lines = [(t, c) for t, c in ((line1, EMERALD), (line2, GOLD)) if t]
        longest = max((t for t, _ in lines), key=len)
        fc = fit(GEO_BI, longest, int(w * couplet_w), int(w * 0.040))
        d = ImageDraw.Draw(img)
        bb0 = d.textbbox((0, 0), longest, font=fc)
        lh = bb0[3] - bb0[1]
        pw = max(d.textbbox((0, 0), t, font=fc)[2] for t, _ in lines) + int(w * 0.07)
        ph = int(lh * (1.9 + 1.6 * (len(lines) - 1)))
        px = (w - pw) // 2 if couplet_x is None else int(w * couplet_x)
        py = int(h * couplet_y)
        panel(img, (px, py, px + pw, py + ph), int(ph * 0.24), CREAM + (238,))
        d = ImageDraw.Draw(img)
        for i, (t, col) in enumerate(lines):
            bb = d.textbbox((0, 0), t, font=fc)
            cx = px + (pw - (bb[2] - bb[0])) // 2 - bb[0]
            d.text((cx, py + int(ph * 0.20) + i * int(lh * 1.45)), t, font=fc,
                   fill=col + (255,))

    if logo_path:
        logo = Image.open(logo_path).convert("RGBA")
        logo = logo.crop(logo.getchannel("A").getbbox())     # drop the padding
        lw = int(w * logo_frac)
        logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
        lx, ly = int(w * logo_at[0]), int(h * logo_at[1]) - logo.height
        glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
        sh = Image.new("RGBA", logo.size, (0, 0, 0, 0))
        sh.paste((0, 0, 0, 115), (0, 0), logo.getchannel("A"))
        glow.alpha_composite(sh, (lx + 5, ly + 8))
        img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(max(4, int(w * 0.005)))))
        img.alpha_composite(logo, (lx, ly))
    return img


def main() -> int:
    ap = argparse.ArgumentParser(description="Riwaq image post: base -> every ratio")
    ap.add_argument("--base", required=True, help="square textless illustration, 4K")
    ap.add_argument("--out", required=True, help="output directory (a job's OUTPUT/)")
    ap.add_argument("--prefix", required=True, help="filename prefix, e.g. 0027-allah-made-everything")
    ap.add_argument("--title", default="")
    ap.add_argument("--emoji-left", default="")
    ap.add_argument("--emoji-right", default="")
    ap.add_argument("--line1", default="")
    ap.add_argument("--line2", default="")
    ap.add_argument("--logo",
                    default="suppliedMedia/Riwaq_Logo_V6_Circle_Transparent.png")
    ap.add_argument("--ratios", default="1x1,4x5,2x3,16x9,9x16")
    ap.add_argument("--also-clean", action="store_true",
                    help="also write the textless square, for reuse as a video start frame")
    args = ap.parse_args()

    base = Image.open(args.base).convert("RGBA")
    if base.width != base.height:
        print(f"note: base is {base.width}x{base.height}, not square — "
              "crops will differ from the tuned defaults")
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    logo = args.logo if Path(args.logo).exists() else None
    if args.logo and not logo:
        print(f"warning: logo not found at {args.logo} — writing without it")

    wanted = [r.strip() for r in args.ratios.split(",") if r.strip()]
    bad = [r for r in wanted if r not in PRESETS]
    if bad:
        print(f"unknown ratio(s): {', '.join(bad)}")
        print(f"known: {', '.join(PRESETS)}")
        return 2

    for name in wanted:
        w, h, mode, bias, platforms = PRESETS[name]
        img = frame(base, w, h, mode, bias)
        img = compose(img, w, h, args.title, args.emoji_left, args.emoji_right,
                      args.line1, args.line2, logo, **LAYOUT[name])
        p = out / f"{args.prefix}-{name}.png"
        img.convert("RGB").save(p)
        print(f"{p.name:52s} {w}x{h}   {platforms}")

    if args.also_clean:
        p = out / f"{args.prefix}-clean-1x1-4k.png"
        base.convert("RGB").save(p)
        print(f"{p.name:52s} {base.width}x{base.height}   textless master")

    print("\nNow LOOK at each file. Type or logo covering briefed content is a defect.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
