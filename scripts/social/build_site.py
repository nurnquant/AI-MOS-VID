#!/usr/bin/env python3
"""Assemble a deployable copy of the production dashboard.

    python3 scripts/social/build_site.py

Writes site/ — the generated index.html with every media path rewritten to a
local media/ folder, plus the assets themselves.

This is the INTERNAL dashboard: it carries costs, editor ratings, parked work
and the idea backlog with its sign-off gates. It must only ever go out behind
Vercel Deployment Protection. See site/README.md.

Only ONE primary deliverable per production is shipped, and posters are resized
to web scale — the full tree is 2.1 GB and none of it belongs in a deployment.
"""
from __future__ import annotations
import json, re, shutil, subprocess, sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PROD = REPO / "productions"
SITE = REPO / "site"
MEDIA_EXT = {".mp4", ".mov", ".png", ".jpg", ".jpeg", ".webp"}
POSTER_MAX = 1440          # 4K masters are 98 MB across the set; nobody needs that in a browser


def main() -> int:
    subprocess.run([sys.executable, str(REPO / "scripts/social/productions.py")],
                   check=True, capture_output=True)

    if SITE.exists():
        shutil.rmtree(SITE)
    (SITE / "media").mkdir(parents=True)

    html = (PROD / "index.html").read_text()
    reg = json.loads((PROD / "registry.json").read_text())
    folders = {e["folder"].split("/")[-1] for e in reg["productions"]}

    shipped: dict[str, str] = {}
    kept = dropped = 0
    vid_bytes = img_bytes = 0

    for e in reg["productions"]:
        base = e["folder"].split("/")[-1]
        out = PROD / base / "OUTPUT"
        if not out.is_dir():
            continue
        vids = sorted(f for f in out.iterdir() if f.suffix.lower() in {".mp4", ".mov"})
        imgs = sorted(f for f in out.iterdir()
                      if f.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"})
        dest = SITE / "media" / base
        # one video and one poster each: the card only ever previews the first
        for src in (vids[:1] + imgs[:1]):
            dest.mkdir(parents=True, exist_ok=True)
            rel = f"{base}/OUTPUT/{src.name}"
            if src.suffix.lower() in {".mp4", ".mov"}:
                shutil.copy2(src, dest / src.name)
                shipped[rel] = f"media/{base}/{src.name}"
                vid_bytes += (dest / src.name).stat().st_size
            else:
                jpg = dest / (src.stem + ".jpg")
                shrink(src, jpg)
                shipped[rel] = f"media/{base}/{jpg.name}"
                img_bytes += jpg.stat().st_size
            kept += 1

    def rewrite(m: re.Match) -> str:
        attr, path = m.group(1), m.group(2)
        from urllib.parse import unquote, quote
        raw = unquote(path)
        if Path(raw).suffix.lower() not in MEDIA_EXT:
            return m.group(0)
        if raw in shipped:
            return f'{attr}="{quote(shipped[raw])}"'
        nonlocal dropped
        dropped += 1
        # not shipped: point at nothing rather than at a 404 that looks like a bug
        return f'{attr}="#" data-missing="1"'

    html = re.sub(r'(src|href)="([^"]+)"', rewrite, html)
    # folder links go nowhere in a deployment
    html = re.sub(r'<a class="btn" href="[^"]*/"[^>]*>folder</a>', "", html)
    html = html.replace("<title>Riwaq Productions</title>",
                        "<title>Riwaq Productions — internal</title>")
    html = html.replace('<h1>Riwaq Al Ilm — Productions</h1>',
                        '<h1>Riwaq Al Ilm — Productions</h1>\n'
                        '  <div class="sub" style="color:#c2564a">Internal. '
                        'Costs, ratings, parked work and the idea backlog. '
                        'Not for sharing outside the team.</div>')
    (SITE / "index.html").write_text(html)

    (SITE / "vercel.json").write_text(json.dumps({
        "buildCommand": None, "outputDirectory": ".", "framework": None,
        "headers": [{"source": "/(.*)",
                     "headers": [{"key": "X-Robots-Tag",
                                  "value": "noindex, nofollow, noarchive"}]}],
    }, indent=2) + "\n")

    (SITE / "README.md").write_text(
        "# site/ — generated, do not edit\n\n"
        "Built by `scripts/social/build_site.py`. Regenerate; never hand-edit.\n\n"
        "**This is the internal dashboard.** It shows per-production costs, editor\n"
        "ratings including the low ones, parked work, and the idea backlog with its\n"
        "sign-off gates. It must only be deployed behind Vercel Deployment\n"
        "Protection, and `X-Robots-Tag: noindex` is set as a second line of defence.\n\n"
        "One primary video and one poster per production are shipped; posters are\n"
        "resized. The full tree is 2.1 GB and stays local.\n")

    total = sum(f.stat().st_size for f in SITE.rglob("*") if f.is_file())
    print(f"  site/ built: {kept} assets kept, {dropped} links neutralised")
    print(f"  video {vid_bytes/1e6:.0f} MB · posters {img_bytes/1e6:.0f} MB · "
          f"total {total/1e6:.0f} MB")
    return 0


def shrink(src: Path, dest: Path) -> None:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src),
                    "-vf", f"scale='min({POSTER_MAX},iw)':-2", "-q:v", "4", str(dest)],
                   check=True)


if __name__ == "__main__":
    raise SystemExit(main())
