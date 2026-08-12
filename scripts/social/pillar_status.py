#!/usr/bin/env python3
"""Generate pillar folders, per-pillar TODO.md files, and the index from the manifest.

The manifest at library/pillars/manifest.json is the single source of truth.
Edit a post's "status" there, re-run this script, and every TODO and the index
refresh to match.

    python3 scripts/social/pillar_status.py            # write files
    python3 scripts/social/pillar_status.py --check     # print summary only
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PILLARS_DIR = REPO / "library" / "pillars"
MANIFEST = PILLARS_DIR / "manifest.json"

# status -> (checkbox, label)
STATUS = {
    "todo": ("[ ]", "todo"),
    "master_done": ("[~]", "master generated"),
    "exported": ("[~]", "master + exports done"),
    "captioned": ("[~]", "ready to publish"),
    "published": ("[x]", "published"),
    "blocked": ("[!]", "BLOCKED"),
}

STEP_ORDER = ["todo", "master_done", "exported", "captioned", "published"]


def load() -> dict:
    with MANIFEST.open() as f:
        return json.load(f)


def pillar_todo(pillar: dict) -> str:
    lines: list[str] = []
    a = lines.append

    a(f"# Pillar {pillar['n']} — {pillar['name']}")
    a("")
    a(f"**Posting day:** {pillar['day']} · **Funnel stage:** {pillar['funnel']}")
    a("")
    a(pillar["note"])
    a("")
    a("Status lives in `library/pillars/manifest.json`. Edit it there, then run")
    a("`python3 scripts/social/pillar_status.py` to refresh this file.")
    a("")
    a("Legend: `[ ]` todo · `[~]` in progress · `[x]` published · `[!]` blocked")
    a("")

    a("## Pipeline per post")
    a("")
    a("1. **Master** — 1:1 @ 4k via nano_banana_pro (4cr) → `masters/`")
    a("2. **Export** — `reframe.py <master> --all --outdir exports/` (free)")
    a("3. **Compose** — hook text + watermark locally (free)")
    a("4. **Caption** — append to `captions.md` in this folder")
    a("")

    counts: dict[str, int] = {}
    for post in pillar["posts"]:
        counts[post["status"]] = counts.get(post["status"], 0) + 1
    summary = " · ".join(f"{v} {STATUS[k][1]}" for k, v in sorted(counts.items()))
    a(f"**This pillar:** {len(pillar['posts'])} posts — {summary}")
    a("")

    a("## Posts")
    a("")
    for post in pillar["posts"]:
        box, label = STATUS[post["status"]]
        a(f"- {box} **{post['id']} {post['title']}** — _{label}_")
        a(f"  - Hook: {post['hook']}")
        if post.get("blocker"):
            a(f"  - ⛔ **Needs:** {post['blocker']}")
        if post.get("note"):
            a(f"  - Note: {post['note']}")
        if post.get("existing"):
            a(f"  - Existing asset: `{post['existing']}`")
        if post.get("dua_tr"):
            a(f"  - Dua: {post['dua_ar']} — _{post['dua_tr']}_ — \"{post['dua_en']}\"")
        if post.get("options"):
            a(f"  - Poll options: {post['options']}")
        if post.get("format"):
            a(f"  - Format: {post['format']}")
        if post.get("layout"):
            a(f"  - Layout: {post['layout']}")
        if post.get("prompt"):
            a(f"  - Crop focus: `{post.get('focus', 'center')}`")
        a(f"  - Hashtags: {post['hashtags']}")
        a("")

    buildable = [p for p in pillar["posts"] if p["status"] == "todo" and p.get("prompt")]
    if buildable:
        a("## Master generation queue")
        a("")
        a(f"{len(buildable)} masters to generate = **{len(buildable) * 4} credits**")
        a("")
        for post in buildable:
            a(f"- `{post['id']}` {post['title']}")
        a("")

    return "\n".join(lines) + "\n"


def index(data: dict) -> str:
    lines: list[str] = []
    a = lines.append

    a("# Social Pillars — Master Index")
    a("")
    a("Generated from `manifest.json` by `scripts/social/pillar_status.py`.")
    a("Plan detail: `library/social-package-v4.md`")
    a("")

    a("## Folder layout")
    a("")
    a("```")
    a("library/pillars/")
    a("  manifest.json          <- single source of truth, edit status here")
    a("  TODO-INDEX.md          <- this file (generated)")
    a("  <n>-<slug>/")
    a("    TODO.md              <- per-pillar checklist (generated)")
    a("    captions.md          <- FB/IG post descriptions")
    a("    masters/             <- 1:1 @ 4k originals, one per post")
    a("    exports/             <- reframed per platform (free to regenerate)")
    a("```")
    a("")

    a("## Aspect ratio workflow")
    a("")
    a("Masters are square 4K so every platform ratio is a **crop, never an upscale**.")
    a("")
    a("```bash")
    a("# every platform preset at once")
    a("python3 scripts/social/reframe.py masters/1.5-wudu-together-master.png \\")
    a("    --all --outdir exports/ --logo")
    a("")
    a("# a single platform, crop biased upward to keep faces in frame")
    a("python3 scripts/social/reframe.py masters/1.5-wudu-together-master.png \\")
    a("    --preset fb_landscape --focus upper --outdir exports/")
    a("")
    a("# any custom ratio")
    a("python3 scripts/social/reframe.py master.png --ratio 21:9 --size 2560x1097")
    a("```")
    a("")
    a("| Preset | Ratio | Pixels | Use |")
    a("| --- | --- | --- | --- |")
    a("| `ig_feed` | 4:5 | 1080×1350 | Instagram feed, Facebook portrait |")
    a("| `fb_landscape` | 16:9 | 1920×1080 | Facebook landscape, YouTube |")
    a("| `reel` | 9:16 | 1080×1920 | Reels, Stories, TikTok, Shorts |")
    a("| `pinterest` | 2:3 | 1000×1500 | Pinterest pins |")
    a("| `square` | 1:1 | 1080×1080 | Square feed, profile grid |")
    a("")

    totals: dict[str, int] = {}
    a("## Progress")
    a("")
    a("| # | Pillar | Day | Posts | Todo | In progress | Published | Blocked |")
    a("| --- | --- | --- | --- | --- | --- | --- | --- |")
    for pillar in data["pillars"]:
        c: dict[str, int] = {}
        for post in pillar["posts"]:
            c[post["status"]] = c.get(post["status"], 0) + 1
            totals[post["status"]] = totals.get(post["status"], 0) + 1
        inprog = sum(c.get(k, 0) for k in ("master_done", "exported", "captioned"))
        a(
            f"| {pillar['n']} | [{pillar['name']}]({pillar['n']}-{pillar['slug']}/TODO.md) "
            f"| {pillar['day']} | {len(pillar['posts'])} | {c.get('todo', 0)} "
            f"| {inprog} | {c.get('published', 0)} | {c.get('blocked', 0)} |"
        )
    total_posts = sum(len(p["posts"]) for p in data["pillars"])
    inprog_all = sum(totals.get(k, 0) for k in ("master_done", "exported", "captioned"))
    a(
        f"| | **Total** | | **{total_posts}** | **{totals.get('todo', 0)}** "
        f"| **{inprog_all}** | **{totals.get('published', 0)}** "
        f"| **{totals.get('blocked', 0)}** |"
    )
    a("")

    queue = [
        p
        for pillar in data["pillars"]
        for p in pillar["posts"]
        if p["status"] == "todo" and p.get("prompt")
    ]
    a(f"**Masters to generate: {len(queue)} × 4cr = {len(queue) * 4} credits "
      f"(~${len(queue) * 4 * 0.033:.2f})**")
    a("")
    a("Exports, composition, carousels and Pinterest variants are local — free.")
    a("")

    blocked = [
        (pillar["name"], p)
        for pillar in data["pillars"]
        for p in pillar["posts"]
        if p["status"] == "blocked"
    ]
    if blocked:
        a("## Blocked — needs client input")
        a("")
        for name, post in blocked:
            a(f"- **{post['id']} {post['title']}** ({name}) — {post.get('blocker', 'see manifest')}")
        a("")

    return "\n".join(lines) + "\n"


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--check", action="store_true", help="print summary, write nothing")
    args = p.parse_args()

    data = load()

    for pillar in data["pillars"]:
        folder = PILLARS_DIR / f"{pillar['n']}-{pillar['slug']}"
        if not args.check:
            (folder / "masters").mkdir(parents=True, exist_ok=True)
            (folder / "exports").mkdir(parents=True, exist_ok=True)
            (folder / "TODO.md").write_text(pillar_todo(pillar))
            captions = folder / "captions.md"
            if not captions.exists():
                captions.write_text(
                    f"# Pillar {pillar['n']} — {pillar['name']} — Post Captions\n\n"
                    "Written after each image is produced. One section per post.\n"
                )
        c: dict[str, int] = {}
        for post in pillar["posts"]:
            c[post["status"]] = c.get(post["status"], 0) + 1
        print(f"  {pillar['n']} {pillar['name']:<28} {len(pillar['posts'])} posts  {c}")

    if not args.check:
        (PILLARS_DIR / "TODO-INDEX.md").write_text(index(data))
        print(f"\nwrote TODO.md x{len(data['pillars'])} + TODO-INDEX.md under {PILLARS_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
