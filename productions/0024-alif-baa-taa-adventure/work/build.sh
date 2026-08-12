#!/bin/bash
# 0024 "Alif, Baa, Taa Adventure" — style 7, Photoreal Sing-Along.
#
# 7 real veo beats (56s) + emerald brand end card (5s).
#
# Decisions baked in here, each one learned the hard way on earlier jobs:
#   * ALL veo clip audio is discarded (-an). Every one of the 7 clips came back
#     at -22 to -27 dB, i.e. carrying a music bed, despite "ABSOLUTELY NO MUSIC"
#     pinned in each prompt. Genuine room ambience sits at -40 to -46 dB.
#   * Soundtrack is built locally: ONE continuous Juno read + Apple-DLS marimba.
#     Never stitch a read from fragments — that was the 0022 mistake.
#   * Voice is Juno because she is the only preset of three that pronounces
#     "Alif" correctly; Daisy said "Aleph", Gracie said "Aleaf".
#   * Cards are Pillow PNGs and every card input needs `-loop 1 -framerate -t`,
#     or it shows for a single frame.
#   * Main + end card are joined with a FILTER concat, not the demuxer, which
#     silently drops a silent audio track and desyncs the durations.
#   * The watermark is applied HERE. 0022 shipped without one; style 7 requires
#     a rotating gold wordmark, so it is part of the build, not an afterthought.
#   * `if ... then ... fi` rather than `[ test ] && var=x`, which aborts the
#     whole script under `set -e`.

set -euo pipefail
cd "$(dirname "$0")"
W=720; H=1280; FPS=24
BEATS=7
BODY=$((BEATS * 8))          # 56
mkdir -p seg

cut () {   # cut <out-name> <src> <seconds>
  ffmpeg -v error -y -i "$2" -an \
    -vf "scale=${W}:${H},fps=${FPS},trim=duration=$3,setpts=PTS-STARTPTS,format=yuv420p" \
    -c:v libx264 -crf 18 -preset medium "seg/$1.mp4"
}

cut b0 clips/b0-intro.mp4  8
cut b1 clips/b1-alif.mp4   8
cut b2 clips/b2-baa.mp4    8
cut b3 clips/b3-taa.mp4    8
cut b4 clips/b4-saa.mp4    8
cut b5 clips/b5-chorus.mp4 8
cut b6 clips/b6-ending.mp4 8

: > seg/list.txt
for s in b0 b1 b2 b3 b4 b5 b6; do echo "file '$PWD/seg/$s.mp4'" >> seg/list.txt; done
ffmpeg -v error -y -f concat -safe 0 -i seg/list.txt -c copy seg/video.mp4
echo "video: $(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 seg/video.mp4)s"

# ---- voice: nudge the 57.9s read to fit 56s of picture ---------------------
# atempo preserves pitch; 1.04 is inaudible and avoids re-generating.
ffmpeg -v error -y -i vo/juno-r20.wav -filter:a "atempo=1.04" seg/vo.wav
echo "vo: $(ffprobe -v error -show_entries format=duration -of csv=p=0 seg/vo.wav)s"

# ---- watermark, rotating per beat ------------------------------------------
# Four corners cycled so it never sits over a letter card (cards live centre,
# y 210-830) or over a child's face. Bottom corners for beats with high hands.
WM=watermark.png
wm_x () {  # returns an ffmpeg expression choosing x by time
  echo "if(lt(mod(floor(t/8),4),2), 28, W-w-28)"
}

ffmpeg -v error -y \
  -i seg/video.mp4 \
  -i seg/vo.wav \
  -i music-raw.wav \
  -loop 1 -framerate $FPS -t $BODY -i card-intro.png \
  -loop 1 -framerate $FPS -t $BODY -i card-alif.png \
  -loop 1 -framerate $FPS -t $BODY -i card-baa.png \
  -loop 1 -framerate $FPS -t $BODY -i card-taa.png \
  -loop 1 -framerate $FPS -t $BODY -i card-saa.png \
  -loop 1 -framerate $FPS -t $BODY -i card-chorus.png \
  -loop 1 -framerate $FPS -t $BODY -i card-ending.png \
  -loop 1 -framerate $FPS -t $BODY -i "$WM" \
  -filter_complex "\
[3:v]format=rgba,fade=in:st=0.6:d=0.5:alpha=1,fade=out:st=6.6:d=0.6:alpha=1[k0];\
[4:v]format=rgba,fade=in:st=8.4:d=0.4:alpha=1,fade=out:st=14.6:d=0.6:alpha=1[k1];\
[5:v]format=rgba,fade=in:st=16.4:d=0.4:alpha=1,fade=out:st=22.6:d=0.6:alpha=1[k2];\
[6:v]format=rgba,fade=in:st=24.4:d=0.4:alpha=1,fade=out:st=30.6:d=0.6:alpha=1[k3];\
[7:v]format=rgba,fade=in:st=32.4:d=0.4:alpha=1,fade=out:st=38.6:d=0.6:alpha=1[k4];\
[8:v]format=rgba,fade=in:st=40.4:d=0.4:alpha=1,fade=out:st=47.0:d=0.6:alpha=1[k5];\
[9:v]format=rgba,fade=in:st=48.6:d=0.5:alpha=1[k6];\
[10:v]format=rgba,colorchannelmixer=aa=0.85[wm];\
[0:v][k0]overlay=0:0:enable='between(t,0.6,7.2)'[v1];\
[v1][k1]overlay=0:0:enable='between(t,8.4,15.2)'[v2];\
[v2][k2]overlay=0:0:enable='between(t,16.4,23.2)'[v3];\
[v3][k3]overlay=0:0:enable='between(t,24.4,31.2)'[v4];\
[v4][k4]overlay=0:0:enable='between(t,32.4,39.2)'[v5];\
[v5][k5]overlay=0:0:enable='between(t,40.4,47.6)'[v6];\
[v6][k6]overlay=0:0:enable='gte(t,48.6)'[v7];\
[v7][wm]overlay=x='$(wm_x)':y='if(lt(mod(floor(t/8),2),1), 42, H-h-46)'\
,fade=t=out:st=${BODY}.0:d=0.001:color=0x0A2E24[outv];\
[1:a]adelay=300|300,apad=whole_dur=$BODY,volume=1.7[vox];\
[2:a]atrim=0:$BODY,asetpts=PTS-STARTPTS,volume=0.30,afade=t=in:st=0:d=1.2,\
afade=t=out:st=54.4:d=1.6[mus];\
[vox][mus]amix=inputs=2:normalize=0:dropout_transition=0,\
alimiter=limit=0.92,afade=t=out:st=55.2:d=0.8[outa]" \
  -map "[outv]" -map "[outa]" -t $BODY \
  -r $FPS -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p \
  -c:a aac -b:a 192k seg/main.mp4

echo "main: v=$(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 seg/main.mp4) a=$(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 seg/main.mp4)"

# ---- end card + join ------------------------------------------------------
ffmpeg -v error -y -loop 1 -framerate $FPS -t 5 -i endcard.png \
  -f lavfi -t 5 -i anullsrc=r=48000:cl=stereo \
  -vf "fade=t=in:st=0:d=0.6,format=yuv420p" \
  -r $FPS -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k -shortest seg/end.mp4

ffmpeg -v error -y -i seg/main.mp4 -i seg/end.mp4 \
  -filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" -r $FPS \
  -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart \
  ../OUTPUT/0024-alif-baa-taa-adventure-9x16.mp4

OUT=../OUTPUT/0024-alif-baa-taa-adventure-9x16.mp4
echo "final video: $(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 $OUT)s"
echo "final audio: $(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 $OUT)s"
