#!/bin/bash
# 0034 — Alif CoComelon 10s, Gemini Omni Flash single clip.
#
# Omni Flash's native audio is KEPT: the singing is the deliverable.
# The Alif card is fully opaque by 8.10s, BEFORE the garbled pseudo-text
# starts appearing at ~8.4s. A slower fade let the garbage show through it.
# It covers garbled pseudo-text the model drew in the
# upper right despite the prompt forbidding text three ways.
set -euo pipefail
cd "$(dirname "$0")"
FPS=24
mkdir -p ../OUTPUT

ffmpeg -v error -y -i clips/omni-10s.mp4 \
  -loop 1 -framerate $FPS -t 10 -i card-alif.png \
  -loop 1 -framerate $FPS -t 10 -i watermark.png \
  -filter_complex "\
[1:v]format=rgba,fade=in:st=7.95:d=0.15:alpha=1[alif];\
[2:v]format=rgba,colorchannelmixer=aa=0.82[wm];\
[0:v][alif]overlay=0:0:enable='gte(t,7.95)'[v1];\
[v1][wm]overlay=x=30:y=H-h-36,fps=$FPS,format=yuv420p[v]" \
  -map "[v]" -map 0:a -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 192k -movflags +faststart \
  ../OUTPUT/0034-alif-cocomelon-10s-9x16.mp4

OUT=../OUTPUT/0034-alif-cocomelon-10s-9x16.mp4
echo "video: $(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 "$OUT")s"
echo "audio: $(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 "$OUT")s"
