#!/usr/bin/env python3
"""Build a still montage carried by a supplied audio track. Zero credits.

    python3 montage.py --audio a.mp3 --out OUTPUT/0039-x-9x16.mp4 \
        --still img.png:0.38 --still img2.png --duration 30

Every still gets a slow push in; neighbours cross-dissolve. The audio is placed
after a short lead-in and faded only at its very end, never mid-phrase.

Nothing is overlaid: no watermark, no end card, no text unless the caller adds
them afterwards. That is the default on purpose — this pipeline was built for
Qur'anic recitation, where anything laid over the frame is a decision someone
has to make deliberately.
"""
from __future__ import annotations
import argparse, subprocess
from pathlib import Path


def probe(path: str, stream: str = "format=duration") -> str:
    return subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", stream, "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True).stdout.strip().split("\n")[0]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--still", action="append", required=True,
                    help="path[:bias] — bias 0-1 picks which part of a square "
                         "survives the vertical crop. Repeat per still.")
    ap.add_argument("--duration", type=float, default=30.0)
    ap.add_argument("--xfade", type=float, default=1.0)
    ap.add_argument("--lead-in", type=float, default=0.9,
                    help="silence before the audio starts; a recitation should "
                         "not begin on the very first frame")
    ap.add_argument("--zoom", type=float, default=0.06,
                    help="push in over each still. Above ~0.08 reads as restless")
    ap.add_argument("--size", default="1080x1920")
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--work", default="seg")
    a = ap.parse_args()

    OUTW, OUTH = (int(x) for x in a.size.split("x"))
    work = Path(a.work); work.mkdir(parents=True, exist_ok=True)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)

    stills = []
    for s in a.still:
        # a Windows-style path would break on ':', but these are posix paths
        path, _, bias = s.rpartition(":")
        if not path or "/" in bias or not bias.replace(".", "").isdigit():
            path, bias = s, "0.5"
        stills.append((path, float(bias)))

    n = len(stills)
    seg = round((a.duration + (n - 1) * a.xfade) / n, 3)
    print(f"  {n} stills, {seg}s each, {a.xfade}s crossfades -> {a.duration}s")

    for i, (path, bias) in enumerate(stills, 1):
        w, h = still_size(path)
        # crop to the output aspect first, then push in
        target_ar = OUTW / OUTH
        cw = min(w, int(h * target_ar))
        ch = min(h, int(w / target_ar))
        vf = (f"crop={cw}:{ch}:(in_w-{cw})*{bias}:(in_h-{ch})*0.5,"
              f"scale=8000:-1,"
              f"zoompan=z='min(1.0+{a.zoom}*on/({seg}*{a.fps}),{1 + a.zoom})':d=1:"
              f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={OUTW}x{OUTH}:fps={a.fps},"
              f"format=yuv420p")
        run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", str(a.fps),
             "-t", str(seg), "-i", path, "-vf", vf, "-an",
             "-c:v", "libx264", "-crf", "18", "-preset", "medium",
             str(work / f"s{i}.mp4")])
        print(f"  s{i} {Path(path).name[:52]}")

    filt, last, off = "", "[0:v]", 0.0
    for k in range(1, n):
        off = round(off + seg - a.xfade, 3)
        filt += f"{last}[{k}:v]xfade=transition=fade:duration={a.xfade}:offset={off}[x{k}];"
        last = f"[x{k}]"
    ins = []
    for k in range(1, n + 1):
        ins += ["-i", str(work / f"s{k}.mp4")]
    run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", filt.rstrip(";"),
         "-map", last, "-r", str(a.fps), "-c:v", "libx264", "-crf", "18",
         "-preset", "medium", "-pix_fmt", "yuv420p", str(work / "picture.mp4")])

    pic = float(probe(str(work / "picture.mp4")))
    adur = float(probe(a.audio))
    ms = int(a.lead_in * 1000)
    fade_at = round(a.lead_in + adur - 0.45, 3)
    print(f"  picture {pic}s · audio {adur}s placed at {a.lead_in}s")
    if a.lead_in + adur > pic:
        print(f"  WARNING: audio runs {a.lead_in + adur - pic:.2f}s past the picture "
              f"and will be cut. Lengthen --duration or shorten --lead-in.")

    run(["ffmpeg", "-v", "error", "-y", "-i", str(work / "picture.mp4"), "-i", a.audio,
         "-filter_complex",
         f"[1:a]adelay={ms}|{ms},afade=t=out:st={fade_at}:d=0.45,aresample=48000,apad[a]",
         "-map", "0:v", "-map", "[a]", "-t", str(pic), "-shortest",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
         "-movflags", "+faststart", a.out])

    print(f"\n  {Path(a.out).name}  total {probe(a.out)}s")
    print("  now verify by eye: checkvideo.py, and LOOK at a frame from every "
          "still — a centre crop clips subjects and no measurement catches it")
    return 0


def still_size(path: str):
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    with Image.open(path) as im:
        return im.size


def run(cmd):
    subprocess.run(cmd, check=True)


if __name__ == "__main__":
    raise SystemExit(main())
