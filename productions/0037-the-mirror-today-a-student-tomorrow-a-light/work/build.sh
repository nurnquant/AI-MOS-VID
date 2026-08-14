#!/bin/bash
# 0037 — "The Mirror". One generated take plus a brand end card.
#
# The brief says NO MUSIC. So the end card is carried by the film's own room
# tone, extended and faded, rather than by a piano bed. That keeps the brief's
# sound design intact and still avoids the silent tail 0014 shipped with.
set -euo pipefail
cd "$(dirname "$0")"
FPS=24
CARD=2.6
mkdir -p seg ../OUTPUT
dur () { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }

HERO=$(dur hero.mp4)
echo "== hero $HERO s =="

# Normalise the take, and stamp the watermark on the FILM ONLY. The end card
# already carries the logo and the wordmark — standing rule, see
# PRODUCTION-STANDARD.md.
ffmpeg -v error -y -i hero.mp4 -i watermark.png \
  -filter_complex "[0:v]fps=$FPS,scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,format=yuv420p[v];\
[v][1:v]overlay=W-w-22:22:format=auto[o]" \
  -map "[o]" -map 0:a -af "loudnorm=I=-18:TP=-2:LRA=11,aresample=48000" \
  -c:v libx264 -crf 18 -preset medium -c:a pcm_s16le seg/film.mov

# Room tone for the card: take a quiet stretch of the film's own ambience,
# loop it to length and fade it out. No music, per the brief.
ffmpeg -v error -y -ss 0.2 -t 1.6 -i seg/film.mov -vn \
  -af "afade=t=in:st=0:d=0.2,afade=t=out:st=1.4:d=0.2" -c:a pcm_s16le seg/tone.wav
ffmpeg -v error -y -stream_loop -1 -i seg/tone.wav -t $CARD \
  -af "volume=0.9,afade=t=out:st=$(python3 -c "print(round($CARD-1.3,2))"):d=1.3,aresample=48000" \
  -ac 1 -c:a pcm_s16le seg/cardtone.wav

ffmpeg -v error -y -loop 1 -framerate $FPS -t $CARD -i endcard.png -i seg/cardtone.wav \
  -vf "fps=$FPS,scale=720:1280,format=yuv420p" \
  -c:v libx264 -crf 18 -preset medium -c:a pcm_s16le seg/card.mov

# filter concat, never the demuxer
ffmpeg -v error -y -i seg/film.mov -i seg/card.mov \
  -filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" -r $FPS -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart \
  ../OUTPUT/0037-the-mirror-9x16.mp4

f=../OUTPUT/0037-the-mirror-9x16.mp4
printf "\n%s\n  total %ss  v=%s a=%s\n" "$(basename "$f")" "$(dur "$f")" \
  "$(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 "$f")" \
  "$(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 "$f")"
