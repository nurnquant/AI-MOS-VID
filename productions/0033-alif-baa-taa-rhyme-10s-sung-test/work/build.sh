#!/bin/bash
# 0033 — 10s sung-rhyme TEST. 8s veo-sung beat + 2s brand tag.
#
# NOTE the deliberate inversion of the usual rule: veo's audio is KEPT here,
# because the singing IS the deliverable. Every other production discards it
# because veo adds unwanted music.
#
# The 2s tag gets a real marimba tail rather than silence — 0014 shipped with
# 8.09s of dead air over its end card, and that is the defect being avoided.
set -euo pipefail
cd "$(dirname "$0")"
W=720; H=1280; FPS=24
mkdir -p seg ../OUTPUT

# 1. the sung beat, audio intact, watermark bottom-left clear of her
ffmpeg -v error -y -i clips/b1-sung.mp4 -i watermark.png \
  -filter_complex "[1:v]format=rgba,colorchannelmixer=aa=0.85[wm];\
[0:v][wm]overlay=x=34:y=H-h-40,fps=${FPS},format=yuv420p[v]" \
  -map "[v]" -map 0:a -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k \
  -t 8 seg/beat.mp4

# 2. the 2s tag, with a marimba tail so it is not silent
ffmpeg -v error -y -loop 1 -framerate $FPS -t 2 -i tag.png -i tail.wav \
  -filter_complex "[0:v]fade=t=in:st=0:d=0.4,format=yuv420p[v];\
[1:a]atrim=0:2,asetpts=PTS-STARTPTS,volume=0.5,afade=t=in:st=0:d=0.3,\
afade=t=out:st=1.2:d=0.8[a]" \
  -map "[v]" -map "[a]" -r $FPS -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 192k seg/tag.mp4

# 3. FILTER concat, never the demuxer
ffmpeg -v error -y -i seg/beat.mp4 -i seg/tag.mp4 \
  -filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" -r $FPS -c:v libx264 -crf 18 -preset medium \
  -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart \
  ../OUTPUT/0033-alif-baa-taa-rhyme-test-9x16.mp4

OUT=../OUTPUT/0033-alif-baa-taa-rhyme-test-9x16.mp4
echo "video: $(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 "$OUT")s"
echo "audio: $(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 "$OUT")s"
