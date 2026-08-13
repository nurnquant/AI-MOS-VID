#!/usr/bin/env python3
"""0036 V2 captions — render PNG sequences timed to the spoken words.

    python3 captions.py quiet    # the recommendation
    python3 captions.py kinetic  # the comparison

Timings come from whisper's word-level output in words.json, so the caption
changes when he actually says the words rather than on a guessed schedule.

Whisper mishears words that are not English — "deen" as "Dean", "Dua" as
"Do I" — so the DISPLAY text is authored here and only the TIMING is taken from
the transcript. Never print the transcript at a viewer.
"""
import json, sys, shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = Path(__file__).parent
W, H, FPS = 720, 1280, 24
STYLE = (sys.argv[1] if len(sys.argv) > 1 else "quiet").lower()

SANS_B = "/System/Library/Fonts/HelveticaNeue.ttc"      # index 1 = Bold
COND = "/System/Library/Fonts/Avenir Next Condensed.ttc"
CREAM = (247, 244, 236, 255)
GOLD = (222, 184, 118, 255)
DARK = (6, 20, 14)

# Reels and Stories cover the bottom fifth; nothing readable may sit below this.
SAFE_BOTTOM = 1044

# Chunks are authored, not derived. Each is (display text, gold word, first word
# index, last word index) into that clip's whisper words. The gold word is the
# one the sentence turns on.
CHUNKS = {
 "A": [("You think you're not teaching",  "teaching",  0, 5),
       ("your child deen.",               "deen",      5, 7),
       ("You are.",                       "are",       8, 9),
       ("You just don't count it.",       "count",    10, 14)],
 "B": [("Bismillah before you left the house.", "Bismillah", 0, 5),
       ("They heard it.",                       "heard",     6, 8),
       ("Alhamdulillah when you",               "Alhamdulillah", 9, 11),
       ("were exhausted.",                      "exhausted",   12, 13)],
 "C": [("You apologised",              "apologised", 0, 1),
       ("when you were wrong.",        "wrong",      2, 5),
       ("Dua out loud",                "Dua",        6, 9),
       ("when the news was bad.",      "bad",       10, 14)],
 "D": [("They learn deen",                 "deen",  0, 2),
       ("the way they learned to talk.",   "way",   3, 8),
       ("From you.",                       "From",  9, 10)],
}


def font(size, cond=False):
    return (ImageFont.truetype(COND, size) if cond
            else ImageFont.truetype(SANS_B, size, index=1))


def gradient():
    """A rise from the bottom, not a slab. The room stays visible."""
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    top = H - 430
    for i in range(430):
        a = int(165 * (i / 430) ** 1.5)
        d.rectangle([0, top + i, W, top + i + 1], fill=DARK + (a,))
    return g.filter(ImageFilter.GaussianBlur(3))


GRAD = gradient()


def halo(d, xy, text, f, fill, r=3):
    x, y = xy
    for dx in range(-r, r + 1):
        for dy in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                d.text((x + dx, y + dy), text, font=f, fill=(0, 0, 0, 175))
    d.text((x, y), text, font=f, fill=fill)


def wrap(d, words, f, maxw):
    rows, cur = [], []
    for w in words:
        t = " ".join(cur + [w])
        if d.textlength(t, font=f) <= maxw or not cur:
            cur.append(w)
        else:
            rows.append(cur); cur = [w]
    if cur:
        rows.append(cur)
    return rows


def render(text, gold, prog, kinetic):
    """prog 0..1 drives the entrance: a short rise and fade, never a bounce."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if not kinetic:
        img = Image.alpha_composite(img, GRAD)
    d = ImageDraw.Draw(img)

    # Shrink until every row actually fits. Wrapping alone cannot help a single
    # word that is wider than the column — "BISMILLAH" in condensed caps ran to
    # the frame edge — so the size is fitted rather than assumed.
    # Uppercase BEFORE measuring. Measuring mixed case and rendering caps is
    # what pushed "BISMILLAH BEFORE YOU LEFT" off the right edge — caps are wider.
    src = [w.upper() for w in text.split()] if kinetic else text.split()
    maxw = W - (132 if kinetic else 96)
    size = 58 if kinetic else 52
    while size > 30:
        f = font(size, cond=kinetic)
        rows = wrap(d, src, f, maxw)
        if all(d.textlength(" ".join(r), font=f) <= maxw for r in rows):
            break
        size -= 2
    lh = int(size * 1.28)

    ease = 1 - (1 - min(prog, 1.0)) ** 3          # ease-out, settles quickly
    lift = int(26 * (1 - ease))
    alpha = int(255 * min(1.0, ease * 1.25))

    block = lh * len(rows)
    y = min(H - 250 - block // 2, SAFE_BOTTOM - block) + lift

    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    for row in rows:
        total = sum(ld.textlength(w + " ", font=f) for w in row) - ld.textlength(" ", font=f)
        x = (W - total) / 2
        for w in row:
            hot = w.strip(".,!?").lower() == gold.strip(".,!?").lower()
            halo(ld, (x, y), w, f, GOLD if hot else CREAM, r=4 if kinetic else 3)
            x += ld.textlength(w + " ", font=f)
        y += lh

    if alpha < 255:
        layer.putalpha(layer.getchannel("A").point(lambda v: v * alpha // 255))
    return Image.alpha_composite(img, layer)


out = HERE / f"cap-{STYLE}"
if out.exists():
    shutil.rmtree(out)
out.mkdir()

words = json.loads((HERE / "words.json").read_text())
kinetic = STYLE == "kinetic"
plan = []

for clip, chunks in CHUNKS.items():
    ws = words[clip]
    starts = [ws[a]["s"] for _, _, a, _ in chunks]
    n = 0
    for text, gold, a, b in chunks:
        start = ws[a]["s"]
        end = ws[min(b, len(ws) - 1)]["e"] + 0.32      # let the last word breathe
        # Never let one chunk still be on screen when the next arrives — two
        # captions at once is the fastest way to make a frame unreadable.
        if n + 1 < len(chunks):
            end = min(end, starts[n + 1] - 0.02)
        # The first chunk of clip A is pinned to 0.0: a muted viewer must be able
        # to read the claim before he has said a word, or the scroll is lost.
        if clip == "A" and n == 0:
            start = 0.0
        frames = max(1, int(round((end - start) * FPS)))
        seqdir = out / f"{clip}{n}"
        seqdir.mkdir()
        for i in range(frames):
            render(text, gold, i / (0.16 * FPS), kinetic).save(seqdir / f"{i:04d}.png")
        plan.append({"clip": clip, "i": n, "start": round(start, 3),
                     "dur": round(frames / FPS, 3), "text": text})
        n += 1

(out / "plan.json").write_text(json.dumps(plan, indent=1))
print(f"{STYLE}: {len(plan)} chunks")
for p in plan:
    print(f"  {p['clip']}{p['i']}  {p['start']:5.2f} +{p['dur']:4.2f}s  {p['text']}")
