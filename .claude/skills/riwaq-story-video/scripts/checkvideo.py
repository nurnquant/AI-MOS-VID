#!/usr/bin/env python3
"""
Riwaq story-video checker — measure a cut instead of trusting it.

    python3 checkvideo.py --video productions/0014-*/OUTPUT/0014-...-9x16.mp4 \
                          --clips productions/0014-*/work/clips \
                          --grid /tmp/beats.png

Reports, in one pass:

  * container facts, and whether video and audio durations agree (desync)
  * scene cuts, so the beat structure is measured rather than assumed
  * mean volume per beat, and any silence long enough to notice
  * a contact-sheet PNG of one frame per beat, for looking at
  * per-source-clip mean volume, which is how an unwanted MUSIC BED is caught:
    genuine room ambience sits near -40..-46 dB, a music bed at -17..-27 dB

Every number here comes from a real defect that shipped or nearly shipped:
0022 went out with video 64.5 s against audio 59.5 s from a demuxer concat;
0014 ends with 8.09 s of silence over its end card; and every veo clip on
0022, 0024 and 0031 arrived carrying music despite the prompt forbidding it.

Exits non-zero if a hard problem is found, so it can gate an assembly script.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

AMBIENCE_MAX = -34.0   # quieter than this is plausible real room tone
MUSIC_BED_MIN = -30.0  # louder than this, on a clip that should be ambient, is music
DESYNC_TOLERANCE = 0.25


def run(cmd: list[str]) -> str:
    return subprocess.run(cmd, capture_output=True, text=True).stdout


def err(cmd: list[str]) -> str:
    return subprocess.run(cmd, capture_output=True, text=True).stderr


def probe(path: Path) -> dict:
    out = run(["ffprobe", "-v", "error", "-print_format", "json",
               "-show_format", "-show_streams", str(path)])
    return json.loads(out or "{}")


def mean_volume(path: Path, start: float | None = None, dur: float | None = None):
    cmd = ["ffmpeg", "-hide_banner"]
    if start is not None:
        cmd += ["-ss", f"{start}"]
    if dur is not None:
        cmd += ["-t", f"{dur}"]
    cmd += ["-i", str(path), "-af", "volumedetect", "-f", "null", "-"]
    m = re.search(r"mean_volume:\s*(-?[\d.]+) dB", err(cmd))
    return float(m.group(1)) if m else None


def scene_cuts(path: Path, threshold: float = 0.3) -> list[float]:
    # metadata=print:file=- writes to STDOUT, so both streams must be read
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-an",
                        "-vf", f"select='gt(scene,{threshold})',metadata=print:file=-",
                        "-f", "null", "-"], capture_output=True, text=True)
    times = re.findall(r"pts_time:([\d.]+)", r.stdout + r.stderr)
    return sorted({round(float(t), 3) for t in times})


def silences(path: Path, floor: int = -50, min_dur: float = 0.5):
    out = err(["ffmpeg", "-hide_banner", "-i", str(path),
               "-af", f"silencedetect=n={floor}dB:d={min_dur}", "-f", "null", "-"])
    starts = [float(x) for x in re.findall(r"silence_start:\s*([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end:\s*([\d.]+)", out)]
    return list(zip(starts, ends + [None] * (len(starts) - len(ends))))


def contact_sheet(path: Path, times: list[float], out_png: Path, cols: int = 4):
    try:
        from PIL import Image
    except ImportError:
        print("  (Pillow missing — skipping contact sheet)")
        return
    tiles = []
    for i, t in enumerate(times):
        tmp = Path(f"/tmp/_cv_{i}.png")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t}",
                        "-i", str(path), "-frames:v", "1", str(tmp)],
                       capture_output=True)
        if tmp.exists():
            tiles.append((t, Image.open(tmp)))
    if not tiles:
        return
    tw, th = 200, int(200 * tiles[0][1].height / tiles[0][1].width)
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * th), (20, 20, 20))
    for i, (t, im) in enumerate(tiles):
        sheet.paste(im.resize((tw, th)), ((i % cols) * tw, (i // cols) * th))
    out_png.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_png)
    print(f"  contact sheet -> {out_png}  (frames at {', '.join(f'{t:.1f}s' for t,_ in tiles)})")


def main() -> int:
    ap = argparse.ArgumentParser(description="measure a Riwaq story video")
    ap.add_argument("--video", required=True)
    ap.add_argument("--clips", help="directory of source clips to RMS-check")
    ap.add_argument("--grid", default="/tmp/beats.png", help="contact sheet output")
    ap.add_argument("--expect-silent-tail", type=float, default=0.6,
                    help="seconds of trailing silence tolerated (default 0.6)")
    args = ap.parse_args()

    video = Path(args.video)
    if not video.exists():
        print(f"no such file: {video}")
        return 2

    problems: list[str] = []
    info = probe(video)
    fmt = info.get("format", {})
    dur = float(fmt.get("duration", 0))
    v = next((s for s in info.get("streams", []) if s["codec_type"] == "video"), None)
    a = next((s for s in info.get("streams", []) if s["codec_type"] == "audio"), None)

    print(f"\n{video.name}")
    print(f"  {dur:.2f}s   {int(fmt.get('size',0))/1e6:.1f} MB")
    if v:
        print(f"  video  {v['codec_name']} {v['width']}x{v['height']} "
              f"{v.get('r_frame_rate')}  dur={float(v.get('duration', dur)):.2f}s")
        if (v["width"], v["height"]) not in ((720, 1280), (1280, 720), (1080, 1920)):
            print(f"  note: unusual dimensions for a reel")
    if a:
        ad = float(a.get("duration", dur))
        print(f"  audio  {a['codec_name']} {a.get('sample_rate')}Hz "
              f"{a.get('channels')}ch  dur={ad:.2f}s")
        vd = float(v.get("duration", dur)) if v else dur
        if abs(vd - ad) > DESYNC_TOLERANCE:
            problems.append(f"A/V DESYNC: video {vd:.2f}s vs audio {ad:.2f}s "
                            f"(0022 shipped like this from a demuxer concat — "
                            f"use a filter concat)")
    else:
        problems.append("no audio stream at all")

    cuts = scene_cuts(video)
    print(f"\n  scene cuts: {', '.join(f'{c:.2f}' for c in cuts) or '(none detected)'}")
    bounds = [0.0] + cuts + [dur]
    beats = [(bounds[i], bounds[i + 1]) for i in range(len(bounds) - 1)]

    print("\n  per-beat audio:")
    for i, (s, e) in enumerate(beats, 1):
        if e - s < 0.4:
            continue
        mv = mean_volume(video, s + 0.05, max(e - s - 0.1, 0.3))
        flag = ""
        if mv is not None and mv < -60:
            flag = "   <-- SILENT"
        print(f"    beat {i:2}  {s:6.2f}-{e:6.2f}  ({e-s:5.2f}s)  "
              f"{'n/a' if mv is None else f'{mv:7.1f} dB'}{flag}")

    sil = silences(video)
    if sil:
        print("\n  silence >0.5s:")
        for s, e in sil:
            end = dur if e is None else e
            length = end - s
            print(f"    {s:6.2f}-{end:6.2f}  ({length:.2f}s)")
            # silencedetect's end can land a few frames short of duration
            if end >= dur - 0.30 and length > args.expect_silent_tail:
                problems.append(
                    f"SILENT TAIL: {length:.2f}s of silence to the end — the last "
                    f"thing a viewer hears is nothing. 0014 shipped with 8.09s of "
                    f"this over its end card; carry the music under the card.")

    mid = [(s + e) / 2 for s, e in beats if e - s > 0.4]
    contact_sheet(video, mid, Path(args.grid))

    if args.clips:
        cdir = Path(args.clips)
        srcs = sorted([p for p in cdir.iterdir()
                       if p.suffix.lower() in (".mp4", ".mov")]) if cdir.is_dir() else []
        if srcs:
            print(f"\n  source clips in {cdir} — checking for unwanted music beds:")
            for c in srcs:
                mv = mean_volume(c)
                if mv is None:
                    print(f"    {c.name:28} no audio stream")
                    continue
                verdict = ("loud: speech and/or music" if mv > MUSIC_BED_MIN
                           else "ambient only" if mv < AMBIENCE_MAX else "borderline")
                print(f"    {c.name:28} {mv:7.1f} dB   {verdict}")
            loud = [c.name for c in srcs if (mean_volume(c) or -99) > MUSIC_BED_MIN]
            if loud:
                print(f"\n  {len(loud)} of {len(srcs)} clips have loud audio. This "
                      f"measurement CANNOT tell speech from music.")
                print( "  - If the beat is meant to be ambient-only, loud = a music "
                       "bed Veo added against the prompt: discard clip audio (-an).")
                print( "  - If the beat carries veo-generated dialogue (as 0014 does), "
                       "loud is expected and the audio is meant to be kept.")
                print( "  Decide per beat, then whisper-verify whatever you keep.")

    print("\n" + ("=" * 66))
    if problems:
        print("PROBLEMS")
        for p in problems:
            print(f"  * {p}")
    else:
        print("No hard problems found by measurement.")
    print("\nMeasurement is not review. Still to do by eye and ear:")
    print("  - whisper-verify every spoken line against the brief, including")
    print("    forced-language passes for non-English recitation")
    print("  - look at the contact sheet: watermark clear of faces and text,")
    print("    the right character's lips moving on each speech beat")
    print("  - confirm no brief line is MISSING — 0014's Scene-5 VO was absent")
    print("=" * 66)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
