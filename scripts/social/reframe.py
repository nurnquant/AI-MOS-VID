#!/usr/bin/env python3
"""Reframe a master social image into any platform aspect ratio.

Masters are generated square (1:1) at 4K so every target ratio is a crop, never
an upscale. Crops are centre-weighted by default; use --focus to bias toward the
part of the frame that matters (faces are usually above centre).

Examples
--------
# one target
reframe.py master.png --preset ig_feed

# every preset at once, into ./out
reframe.py master.png --all --outdir out

# bias the crop upward (keeps heads in frame on wide crops)
reframe.py master.png --preset fb_landscape --focus 0.5,0.38

# arbitrary ratio + explicit output size
reframe.py master.png --ratio 21:9 --size 2560x1097

# add the brand watermark while reframing
reframe.py master.png --all --watermark bottom-left
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parents[2]
LOGO = REPO / "suppliedMedia" / "Riwaq_Logo_V6_Circle_Transparent.png"
GEORGIA_BI = "/System/Library/Fonts/Supplemental/Georgia Bold Italic.ttf"

# preset -> (ratio_w, ratio_h, out_w, out_h, description)
PRESETS: dict[str, tuple[int, int, int, int, str]] = {
    "ig_feed": (4, 5, 1080, 1350, "Instagram feed / Facebook feed portrait"),
    "fb_landscape": (16, 9, 1920, 1080, "Facebook feed landscape / YouTube"),
    "reel": (9, 16, 1080, 1920, "Reels / Stories / TikTok / Shorts"),
    "pinterest": (2, 3, 1000, 1500, "Pinterest pin"),
    "square": (1, 1, 1080, 1080, "Square feed / profile grid"),
}

FOCUS_NAMES: dict[str, tuple[float, float]] = {
    "center": (0.5, 0.5),
    "top": (0.5, 0.28),
    "upper": (0.5, 0.38),
    "bottom": (0.5, 0.72),
    "left": (0.28, 0.5),
    "right": (0.72, 0.5),
}

GOLD = (217, 176, 108, 140)
SHADOW = (0, 0, 0, 110)


def parse_focus(value: str) -> tuple[float, float]:
    if value in FOCUS_NAMES:
        return FOCUS_NAMES[value]
    try:
        x_str, y_str = value.split(",")
        x, y = float(x_str), float(y_str)
    except ValueError:
        raise argparse.ArgumentTypeError(
            f"--focus must be one of {sorted(FOCUS_NAMES)} or 'x,y' in 0..1"
        ) from None
    if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0):
        raise argparse.ArgumentTypeError("--focus x,y must both be within 0..1")
    return x, y


def parse_ratio(value: str) -> tuple[int, int]:
    try:
        w_str, h_str = value.replace("x", ":").split(":")
        w, h = int(w_str), int(h_str)
    except ValueError:
        raise argparse.ArgumentTypeError("--ratio must look like 4:5") from None
    if w <= 0 or h <= 0:
        raise argparse.ArgumentTypeError("--ratio parts must be positive")
    return w, h


def parse_size(value: str) -> tuple[int, int]:
    try:
        w_str, h_str = value.lower().split("x")
        w, h = int(w_str), int(h_str)
    except ValueError:
        raise argparse.ArgumentTypeError("--size must look like 1080x1350") from None
    if w <= 0 or h <= 0:
        raise argparse.ArgumentTypeError("--size parts must be positive")
    return w, h


def crop_to_ratio(
    img: Image.Image, ratio_w: int, ratio_h: int, focus: tuple[float, float]
) -> Image.Image:
    """Largest crop of the requested ratio, positioned around the focus point."""
    src_w, src_h = img.size
    target = ratio_w / ratio_h

    if src_w / src_h > target:
        # source is wider than target: full height, trim width
        crop_h = src_h
        crop_w = round(src_h * target)
    else:
        # source is taller than target: full width, trim height
        crop_w = src_w
        crop_h = round(src_w / target)

    crop_w = min(crop_w, src_w)
    crop_h = min(crop_h, src_h)

    # centre the crop on the focus point, then clamp inside the frame
    left = round(focus[0] * src_w - crop_w / 2)
    top = round(focus[1] * src_h - crop_h / 2)
    left = max(0, min(left, src_w - crop_w))
    top = max(0, min(top, src_h - crop_h))

    return img.crop((left, top, left + crop_w, top + crop_h))


def add_watermark(img: Image.Image, position: str, text: str = "Riwaq al Ilm") -> Image.Image:
    """Gold Georgia Bold Italic wordmark at ~55% opacity, scaled to the frame."""
    img = img.convert("RGBA")
    w, h = img.size
    # ~3.4% of the shorter edge keeps the mark consistent across ratios
    font_size = max(18, round(min(w, h) * 0.034))
    try:
        font = ImageFont.truetype(GEORGIA_BI, font_size)
    except OSError:
        font = ImageFont.load_default()

    scratch = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    bbox = scratch.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]

    layer = Image.new("RGBA", (tw + 8, th + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    off_x, off_y = 4 - bbox[0], 4 - bbox[1]
    d.text((off_x + 2, off_y + 2), text, font=font, fill=SHADOW)
    d.text((off_x, off_y), text, font=font, fill=GOLD)

    margin = round(min(w, h) * 0.035)
    lw, lh = layer.size
    spots = {
        "bottom-left": (margin, h - lh - margin),
        "bottom-right": (w - lw - margin, h - lh - margin),
        "top-left": (margin, margin),
        "top-right": (w - lw - margin, margin),
    }
    if position not in spots:
        raise SystemExit(f"unknown watermark position {position!r}; pick one of {sorted(spots)}")

    img.alpha_composite(layer, spots[position])
    return img.convert("RGB")


def add_logo(img: Image.Image, position: str = "bottom-left", frac: float = 0.075) -> Image.Image:
    """Small alpha-cropped logo mark, sized as a fraction of the shorter edge."""
    if not LOGO.exists():
        raise SystemExit(f"logo not found at {LOGO}")
    img = img.convert("RGBA")
    w, h = img.size
    logo = Image.open(LOGO)
    logo = logo.crop(logo.getbbox())
    target_w = max(24, round(min(w, h) * frac))
    logo = logo.resize((target_w, round(logo.height * target_w / logo.width)), Image.LANCZOS)
    alpha = logo.getchannel("A").point(lambda a: int(a * 0.72))
    logo.putalpha(alpha)

    margin = round(min(w, h) * 0.035)
    lw, lh = logo.size
    spots = {
        "bottom-left": (margin, h - lh - margin),
        "bottom-right": (w - lw - margin, h - lh - margin),
        "top-left": (margin, margin),
        "top-right": (w - lw - margin, margin),
    }
    img.alpha_composite(logo, spots[position])
    return img.convert("RGB")


def build(
    master: Path,
    ratio: tuple[int, int],
    size: tuple[int, int] | None,
    focus: tuple[float, float],
    outfile: Path,
    watermark: str | None,
    logo: str | None,
) -> tuple[int, int]:
    img = Image.open(master).convert("RGB")
    cropped = crop_to_ratio(img, ratio[0], ratio[1], focus)

    if size:
        if size[0] > cropped.width or size[1] > cropped.height:
            print(
                f"  ! upscaling {cropped.width}x{cropped.height} -> {size[0]}x{size[1]}"
                " (master is smaller than the target)",
                file=sys.stderr,
            )
        final = cropped.resize(size, Image.LANCZOS)
    else:
        final = cropped

    if watermark:
        final = add_watermark(final, watermark)
    if logo:
        final = add_logo(final, logo)

    outfile.parent.mkdir(parents=True, exist_ok=True)
    final.save(outfile, quality=95)
    return final.size


def main() -> int:
    p = argparse.ArgumentParser(
        description="Reframe a master social image into platform aspect ratios.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="presets:\n"
        + "\n".join(
            f"  {k:<14} {w}:{h:<6} {ow}x{oh:<6} {desc}"
            for k, (w, h, ow, oh, desc) in PRESETS.items()
        ),
    )
    p.add_argument("master", type=Path, help="master image (square 4K recommended)")
    p.add_argument("--preset", choices=sorted(PRESETS), action="append", help="repeatable")
    p.add_argument("--all", action="store_true", help="render every preset")
    p.add_argument("--ratio", type=parse_ratio, help="custom ratio, e.g. 21:9")
    p.add_argument("--size", type=parse_size, help="explicit output pixels, e.g. 1080x1350")
    p.add_argument(
        "--focus",
        type=parse_focus,
        default="center",
        help="crop anchor: center|top|upper|bottom|left|right, or 'x,y' in 0..1",
    )
    p.add_argument("--outdir", type=Path, help="output directory (default: alongside master)")
    p.add_argument("--suffix", default="", help="extra text before the ratio in the filename")
    p.add_argument(
        "--watermark",
        nargs="?",
        const="bottom-left",
        help="add the wordmark: bottom-left|bottom-right|top-left|top-right",
    )
    p.add_argument(
        "--logo",
        nargs="?",
        const="bottom-left",
        help="add the logo mark: bottom-left|bottom-right|top-left|top-right",
    )
    args = p.parse_args()

    if not args.master.exists():
        raise SystemExit(f"master not found: {args.master}")

    jobs: list[tuple[str, tuple[int, int], tuple[int, int] | None]] = []
    if args.all:
        jobs += [(name, (w, h), (ow, oh)) for name, (w, h, ow, oh, _) in PRESETS.items()]
    for name in args.preset or []:
        w, h, ow, oh, _ = PRESETS[name]
        jobs.append((name, (w, h), (ow, oh)))
    if args.ratio:
        label = f"{args.ratio[0]}x{args.ratio[1]}"
        jobs.append((label, args.ratio, args.size))
    if not jobs:
        raise SystemExit("nothing to do: pass --preset, --all, or --ratio")

    # --size overrides the preset output when a single job was requested
    if args.size and len(jobs) == 1:
        jobs = [(jobs[0][0], jobs[0][1], args.size)]

    outdir = args.outdir or args.master.parent
    stem = args.master.stem
    if stem.endswith("-master"):
        stem = stem[: -len("-master")]

    print(f"master: {args.master}  ({Image.open(args.master).size[0]}x"
          f"{Image.open(args.master).size[1]})")
    for label, ratio, size in jobs:
        mid = f"-{args.suffix}" if args.suffix else ""
        outfile = outdir / f"{stem}{mid}-{label}.png"
        w, h = build(
            args.master, ratio, size, args.focus, outfile, args.watermark, args.logo
        )
        print(f"  {label:<14} {w}x{h:<10} -> {outfile}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
