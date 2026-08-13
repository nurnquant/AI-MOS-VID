#!/bin/bash
# 0035 — intro -> ALIF -> Baa -> Taa -> Saa (5 x 10s) + 2s brand tag = 52s
#
# ALIF IS SOLVED. Every sung attempt said Elef/Ahlif/Elif. Having her SPEAK the
# letter as a call-out over the music instead of singing it produced a correct
# "Alif" first time, twice in a row. Singing stretches the vowel; speech does not.
#
# The Alif clip is ZOOMED 1.42 and crop-biased up and left. Omni Flash kept drawing
# Latin alphabet blocks on the floor through two re-rolls despite explicit
# prohibition; the crop removes them. Latin letters in an Arabic-alphabet video are
# not acceptable, and cropping is free where a third re-roll is not.
#
# The chorus and ending are still absent: both contain "Alif" SUNG.
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

# the Alif clip needs the de-blocking crop before the watermark
ffmpeg -v error -y -i clips/v1-alif.mp4 \
  -vf "scale=iw*1.42:ih*1.42,crop=720:1280:(in_w-720)*0.36:(in_h-1280)*0.26" \
  -c:v libx264 -crf 18 -preset medium -c:a copy seg/alif-cropped.mp4
cp seg/alif-cropped.mp4 clips/_alif_ready.mp4

stamp s1-intro    a1
stamp _alif_ready a2
stamp v2-baa      a3
stamp v3-taa      a4
stamp v4-saa      a5

# 2s brand tag with a real marimba tail
ffmpeg -v error -y -loop 1 -framerate $FPS -t 2 -i tag.png -i tail.wav \
  -filter_complex "[0:v]fade=t=in:st=0:d=0.4,format=yuv420p[v];\
[1:a]atrim=0:2,asetpts=PTS-STARTPTS,volume=0.5,afade=t=in:st=0:d=0.3,\
afade=t=out:st=1.2:d=0.8[a]" \
  -map "[v]" -map "[a]" -r $FPS -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 192k -ar 48000 -ac 2 seg/tag.mp4

# FILTER concat, never the demuxer
ffmpeg -v error -y -i seg/a1.mp4 -i seg/a2.mp4 -i seg/a3.mp4 -i seg/a4.mp4 -i seg/a5.mp4 -i seg/tag.mp4 \
  -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a][3:v][3:a][4:v][4:a][5:v][5:a]concat=n=6:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" -r $FPS -c:v libx264 -crf 18 -preset medium \
  -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart \
  ../OUTPUT/0035-alif-baa-taa-rhyme-9x16.mp4

OUT=../OUTPUT/0035-alif-baa-taa-rhyme-9x16.mp4
echo "video: $(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 "$OUT")s"
echo "audio: $(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 "$OUT")s"
