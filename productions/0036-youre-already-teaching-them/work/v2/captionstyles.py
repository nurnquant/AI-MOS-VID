#!/usr/bin/env python3
"""Four caption treatments, composited onto a real frame from clip 1.

Argued on a real frame rather than described, because caption design is decided
by what it does to a face, and the face is the product here.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = Path(__file__).parent
FRAME = HERE / "frame.png"
W, H = 720, 1280

GEO_B = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
AVENIR = "/System/Library/Fonts/Avenir Next Condensed.ttc"
HELV = "/System/Library/Fonts/HelveticaNeue.ttc"

CREAM = (247, 244, 236, 255)
GOLD = (222, 184, 118, 255)
DARK = (6, 20, 14)

SAFE_TOP, SAFE_BOTTOM = 150, 1050        # platform UI eats outside this


def base():
    return Image.open(FRAME).convert("RGBA").resize((W, H))


def outlined(d, xy, text, font, fill, halo=(0, 0, 0, 190), r=3):
    """Text that reads on any background without a slab behind it."""
    x, y = xy
    for dx in range(-r, r + 1):
        for dy in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                d.text((x + dx, y + dy), text, font=font, fill=halo)
    d.text((x, y), text, font=font, fill=fill)


def centre(d, y, text, font, fill, halo=True):
    x = (W - d.textlength(text, font=font)) / 2
    if halo:
        outlined(d, (x, y), text, font, fill)
    else:
        d.text((x, y), text, font=font, fill=fill)
    return x


# ---------------------------------------------------------------- A: current
def style_a():
    """What V1 does now: cream Georgia in a dark slab."""
    img = base()
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(GEO_B, 46)
    lines = ["You apologised when you", "were wrong."]
    lh = 62
    top = 900
    widest = max(d.textlength(l, font=f) for l in lines)
    box = [(W - widest) / 2 - 34, top - 26, (W + widest) / 2 + 34, top + lh * len(lines) + 26]
    veil = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(veil).rounded_rectangle(box, radius=26, fill=DARK + (140,))
    img = Image.alpha_composite(img, veil)
    d = ImageDraw.Draw(img)
    y = top
    for l in lines:
        centre(d, y, l, f, CREAM, halo=False)
        y += lh
    return img, "A — what V1 does now", "Slab box, serif. Safe, heavy, dated. The box is a wall across the frame."


# ------------------------------------------------------- B: kinetic karaoke
def style_b():
    """Word-by-word, spoken word lit gold. Needs word timings — we have them now."""
    img = base()
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(AVENIR, 74)
    words = [("YOU", 0), ("APOLOGISED", 1), ("WHEN", 0), ("YOU", 0), ("WERE", 0), ("WRONG", 0)]
    rows, cur, curw = [], [], 0
    for w, hot in words:
        wl = d.textlength(w + " ", font=f)
        if curw + wl > W - 90 and cur:
            rows.append(cur); cur, curw = [], 0
        cur.append((w, hot)); curw += wl
    rows.append(cur)
    y = 830
    for row in rows:
        total = sum(d.textlength(w + " ", font=f) for w, _ in row) - d.textlength(" ", font=f)
        x = (W - total) / 2
        for w, hot in row:
            outlined(d, (x, y), w, f, GOLD if hot else CREAM, r=4)
            x += d.textlength(w + " ", font=f)
        y += 86
    return img, "B — kinetic, word lit as spoken", \
        "No box. Heavy condensed caps, spoken word in brand gold. The Reels default, and now buildable: whisper runs locally, so we have per-word timings."


# ------------------------------------------------- C: one line, keyword gold
def style_c():
    """Two or three words at a time. Quietest option that still reads muted."""
    img = base()
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(HELV, 58, index=1)
    grad = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(grad)
    for i in range(300):                      # soft rise, not a hard edge
        g.rectangle([0, H - 300 + i, W, H - 299 + i], fill=DARK + (int(150 * (i / 300) ** 1.4),))
    img = Image.alpha_composite(img, grad.filter(ImageFilter.GaussianBlur(2)))
    d = ImageDraw.Draw(img)
    centre(d, 905, "you apologised", f, CREAM)
    centre(d, 975, "when you were wrong", f, GOLD)
    return img, "C — quiet two-line, gradient not box", \
        "A gradient instead of a slab, so the room still reads. Lower case, humanist sans. Calmest of the four and the closest to the film's tone."


# --------------------------------------------- D: hook card, first 1.5s only
def style_d():
    """Opening statement treated as a title, then hand off to B or C."""
    img = base()
    dark = Image.new("RGBA", (W, H), DARK + (110,))
    img = Image.alpha_composite(img, dark)
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(GEO_B, 62)
    fs = ImageFont.truetype(AVENIR, 34)
    lines = ["You think", "you're not teaching", "your child deen."]
    y = 380
    for l in lines:
        centre(d, y, l, f, CREAM)
        y += 84
    d.line([(W / 2 - 40, y + 26), (W / 2 + 40, y + 26)], fill=GOLD, width=3)
    centre(d, y + 52, "YOU ARE", fs, GOLD)
    return img, "D — hook card, first 1.5 s only", \
        "The opening claim as a title over a darkened frame, then it clears and captions take over. Wins the muted scroll before the voice has said anything."


tiles = [style_a(), style_b(), style_c(), style_d()]
LABEL_H = 150
sheet = Image.new("RGB", (W * 4 + 5 * 16, H + LABEL_H + 32), (24, 24, 24))
dd = ImageDraw.Draw(sheet)
ft = ImageFont.truetype(GEO_B, 30)
fb = ImageFont.truetype(HELV, 23)


def wrap(draw, text, font, maxw):
    out, cur = [], ""
    for word in text.split():
        t = (cur + " " + word).strip()
        if draw.textlength(t, font=font) <= maxw:
            cur = t
        else:
            out.append(cur); cur = word
    out.append(cur)
    return out


for i, (im, title, blurb) in enumerate(tiles):
    x = 16 + i * (W + 16)
    sheet.paste(im.convert("RGB"), (x, 16))
    dd.text((x, H + 30), title, font=ft, fill=(240, 226, 190))
    y = H + 72
    for ln in wrap(dd, blurb, fb, W - 10):
        dd.text((x, y), ln, font=fb, fill=(186, 186, 186))
        y += 30

sheet.save(HERE / "caption-styles.png")
print("caption-styles.png", sheet.size)
