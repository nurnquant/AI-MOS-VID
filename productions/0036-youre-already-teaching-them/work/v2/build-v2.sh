#!/bin/bash
# 0036 V2 — four Gemini Omni Flash clips, one man talking to camera.
#
# No captions in this pass by request; caption design is being chosen separately.
#
# The only audio work is levelling. The generated performance is what the user
# approved, so nothing is added over it — a music bed only fades in under the
# brand tag, so the film does not end in silence the way 0014 did.
set -euo pipefail
cd "$(dirname "$0")"
P=../../..
FPS=24
mkdir -p seg
dur () { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }

# Clips came back between -26.5 and -30.9 dB. Left alone, the film gets quieter
# as it goes and the closing line — the one that has to land — is the faintest.
echo "== levelling =="
for c in A B C D; do
  ffmpeg -v error -y -i "$c.mp4" \
    -af "loudnorm=I=-18:TP=-2:LRA=11,aresample=48000" \
    -vf "fps=$FPS,scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,format=yuv420p" \
    -c:v libx264 -crf 18 -preset medium -c:a pcm_s16le "seg/$c.mov"
  printf "  %s  %ss  %s\n" "$c" "$(dur seg/$c.mov)" \
    "$(ffmpeg -hide_banner -i seg/$c.mov -af volumedetect -f null - 2>&1 | grep mean_volume | sed 's/.*mean_volume: //')"
done

# --- brand tag, 2 s ---
ffmpeg -v error -y -loop 1 -framerate $FPS -t 2.0 -i ../tag-base.png \
  -f lavfi -t 2.0 -i anullsrc=r=48000:cl=mono \
  -vf "fps=$FPS,scale=720:1280,format=yuv420p" \
  -c:v libx264 -crf 18 -preset medium -c:a pcm_s16le seg/tag.mov

ffmpeg -v error -y -i seg/A.mov -i seg/B.mov -i seg/C.mov -i seg/D.mov -i seg/tag.mov \
  -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a][3:v][3:a][4:v][4:a]concat=n=5:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" -r $FPS -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p \
  -c:a pcm_s16le seg/joined.mov

TOTAL=$(dur seg/joined.mov)
BEDIN=$(python3 -c "print(round(float('$TOTAL')-3.6,2))")
echo "== joined $TOTAL s, piano rises at $BEDIN s =="

# Piano only under the ending: it lifts the tag without touching the performance.
ffmpeg -v error -y -i seg/joined.mov -i $P/0022-la-hawla/work/music-piano.m4a \
  -filter_complex "[1:a]atrim=0:4.2,asetpts=PTS-STARTPTS,volume=0.55,\
afade=t=in:st=0:d=1.4,afade=t=out:st=2.9:d=1.3,adelay=$(python3 -c "print(int(float('$BEDIN')*1000))")|$(python3 -c "print(int(float('$BEDIN')*1000))")[bed];\
[0:a][bed]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95,aresample=48000[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a pcm_s16le seg/mixed.mov

mkdir -p ../../OUTPUT
ffmpeg -v error -y -i seg/mixed.mov -i ../watermark.png \
  -filter_complex "[0:v][1:v]overlay=W-w-22:22:format=auto[v]" \
  -map "[v]" -map 0:a -r $FPS -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart \
  ../../OUTPUT/0036-v2-youre-already-teaching-them-9x16.mp4

f=../../OUTPUT/0036-v2-youre-already-teaching-them-9x16.mp4
printf "\n%s\n  total %ss  v=%s a=%s\n" "$(basename "$f")" "$(dur "$f")" \
  "$(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 "$f")" \
  "$(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 "$f")"
