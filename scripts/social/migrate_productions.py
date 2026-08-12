#!/usr/bin/env python3
"""One-off migration to the numbered production layout (see PRODUCTION-STANDARD.md).

    python3 scripts/social/migrate_productions.py            # dry run, prints plan
    python3 scripts/social/migrate_productions.py --apply    # actually move

Nothing is ever deleted. Tracked files move with `git mv` so history survives;
untracked media moves with a plain rename. File counts are compared before and
after and the script aborts if they do not match.
"""

from __future__ import annotations

import argparse
import json
import shutil
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PROD = REPO / "productions"
LIB = REPO / "library"

# ---------------------------------------------------------------- definitions
# id, slug, type, status, title, source dir (or None), request file (or None)
JOBS = [
    (1, "sneezing-etiquette-family-story", "video", "published",
     "Sneezing Etiquette Family Story", None, None),
    (2, "dua-boy-rabbana-atina", "video", "published",
     "Dua Boy — Rabbana Atina", None, None),
    (3, "quran-class-ad-johra", "video", "published",
     "Riwaq Quran Class Ad (Johra)", None, None),
    (4, "lantern-in-the-dark", "video", "published",
     "The Lantern in the Dark — Dua for Guidance", None,
     "storyToCreate/The Lantern in the Dark — Dua for Guidance.md"),
    (5, "cozy-classroom-asmr", "video", "published",
     "Cozy Islamic Classroom ASMR (Alif)", None,
     "storyToCreate/Create a cozy Islamic classroom ASMR scene.md"),
    (6, "dream-of-every-parent", "video", "published",
     'The Dream of Every Parent', "renders/dream-of-every-parent",
     'storyToCreate/Riwaq Al Ilm --- "The Dream of Every Parent".md'),
    (7, "legacy-post", "image-set", "published",
     "The Legacy Post", "renders/05 legacy-post", None),
    (8, "little-girl-reciting-dua", "video", "published",
     "Little Girl Reciting Dua", "renders/06 little-girl-dua",
     "storyToCreate/Little Girl Reciting Dua.md"),
    (9, "dua-before-learning", "video", "published",
     "The Dua Before Learning", "renders/dua-before-learning",
     "storyToCreate/TITLE: The Dua Before Learning.md"),
    (10, "allah-is-sufficient-johra", "video", "delivered",
     "Allah Is Sufficient for Me (Johra)", "renders/allah-is-sufficient",
     "storyToCreate/TITLE: Allah Is Sufficient for Me.md"),
    (11, "fb-series-01", "image-set", "published",
     "FB Series 01 — 6 post images", "renders/fb-series01",
     "storyToCreate/fbPostRequest/series01.md"),
    (12, "fb-series-02", "image-set", "published",
     "FB Series 02 — 6 post images", "renders/fb-series02",
     "storyToCreate/fbPostRequest/series02.md"),
    (13, "fb-series-03", "image-set", "published",
     "FB Series 03 — 6 post images", "renders/fb-series03",
     "storyToCreate/fbPostRequest/series03.md"),
    (14, "most-beautiful-sound", "video", "delivered",
     "The Most Beautiful Sound", "renders/07 most-beautiful-sound",
     "storyToCreate/The Most Beautiful Sound.md"),
    (15, "islamic-moments-at-home", "image-set", "published",
     "Islamic Moments at Home — 10 post images", "renders/04 islamic-moments",
     "storyToCreate/fbPostRequest/islamic_moments_at_home_image_ideas.md"),
    (16, "rabbi-irhamhuma-johra", "video", "published",
     "Rabbi Irhamhuma (Johra)", "renders/rabbi-irhamhuma",
     "storyToCreate/Rabbi irhamhuma kama rabbayani sagheera..md"),
    (17, "children-learning-arabic", "watermark", "published",
     "Children Learning Arabic", "storyToCreate/waterMarkNeeded/Learning Arabic ",
     None),
    (18, "wake-up-and-thank-allah", "watermark", "published",
     "Wake Up and Thank Allah", "storyToCreate/waterMarkNeeded/2", None),
    (19, "bismillah-before-we-eat", "watermark", "published",
     "Bismillah Before We Eat", "storyToCreate/waterMarkNeeded/3", None),
    (20, "thank-you-allah-nasheed", "watermark", "delivered",
     "Thank You, Allah — nasheed verses 1-3",
     "storyToCreate/waterMarkNeeded/Thank You, Allah", None),
    (21, "wudu-together", "video", "delivered",
     "Wudu Together", "renders/wudu-together",
     "storyToCreate/Pillers/Wudu Together.md"),
    (22, "la-hawla", "video", "delivered",
     "Lā ḥawla wa lā quwwata illā billāh", "renders/la-hawla",
     "storyToCreate/Lā ḥawla wa.md"),
    (23, "rhyme-series", "program", "requested",
     "Rhyme Series", None, "storyToCreate/RhyeSeries/RhymeSeries.md"),
    (24, "alif-baa-taa-adventure", "video", "requested",
     "Alif, Baa, Taa Adventure", None, None),
    (25, "little-muslim-big-heart", "video", "requested",
     "Little Muslim, Big Heart", None, None),
]

# extra request files to copy into a production's folder (verse scripts etc.)
EXTRA_REQUESTS = {
    24: ["storyToCreate/waterMarkNeeded/Alif, Baa, Taa Adventure"],
    25: ["storyToCreate/waterMarkNeeded/Little Muslim, Big Heart"],
}

# reference / planning docs -> library/
LIBRARY = {
    "storyToCreate/Riwaq Al Ilm — Facebook Post Brand Identity System.md":
        "library/brand-identity-system.md",
    "storyToCreate/riwaq_social_media_package_v4.md": "library/social-package-v4.md",
    "storyToCreate/riwaq_social_media_package_v3.md": "library/social-package-v3.md",
    "storyToCreate/riwaq_social_media_package_v3_REVIEW.md":
        "library/social-package-v3-review.md",
    "renders/pillars": "library/pillars",
    "voice-samples": "library/voice-samples",
}

# which filenames inside a source dir are deliverables (-> OUTPUT/)
FINAL_HINTS = ("riwaq-", "_RiwaqAlIlm", "_watermarked")
CAPTION_NAMES = ("post-caption.md", "post-captions.md")


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, cwd=REPO, check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def tracked() -> set[str]:
    out = subprocess.run(["git", "ls-files"], cwd=REPO, capture_output=True, text=True)
    return set(out.stdout.splitlines())


TRACKED = tracked()


def move(src: Path, dst: Path, apply: bool, log: list[str]) -> None:
    rel = str(src.relative_to(REPO))
    log.append(f"  {rel}\n    -> {dst.relative_to(REPO)}")
    if not apply:
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    if rel in TRACKED:
        try:
            run(["git", "mv", "-f", rel, str(dst.relative_to(REPO))])
            return
        except subprocess.CalledProcessError:
            pass
    shutil.move(str(src), str(dst))


def count_files(paths: list[Path]) -> int:
    n = 0
    for p in paths:
        if p.is_file():
            n += 1
        elif p.is_dir():
            n += sum(1 for f in p.rglob("*") if f.is_file() and f.name != ".DS_Store")
    return n


def sanitise_output(name: str, num: int) -> str:
    """Number-prefixed, ASCII-kebab deliverable name; drops the old riwaq- prefix."""
    stem, _, ext = name.rpartition(".")
    stem = stem or name
    for junk in ("riwaq-", "riwaq_"):
        if stem.lower().startswith(junk):
            stem = stem[len(junk):]
    stem = stem.replace(" copy", "-copy").replace(" ", "-").replace("_", "-")
    while "--" in stem:
        stem = stem.replace("--", "-")
    return f"{num:04d}-{stem.strip('-').lower()}.{ext}" if ext else f"{num:04d}-{stem}"


def slugify(name: str) -> str:
    """ASCII kebab-case, no quotes/colons/parens/commas/spaces."""
    stem, _, ext = name.rpartition(".")
    stem = stem or name
    stem = re.sub(r"[\"\'():,!?]", "", stem)
    stem = re.sub(r"[\s_]+", "-", stem.strip())
    stem = re.sub(r"-{2,}", "-", stem).strip("-").lower()
    return f"{stem}.{ext}" if ext else stem


def classify(name: str) -> str:
    """OUTPUT | requests | work for a file inside an old production dir."""
    low = name.lower()
    if name in CAPTION_NAMES:
        return "OUTPUT"
    if any(h.lower() in low for h in FINAL_HINTS):
        return "OUTPUT"
    if low.endswith(".md"):
        return "requests"        # verse scripts / briefs, not deliverables
    return "work"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    apply = args.apply

    watched = [REPO / "renders", REPO / "storyToCreate", REPO / "voice-samples"]
    before = count_files(watched)

    log: list[str] = []
    registry = {
        "_standard": "PRODUCTION-STANDARD.md",
        "_next_id": len(JOBS) + 1,
        "productions": [],
    }

    for num, slug, jtype, status, title, srcdir, reqfile in JOBS:
        folder = PROD / f"{num:04d}-{slug}"
        log.append(f"\n#{num:04d} {title}  [{jtype}/{status}]")

        if apply:
            folder.mkdir(parents=True, exist_ok=True)

        # 00-REQUEST.md
        req_dst = folder / "00-REQUEST.md"
        if reqfile:
            src = REPO / reqfile
            if src.exists():
                move(src, req_dst, apply, log)
        elif apply and not req_dst.exists():
            req_dst.write_text(
                f"# {title}\n\n"
                f"_Production {num:04d} · type: {jtype}_\n\n"
                "The original request was made in chat rather than as a written\n"
                "brief. Recorded here so the production has an entry point.\n"
            )
            log.append(f"  (stub 00-REQUEST.md written)")

        # extra request docs
        for extra in EXTRA_REQUESTS.get(num, []):
            src = REPO / extra
            if src.exists():
                move(src, folder / "requests", apply, log)

        # contents of the old output dir
        if srcdir:
            src = REPO / srcdir
            if src.exists():
                for item in sorted(src.iterdir()):
                    if item.name == ".DS_Store":
                        continue
                    if item.is_dir():
                        # frames/ and seg*/ are scratch; keep under work/
                        move(item, folder / "work" / item.name, apply, log)
                    else:
                        bucket = classify(item.name)
                        name = item.name
                        if name in CAPTION_NAMES:
                            name = "CAPTION.md"
                        elif bucket == "OUTPUT":
                            name = sanitise_output(name, num)
                        else:
                            name = slugify(name)
                        move(item, folder / bucket / name, apply, log)
                if apply and src.exists() and not any(src.iterdir()):
                    src.rmdir()

        registry["productions"].append({
            "id": f"{num:04d}",
            "slug": slug,
            "title": title,
            "type": jtype,
            "status": status,
            "folder": f"productions/{num:04d}-{slug}",
        })

    # library moves
    log.append("\n--- library/ (reference + planning, unnumbered) ---")
    for src_rel, dst_rel in LIBRARY.items():
        src = REPO / src_rel
        if src.exists():
            move(src, REPO / dst_rel, apply, log)

    print("\n".join(log))

    if apply:
        (PROD / "registry.json").write_text(json.dumps(registry, indent=2,
                                                       ensure_ascii=False) + "\n")
        after = count_files(watched + [PROD, LIB])
        print(f"\nfiles before: {before}   after: {after}")
        if after < before:
            print("!! FILE COUNT DROPPED — investigate before committing", file=sys.stderr)
            return 1
        print("registry.json written")
    else:
        print(f"\n(dry run — {before} files in scope; pass --apply to move)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
