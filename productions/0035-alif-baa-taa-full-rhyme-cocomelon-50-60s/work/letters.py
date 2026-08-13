#!/usr/bin/env python3
"""
Animated Arabic letter cards for 0035.

Renders one RGBA PNG sequence per appearance, which ffmpeg overlays at the exact
moment the character says the letter. Timings come from whisper word timestamps on
the delivered cut, not from guesses:

    Alif  10.16  10.88  16.54
    Baa   20.00         26.54
    Taa   30.00  30.32  36.80
    Saa   40.04  40.46  46.64

Arabic is rendered locally with GeezaPro and reshaped/bidi-ordered. Never ask a
model for Arabic letters — every attempt so far produced garbled Latin.

Animation per appearance: spring pop-in, settle, gentle float and pulse while held,
then a fade out that drifts upward. Card canvas only, not full frame, so the
sequences stay small.
"""

from pathlib import Path
import math

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageFilter
import arabic_reshaper
from bidi.algorithm import get_display

HERE = Path(__file__).parent
FPS = 24
CARD_W, CARD_H = 470, 560          # canvas each frame is drawn into

AR = "/System/Library/Fonts/GeezaPro.ttc"
GEO_B = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"

GOLD = (214, 176, 106)
CREAM = (250, 247, 238)
EMERALD = (10, 46, 36)
# translucent pink "glass" for the letter cards — the cream card read as flat
# against the bright CoComelon playroom
PINK = (255, 150, 196)
PINK_DEEP = (243, 106, 168)

# letter, latin name, appearances as (start_seconds, duration_seconds)
LETTERS = [
    ("ا", "Alif", [(10.16, 5.40), (16.54, 2.60)]),
    ("ب", "Baa",  [(20.00, 4.90), (26.54, 2.60)]),
    ("ت", "Taa",  [(30.00, 4.90), (36.80, 2.60)]),
    ("ث", "Saa",  [(40.04, 4.90), (46.64, 2.60)]),
]


def shape(t: str) -> str:
    return get_display(arabic_reshaper.reshape(t))


def draw_card(scale: float, alpha: float, dy: int, letter: str, name: str) -> Image.Image:
    """One frame: the card at a given scale/alpha/vertical offset."""
    base = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))

    w, h = int(360 * scale), int(430 * scale)
    card = Image.new("RGBA", (w + 40, h + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    r = int(48 * scale)
    box = (20, 20, w + 16, h + 16)

    # soft drop shadow
    d.rounded_rectangle((22, 26, w + 18, h + 22), r, fill=(0, 0, 0, 70))

    # --- translucent pink glass -------------------------------------------
    # vertical gradient, paler at the top, deeper pink at the bottom, all
    # semi-transparent so the playroom shows through
    grad = Image.new("RGBA", card.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for i in range(box[1], box[3]):
        t = (i - box[1]) / max(box[3] - box[1], 1)
        col = tuple(int(PINK[k] + (PINK_DEEP[k] - PINK[k]) * t) for k in range(3))
        gd.line((box[0], i, box[2], i), fill=col + (int(120 + 60 * t),))
    mask = Image.new("L", card.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, r, fill=255)
    card.paste(grad, (0, 0), mask)

    # glossy sheen across the upper third, clipped to the card shape.
    # NOTE: build this as an alpha mask and alpha_composite it. Pasting an RGBA
    # sheen with a rounded-rect mask paints an opaque block over the top half.
    sh = Image.new("L", card.size, 0)
    ImageDraw.Draw(sh).rounded_rectangle(
        (box[0] + int(8 * scale), box[1] + int(6 * scale),
         box[2] - int(8 * scale), box[1] + int((h + 16) * 0.40)),
        int(r * 0.9), fill=95)
    sh = sh.filter(ImageFilter.GaussianBlur(max(3, int(14 * scale))))
    gloss = Image.new("RGBA", card.size, (255, 255, 255, 0))
    gloss.putalpha(ImageChops.multiply(sh, mask))
    card.alpha_composite(gloss)

    # bright inner rim, then the gold brand edge
    d = ImageDraw.Draw(card)
    d.rounded_rectangle((box[0] + int(5 * scale), box[1] + int(5 * scale),
                         box[2] - int(5 * scale), box[3] - int(5 * scale)),
                        int(r * 0.92), outline=(255, 255, 255, 150),
                        width=max(2, int(3 * scale)))
    d.rounded_rectangle(box, r, outline=GOLD + (255,), width=max(3, int(6 * scale)))

    f = ImageFont.truetype(AR, max(10, int(250 * scale)))
    s = shape(letter)
    b = d.textbbox((0, 0), s, font=f)
    cx = 20 + (w - (b[2] - b[0])) // 2 - b[0]
    d.text((cx, int(45 * scale)), s, font=f, fill=EMERALD,
           stroke_width=max(1, int(5 * scale)), stroke_fill=(255, 255, 255, 190))

    fn = ImageFont.truetype(GEO_B, max(8, int(62 * scale)))
    bn = d.textbbox((0, 0), name, font=fn)
    d.text((20 + (w - (bn[2] - bn[0])) // 2 - bn[0], int(300 * scale)), name,
           font=fn, fill=EMERALD,
           stroke_width=max(1, int(3 * scale)), stroke_fill=(255, 255, 255, 185))

    if alpha < 1.0:
        card.putalpha(card.getchannel("A").point(lambda a: int(a * alpha)))

    x = (CARD_W - card.width) // 2
    y = (CARD_H - card.height) // 2 + dy
    base.alpha_composite(card, (max(x, 0), max(y, 0)))
    return base


def ease_out_back(t: float) -> float:
    """Overshoot slightly, then settle — reads as a spring pop."""
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2


def render(letter: str, name: str, idx: int, dur: float) -> Path:
    out = HERE / "anim" / f"{name.lower()}{idx}"
    out.mkdir(parents=True, exist_ok=True)
    n = int(dur * FPS)
    pop, fade = 0.42, 0.40
    for i in range(n):
        t = i / FPS
        if t < pop:                                   # spring in
            p = ease_out_back(min(t / pop, 1.0))
            scale, alpha = 0.30 + 0.70 * p, min(t / 0.18, 1.0)
            dy = int(28 * (1 - p))
        elif t > dur - fade:                          # drift up and out
            p = (t - (dur - fade)) / fade
            scale, alpha, dy = 1.0 + 0.08 * p, 1.0 - p, int(-26 * p)
        else:                                         # idle float + pulse
            k = (t - pop) * 2.0
            scale = 1.0 + 0.022 * math.sin(k)
            alpha = 1.0
            dy = int(7 * math.sin(k * 0.85))
        draw_card(scale, alpha, dy, letter, name).save(out / f"f_{i:04d}.png")
    return out


if __name__ == "__main__":
    for letter, name, appearances in LETTERS:
        for i, (start, dur) in enumerate(appearances, 1):
            p = render(letter, name, i, dur)
            print(f"{name} #{i}  start {start:6.2f}s  dur {dur:.2f}s  "
                  f"{int(dur * FPS)} frames -> {p.relative_to(HERE)}")
