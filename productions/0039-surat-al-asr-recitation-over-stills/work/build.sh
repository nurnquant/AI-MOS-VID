#!/bin/bash
# 0039 — Surat Al-Asr recitation over existing stills.
#
# NO watermark and NO end card, by instruction. Nothing is overlaid on the frame
# at any point: this is Qur'anic recitation and the brief asked for it clean.
#
# No text either, deliberately. Arabic on screen would have to be verified
# letter-perfect, and a rough transcript is not verification — see 01-NOTES.md.
set -euo pipefail
cd "$(dirname "$0")"
P=../..
FPS=24
W=2304; H=4096          # 9:16 at 4K, cropped from the 4096 square masters
OUTW=1080; OUTH=1920    # delivered at 1080 — 4K vertical is pointless for social
AUDIO="../source/suratul asr audio.mp4"
TOTAL=30.0
LEADIN=0.9              # recitation should not start on the very first frame
XF=1.0                  # crossfade between stills
mkdir -p seg

# still | crop bias 0-1 (which part of the square survives the 9:16 crop)
# Order follows the surah: time passing, then belief, then righteous deeds,
# then counselling truth, then patience.
STILLS=(
  "0031-alhamdulillah-every-day/OUTPUT/0031-alhamdulillah-every-day-clean-1x1-4k.png|0.50"
  "0027-allah-made-everything-post-image/OUTPUT/0027-allah-made-everything-clean-1x1-4k.png|0.50"
  "0028-thank-you-allah/OUTPUT/0028-thank-you-allah-clean-1x1-4k.png|0.50"
  "0029-allah-loves-when-i-do-good/OUTPUT/0029-allah-loves-when-i-do-good-clean-1x1-4k.png|0.38"
  "0030-bismillah-before-i-begin/OUTPUT/0030-bismillah-before-i-begin-clean-1x1-4k.png|0.55"
  "0032-subhanallah-look-around/OUTPUT/0032-subhanallah-look-around-clean-1x1-4k.png|0.50"
)
N=${#STILLS[@]}
# each still is on screen for SEG, overlapping its neighbour by XF
SEG=$(python3 -c "print(round(($TOTAL + ($N-1)*$XF) / $N, 3))")
echo "== $N stills, ${SEG}s each, ${XF}s crossfades -> ${TOTAL}s =="

i=0
for row in "${STILLS[@]}"; do
  IFS='|' read -r rel bias <<< "$row"
  i=$((i+1))
  # slow push in: 1.00 -> 1.06 over the segment. Any faster reads as restless.
  ffmpeg -v error -y -loop 1 -framerate $FPS -t "$SEG" -i "$P/$rel" \
    -vf "crop=$W:$H:(in_w-$W)*$bias:0,\
scale=8000:-1,\
zoompan=z='min(1.0+0.06*on/(${SEG}*$FPS),1.06)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${OUTW}x${OUTH}:fps=$FPS,\
format=yuv420p" \
    -an -c:v libx264 -crf 18 -preset medium "seg/s$i.mp4"
  printf "  s%d %s\n" "$i" "$(basename "$rel" | cut -c1-42)"
done

# chain the crossfades: each still dissolves into the next
FILTER=""; LAST="[0:v]"; OFF=0
for ((k=1;k<N;k++)); do
  OFF=$(python3 -c "print(round($OFF + $SEG - $XF, 3))")
  FILTER="$FILTER${LAST}[$k:v]xfade=transition=fade:duration=$XF:offset=$OFF[x$k];"
  LAST="[x$k]"
done
ffmpeg -v error -y $(for ((k=1;k<=N;k++)); do printf ' -i seg/s%d.mp4' "$k"; done) \
  -filter_complex "${FILTER%;}" -map "$LAST" -r $FPS \
  -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p seg/picture.mp4

PIC=$(ffprobe -v error -show_entries format=duration -of csv=p=0 seg/picture.mp4)
echo "== picture ${PIC}s =="

# Recitation placed after a short lead-in, at its own level, untouched apart
# from a gentle fade at the very end so it does not stop dead.
ADUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$AUDIO")
FADEOUT=$(python3 -c "print(round($LEADIN + $ADUR - 0.45, 3))")
ffmpeg -v error -y -i seg/picture.mp4 -i "$AUDIO" \
  -filter_complex "[1:a]adelay=$(python3 -c "print(int($LEADIN*1000))")|$(python3 -c "print(int($LEADIN*1000))"),\
afade=t=out:st=$FADEOUT:d=0.45,aresample=48000,apad[a]" \
  -map 0:v -map "[a]" -t "$PIC" -shortest \
  -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart \
  ../OUTPUT/0039-surat-al-asr-9x16.mp4

f=../OUTPUT/0039-surat-al-asr-9x16.mp4
printf "\n%s\n  total %ss  v=%s a=%s\n" "$(basename "$f")" \
  "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")" \
  "$(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 "$f")" \
  "$(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 "$f")"
