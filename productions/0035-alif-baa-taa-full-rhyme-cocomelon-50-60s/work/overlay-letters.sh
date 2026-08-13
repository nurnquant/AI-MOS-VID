#!/bin/bash
# 0035 — overlay the animated Arabic letters onto the finished 52s cut.
#
# Each letter pops in exactly when the character says it. Timings are whisper word
# timestamps taken from the delivered audio, not estimates:
#
#   Alif  10.16  (also covers 10.88)   and 16.54
#   Baa   20.00                        and 26.54
#   Taa   30.00  (also covers 30.32)   and 36.80
#   Saa   40.04  (also covers 40.46)   and 46.64
#
# Cards sit BOTTOM-RIGHT at 62%: never over her face, and clear of the bottom-left
# watermark. Upper-left was tried first and covered her face in the close shots.
#
# Frames come from letters.py — Arabic rendered locally with GeezaPro, because every
# model asked for Arabic has produced garbled Latin.
set -euo pipefail
cd "$(dirname "$0")"
FPS=24
SRC=seg/no-letters.mp4
OUT=../OUTPUT/0035-alif-baa-taa-rhyme-9x16.mp4

S=0.62          # card scale
MX=24           # right margin
MY=40           # bottom margin

ffmpeg -v error -y -i "$SRC" \
  -framerate $FPS -i anim/alif1/f_%04d.png \
  -framerate $FPS -i anim/alif2/f_%04d.png \
  -framerate $FPS -i anim/baa1/f_%04d.png \
  -framerate $FPS -i anim/baa2/f_%04d.png \
  -framerate $FPS -i anim/taa1/f_%04d.png \
  -framerate $FPS -i anim/taa2/f_%04d.png \
  -framerate $FPS -i anim/saa1/f_%04d.png \
  -framerate $FPS -i anim/saa2/f_%04d.png \
  -filter_complex "\
[1:v]format=rgba,scale=iw*$S:ih*$S,setpts=PTS-STARTPTS+10.16/TB[a1];\
[2:v]format=rgba,scale=iw*$S:ih*$S,setpts=PTS-STARTPTS+16.54/TB[a2];\
[3:v]format=rgba,scale=iw*$S:ih*$S,setpts=PTS-STARTPTS+20.00/TB[b1];\
[4:v]format=rgba,scale=iw*$S:ih*$S,setpts=PTS-STARTPTS+26.54/TB[b2];\
[5:v]format=rgba,scale=iw*$S:ih*$S,setpts=PTS-STARTPTS+30.00/TB[t1];\
[6:v]format=rgba,scale=iw*$S:ih*$S,setpts=PTS-STARTPTS+36.80/TB[t2];\
[7:v]format=rgba,scale=iw*$S:ih*$S,setpts=PTS-STARTPTS+40.04/TB[s1];\
[8:v]format=rgba,scale=iw*$S:ih*$S,setpts=PTS-STARTPTS+46.64/TB[s2];\
[0:v][a1]overlay=x=W-w-$MX:y=H-h-$MY:enable='between(t,10.16,15.56)'[v1];\
[v1][a2]overlay=x=W-w-$MX:y=H-h-$MY:enable='between(t,16.54,19.14)'[v2];\
[v2][b1]overlay=x=W-w-$MX:y=H-h-$MY:enable='between(t,20.00,24.90)'[v3];\
[v3][b2]overlay=x=W-w-$MX:y=H-h-$MY:enable='between(t,26.54,29.14)'[v4];\
[v4][t1]overlay=x=W-w-$MX:y=H-h-$MY:enable='between(t,30.00,34.90)'[v5];\
[v5][t2]overlay=x=W-w-$MX:y=H-h-$MY:enable='between(t,36.80,39.40)'[v6];\
[v6][s1]overlay=x=W-w-$MX:y=H-h-$MY:enable='between(t,40.04,44.94)'[v7];\
[v7][s2]overlay=x=W-w-$MX:y=H-h-$MY:enable='between(t,46.64,49.24)',format=yuv420p[v]" \
  -map "[v]" -map 0:a -r $FPS \
  -c:v libx264 -crf 18 -preset medium -c:a copy -movflags +faststart "$OUT"

echo "video: $(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 "$OUT")s"
echo "audio: $(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 "$OUT")s"
