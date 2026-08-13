#!/usr/bin/env python3
"""
Animated letter/word cards, timed to what the character actually says.

Generalised from production 0035, where Arabic letters had to appear exactly when
the child says them. Renders a spring-pop RGBA sequence per appearance and overlays
them onto a finished cut. **Local only — no generation credits.**

    python3 lettercards.py --video cut.mp4 --out final.mp4 \
        --card "ا:Alif:10.16:5.4"  --card "ا:Alif:16.54:2.6" \
        --card "ب:Baa:20.00:4.9"   --card "ب:Baa:26.54:2.6"

Card spec is TEXT:NAME:START:DURATION. TEXT may be Arabic (reshaped and
bidi-ordered locally through GeezaPro) or Latin. NAME is the caption beneath; pass
an empty NAME to omit it.

Get START from whisper word timestamps on the delivered audio, never by eye:

    segs, _ = model.transcribe(wav, word_timestamps=True, vad_filter=False)
    for s in segs:
        for w in s.words: print(w.start, w.word)

Two rules learned the hard way on 0035:

  * Use ONE card per phrase, not one per utterance. Three pops in four seconds
    reads as a flicker.
  * Check placement against REAL FRAMES before rendering every sequence. The first
    0035 placement was upper-left and covered the character's face in close shots.

Audio is stream-copied, so a verified vocal is never re-encoded.
"""

from __future__ import annotations

import argparse
import math
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageFilter

try:
    import arabic_reshaper
    from bidi.algorithm import get_display
    HAVE_AR = True
except ImportError:                                   # Latin still works
    HAVE_AR = False

AR_FONT = "/System/Library/Fonts/GeezaPro.ttc"
LATIN_FONT = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"

GOLD = (214, 176, 106)
EMERALD = (10, 46, 36)
STYLES = {
    # name: (top colour, bottom colour, base alpha, alpha gain toward bottom)
    "pink-glass": ((255, 150, 196), (243, 106, 168), 120, 60),
    "cream": ((250, 247, 238), (250, 247, 238), 247, 0),
    "mint-glass": ((150, 230, 205), (86, 196, 168), 120, 60),
    "sky-glass": ((150, 200, 255), (104, 158, 240), 120, 60),
}

CARD_W, CARD_H = 470, 560


def shape(t: str) -> str:
    if HAVE_AR and any("؀" <= c <= "ۿ" for c in t):
        return get_display(arabic_reshaper.reshape(t))
    return t


def is_arabic(t: str) -> bool:
    return any("؀" <= c <= "ۿ" for c in t)


def draw_card(scale, alpha, dy, text, name, style):
    top, bot, a0, again = STYLES[style]
    base = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    w, h = int(360 * scale), int(430 * scale)
    card = Image.new("RGBA", (w + 40, h + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    r = int(48 * scale)
    box = (20, 20, w + 16, h + 16)

    d.rounded_rectangle((22, 26, w + 18, h + 22), r, fill=(0, 0, 0, 70))

    grad = Image.new("RGBA", card.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for i in range(box[1], box[3]):
        t = (i - box[1]) / max(box[3] - box[1], 1)
        col = tuple(int(top[k] + (bot[k] - top[k]) * t) for k in range(3))
        gd.line((box[0], i, box[2], i), fill=col + (int(a0 + again * t),))
    mask = Image.new("L", card.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, r, fill=255)
    card.paste(grad, (0, 0), mask)

    # Glossy sheen. Build it as an ALPHA MASK and alpha_composite it — pasting an
    # RGBA sheen through a rounded-rect mask paints an opaque block over the card.
    sh = Image.new("L", card.size, 0)
    ImageDraw.Draw(sh).rounded_rectangle(
        (box[0] + int(8 * scale), box[1] + int(6 * scale),
         box[2] - int(8 * scale), box[1] + int((h + 16) * 0.40)),
        int(r * 0.9), fill=95)
    sh = sh.filter(ImageFilter.GaussianBlur(max(3, int(14 * scale))))
    gloss = Image.new("RGBA", card.size, (255, 255, 255, 0))
    gloss.putalpha(ImageChops.multiply(sh, mask))
    card.alpha_composite(gloss)

    d = ImageDraw.Draw(card)
    d.rounded_rectangle((box[0] + int(5 * scale), box[1] + int(5 * scale),
                         box[2] - int(5 * scale), box[3] - int(5 * scale)),
                        int(r * 0.92), outline=(255, 255, 255, 150),
                        width=max(2, int(3 * scale)))
    d.rounded_rectangle(box, r, outline=GOLD + (255,), width=max(3, int(6 * scale)))

    font_path = AR_FONT if is_arabic(text) else LATIN_FONT
    f = ImageFont.truetype(font_path, max(10, int(250 * scale)))
    s = shape(text)
    b = d.textbbox((0, 0), s, font=f)
    y = int(45 * scale) if name else int(110 * scale)
    d.text((20 + (w - (b[2] - b[0])) // 2 - b[0], y), s, font=f, fill=EMERALD,
           stroke_width=max(1, int(5 * scale)), stroke_fill=(255, 255, 255, 190))

    if name:
        fn = ImageFont.truetype(LATIN_FONT, max(8, int(62 * scale)))
        bn = d.textbbox((0, 0), name, font=fn)
        d.text((20 + (w - (bn[2] - bn[0])) // 2 - bn[0], int(300 * scale)), name,
               font=fn, fill=EMERALD,
               stroke_width=max(1, int(3 * scale)), stroke_fill=(255, 255, 255, 185))

    if alpha < 1.0:
        card.putalpha(card.getchannel("A").point(lambda a: int(a * alpha)))
    base.alpha_composite(card, (max((CARD_W - card.width) // 2, 0),
                                max((CARD_H - card.height) // 2 + dy, 0)))
    return base


def ease_out_back(t: float) -> float:
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2


def render_seq(outdir: Path, text, name, dur, fps, style):
    outdir.mkdir(parents=True, exist_ok=True)
    pop, fade = 0.42, 0.40
    for i in range(int(dur * fps)):
        t = i / fps
        if t < pop:
            p = ease_out_back(min(t / pop, 1.0))
            scale, alpha, dy = 0.30 + 0.70 * p, min(t / 0.18, 1.0), int(28 * (1 - p))
        elif t > dur - fade:
            p = (t - (dur - fade)) / fade
            scale, alpha, dy = 1.0 + 0.08 * p, 1.0 - p, int(-26 * p)
        else:
            k = (t - pop) * 2.0
            scale, alpha, dy = 1.0 + 0.022 * math.sin(k), 1.0, int(7 * math.sin(k * 0.85))
        draw_card(scale, alpha, dy, text, name, style).save(outdir / f"f_{i:04d}.png")


POS = {
    "bottom-right": ("W-w-{mx}", "H-h-{my}"),
    "bottom-left":  ("{mx}", "H-h-{my}"),
    "top-right":    ("W-w-{mx}", "{my}"),
    "top-left":     ("{mx}", "{my}"),
    "bottom-centre": ("(W-w)/2", "H-h-{my}"),
}


def main() -> int:
    ap = argparse.ArgumentParser(description="overlay animated letter cards on a cut")
    ap.add_argument("--video", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--card", action="append", default=[],
                    metavar="TEXT:NAME:START:DUR", help="repeatable")
    ap.add_argument("--style", default="pink-glass", choices=sorted(STYLES))
    ap.add_argument("--position", default="bottom-right", choices=sorted(POS))
    ap.add_argument("--scale", type=float, default=0.62)
    ap.add_argument("--margin-x", type=int, default=24)
    ap.add_argument("--margin-y", type=int, default=40)
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--keep-frames", metavar="DIR",
                    help="write sequences here instead of a temp dir")
    args = ap.parse_args()

    if not args.card:
        print("need at least one --card TEXT:NAME:START:DUR")
        return 2

    cards = []
    for spec in args.card:
        parts = spec.split(":")
        if len(parts) != 4:
            print(f"bad --card {spec!r}; want TEXT:NAME:START:DUR")
            return 2
        text, name, start, dur = parts
        try:
            cards.append((text, name, float(start), float(dur)))
        except ValueError:
            print(f"bad numbers in --card {spec!r}")
            return 2
    cards.sort(key=lambda c: c[2])

    for i in range(len(cards) - 1):
        if cards[i][2] + cards[i][3] > cards[i + 1][2] + 1e-6:
            print(f"warning: card {i+1} ({cards[i][0]}) overlaps the next one — "
                  f"they will stack at the same position")

    tmp = Path(args.keep_frames) if args.keep_frames else Path(tempfile.mkdtemp())
    try:
        inputs, filters, overlays = [], [], []
        x, y = POS[args.position]
        x = x.format(mx=args.margin_x, my=args.margin_y)
        y = y.format(mx=args.margin_x, my=args.margin_y)

        for i, (text, name, start, dur) in enumerate(cards, 1):
            d = tmp / f"card{i}"
            render_seq(d, text, name, dur, args.fps, args.style)
            inputs += ["-framerate", str(args.fps), "-i", str(d / "f_%04d.png")]
            filters.append(f"[{i}:v]format=rgba,scale=iw*{args.scale}:ih*{args.scale},"
                           f"setpts=PTS-STARTPTS+{start}/TB[c{i}]")
            src = "[0:v]" if i == 1 else f"[v{i-1}]"
            sink = f"[v{i}]" if i < len(cards) else ",format=yuv420p[v]"
            if i < len(cards):
                overlays.append(f"{src}[c{i}]overlay=x={x}:y={y}:"
                                f"enable='between(t,{start},{start+dur})'{sink}")
            else:
                overlays.append(f"{src}[c{i}]overlay=x={x}:y={y}:"
                                f"enable='between(t,{start},{start+dur})'{sink}")

        chain = ";".join(filters + overlays)
        cmd = (["ffmpeg", "-v", "error", "-y", "-i", args.video] + inputs +
               ["-filter_complex", chain, "-map", "[v]", "-map", "0:a",
                "-r", str(args.fps), "-c:v", "libx264", "-crf", "18",
                "-preset", "medium", "-c:a", "copy",     # never re-encode a verified vocal
                "-movflags", "+faststart", args.out])
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode:
            print(r.stderr[-1500:])
            return 1
    finally:
        if not args.keep_frames:
            shutil.rmtree(tmp, ignore_errors=True)

    def dur_of(stream):
        return subprocess.run(["ffprobe", "-v", "error", "-select_streams", stream,
                               "-show_entries", "stream=duration", "-of", "csv=p=0",
                               args.out], capture_output=True, text=True).stdout.strip()
    print(f"{args.out}\n  {len(cards)} cards · {args.style} · {args.position}")
    print(f"  video {dur_of('v')}s  audio {dur_of('a')}s (stream-copied)")
    print("\nNow LOOK at a frame from each card: does it cover a face?")
    return 0


if __name__ == "__main__":
    sys.exit(main())
