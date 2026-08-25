#!/bin/bash
# Day 1 video — recover the vertical frame from inside its landscape canvas.
#
# The supplied file is 1920x1080 with the real picture pillarboxed at 608x1080,
# x=656, on white. Detected, not guessed: cropdetect on a negated copy agreed
# with a per-column white test on a sampled frame, both giving 608:1080:656:0.
#
# 608/1080 = 0.5630 against 9:16's 0.5625 — the content was authored vertical and
# only the container was wrong. So this is a crop, not a reframe: nothing is lost.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=source/day1-video-supplied-1920x1080.mp4
OUT=OUTPUT/0043-day1-subhanallah-9x16.mp4

ffmpeg -v error -y -i "$SRC" \
  -vf "crop=608:1080:656:0,scale=1080:1920:flags=lanczos,format=yuv420p" \
  -map 0:v:0 -map 0:a:0 \
  -c:v libx264 -crf 18 -preset medium -c:a copy -movflags +faststart "$OUT"

printf "  %s\n" "$(basename $OUT)"
ffprobe -v error -select_streams v -show_entries stream=width,height -of csv=p=0:s=x "$OUT" | sed 's/^/    /'
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT" | sed 's/^/    /'
