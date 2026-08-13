#!/bin/bash
# 0035 — PARTIAL cut: the four sections that do not contain "Alif".
#
#   intro -> Baa -> Taa -> Saa  (4 x 10s) + 2s brand tag = 42s
#
# Verse 1 (Alif), the chorus and the ending are DELIBERATELY ABSENT. They all
# contain "Alif", which no model here pronounces correctly — four attempts across
# two models and three spellings all produced Elef/Ahlif/Elif. They are held until
# a correctly sung vocal is supplied.
#
# Omni Flash's native audio is KEPT: the singing is the deliverable.
# The 2s tag carries a marimba tail rather than silence (0014 shipped 8s of dead air).
set -euo pipefail
cd "$(dirname "$0")"
FPS=24
mkdir -p seg ../OUTPUT

# per section: watermark bottom-left, keep the sung audio
stamp () {   # stamp <in> <out>
  ffmpeg -v error -y -i "clips/$1.mp4" -i watermark.png \
    -filter_complex "[1:v]format=rgba,colorchannelmixer=aa=0.82[wm];\
[0:v][wm]overlay=x=30:y=H-h-36,fps=${FPS},format=yuv420p[v]" \
    -map "[v]" -map 0:a -c:v libx264 -crf 18 -preset medium \
    -c:a aac -b:a 192k -ar 48000 -ac 2 "seg/$2.mp4"
}

stamp s1-intro a1
stamp v2-baa   a2
stamp v3-taa   a3
stamp v4-saa   a4

# 2s brand tag with a real marimba tail
ffmpeg -v error -y -loop 1 -framerate $FPS -t 2 -i tag.png -i tail.wav \
  -filter_complex "[0:v]fade=t=in:st=0:d=0.4,format=yuv420p[v];\
[1:a]atrim=0:2,asetpts=PTS-STARTPTS,volume=0.5,afade=t=in:st=0:d=0.3,\
afade=t=out:st=1.2:d=0.8[a]" \
  -map "[v]" -map "[a]" -r $FPS -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 192k -ar 48000 -ac 2 seg/tag.mp4

# FILTER concat, never the demuxer
ffmpeg -v error -y -i seg/a1.mp4 -i seg/a2.mp4 -i seg/a3.mp4 -i seg/a4.mp4 -i seg/tag.mp4 \
  -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a][3:v][3:a][4:v][4:a]concat=n=5:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" -r $FPS -c:v libx264 -crf 18 -preset medium \
  -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart \
  ../OUTPUT/0035-alif-baa-taa-partial-4sections-9x16.mp4

OUT=../OUTPUT/0035-alif-baa-taa-partial-4sections-9x16.mp4
echo "video: $(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 "$OUT")s"
echo "audio: $(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 "$OUT")s"
