#!/usr/bin/env python3
"""Export every pillar master into all platform presets, in one process.

Reads crop focus per post from library/pillars/manifest.json.
Skips exports that are already newer than their master, so re-runs are cheap.

    python3 scripts/social/export_all.py
    python3 scripts/social/export_all.py --pillar 4 --force
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image

import reframe as rf  # same directory

REPO = Path(__file__).resolve().parents[2]
PILLARS = REPO / "library" / "pillars"


def focus_map() -> dict[str, str]:
    with (PILLARS / "manifest.json").open() as f:
        data = json.load(f)
    out: dict[str, str] = {}
    for pillar in data["pillars"]:
        for post in pillar["posts"]:
            out[post["id"]] = post.get("focus", "center")
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pillar", type=int, help="only this pillar number")
    ap.add_argument("--force", action="store_true", help="re-export even if up to date")
    args = ap.parse_args()

    focuses = focus_map()
    made = skipped = 0

    dirs = sorted(PILLARS.glob("*/"))
    for pdir in dirs:
        if not (pdir / "masters").is_dir():
            continue
        if args.pillar and not pdir.name.startswith(f"{args.pillar}-"):
            continue

        exports = pdir / "exports"
        exports.mkdir(exist_ok=True)

        for master in sorted((pdir / "masters").glob("*-master.png")):
            post_id = master.name.split("-", 1)[0]
            focus = rf.FOCUS_NAMES[focuses.get(post_id, "center")]
            stem = master.stem[: -len("-master")]

            img = None
            for preset, (rw, rh, ow, oh, _) in rf.PRESETS.items():
                out = exports / f"{stem}-{preset}.png"
                if not args.force and out.exists() and out.stat().st_mtime >= master.stat().st_mtime:
                    skipped += 1
                    continue
                if img is None:
                    img = Image.open(master).convert("RGB")  # load once per master
                cropped = rf.crop_to_ratio(img, rw, rh, focus)
                final = cropped.resize((ow, oh), Image.LANCZOS)
                final = rf.add_logo(final, "bottom-left")
                final.save(out, quality=95)
                made += 1
            print(f"  {pdir.name}/{stem}  focus={focuses.get(post_id, 'center')}")

    print(f"\nexported {made} files, skipped {skipped} already current")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
