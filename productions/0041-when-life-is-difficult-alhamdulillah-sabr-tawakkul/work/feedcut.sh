#!/bin/bash
# 0041 — a 4:5 FEED cut from the 9:16 Reel.
#
# PADDED, not cropped. The burned captions sit at 72-75% of frame height, and a
# 4:5 crop keeps only the top 900 px of 1280 — it would slice them off. The
# picture is preserved whole and the sides are filled with a blurred, zoomed copy
# of itself.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=OUTPUT/0041-when-life-is-difficult-captioned-9x16.mp4
OUT=OUTPUT/0041-when-life-is-difficult-feed-4x5.mp4
W=1080; H=1350

ffmpeg -v error -y -i "$SRC" -filter_complex "\
[0:v]split=2[bg][fg];\
[bg]scale=${W}:-2,crop=${W}:${H},gblur=sigma=42,eq=brightness=-0.06[b];\
[fg]scale=-2:${H}[f];\
[b][f]overlay=(W-w)/2:0:format=auto,format=yuv420p[v]" \
  -map "[v]" -map 0:a -c:v libx264 -crf 18 -preset medium \
  -c:a copy -movflags +faststart "$OUT"

printf "  %s\n" "$(basename $OUT)"
ffprobe -v error -select_streams v -show_entries stream=width,height -of csv=p=0:s=x "$OUT" | sed 's/^/    /'
