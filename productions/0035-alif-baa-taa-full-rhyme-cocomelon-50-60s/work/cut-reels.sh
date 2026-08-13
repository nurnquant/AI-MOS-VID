#!/bin/bash
# 0035 — cut the 52s master into 5 standalone Reels.
#
# Each Reel = one 10s section + the 2s brand tag = ~12s, so every one closes with
# the logo and the free-trial URL and can be posted on its own.
#
# Cut points are the MEASURED section boundaries (checkvideo.py reported scene cuts
# at 10.00 / 20.00 / 30.00 / 40.00, tag at 50.04). Every animated letter card sits
# inside its own section — Alif 10.16 and 16.54, Baa 20.00 and 26.54, Taa 30.00 and
# 36.80, Saa 40.04 and 46.64 — so cutting on the boundaries keeps all of them whole.
#
# Cut from the FINISHED master, so the letters, watermark and verified audio all
# come along. Sections are re-encoded because frame-accurate cuts need it; a short
# audio fade at each join avoids a click where the music is sliced mid-bar.
set -euo pipefail
cd "$(dirname "$0")"
SRC=../OUTPUT/0035-alif-baa-taa-rhyme-9x16.mp4
OUT=../OUTPUT/reels
FPS=24
TAG_IN=50.04
TAG_DUR=2.00
mkdir -p "$OUT" seg/reels

# the shared brand tag, cut once
ffmpeg -v error -y -ss $TAG_IN -t $TAG_DUR -i "$SRC" \
  -vf "fps=$FPS,format=yuv420p" -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 192k -ar 48000 -ac 2 seg/reels/tag.mp4

reel () {   # reel <n> <slug> <start> <dur>
  local n=$1 slug=$2 start=$3 dur=$4
  ffmpeg -v error -y -ss "$start" -t "$dur" -i "$SRC" \
    -vf "fps=$FPS,format=yuv420p" \
    -af "afade=t=in:st=0:d=0.10,afade=t=out:st=$(echo "$dur-0.22"|bc):d=0.22" \
    -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k -ar 48000 -ac 2 \
    "seg/reels/$slug.mp4"

  ffmpeg -v error -y -i "seg/reels/$slug.mp4" -i seg/reels/tag.mp4 \
    -filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]" \
    -map "[v]" -map "[a]" -r $FPS -c:v libx264 -crf 18 -preset medium \
    -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart \
    "$OUT/0035-reel-$n-$slug-9x16.mp4"

  local f="$OUT/0035-reel-$n-$slug-9x16.mp4"
  printf "%-42s %ss  v=%s a=%s\n" "$(basename "$f")" \
    "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" \
    "$(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 "$f")" \
    "$(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 "$f")"
}

reel 1 intro  0.00  10.00
reel 2 alif  10.00  10.00
reel 3 baa   20.00  10.00
reel 4 taa   30.00  10.00
reel 5 saa   40.00  10.04
