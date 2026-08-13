#!/bin/bash
# 0036 — "You're Already Teaching Them"
#
# Built entirely from footage already in the library. ZERO credits: every clip
# here was paid for once, on an earlier production, and is reused.
#
# The cut is driven by the MEASURED voiceover, not by guessed timings — each
# segment is its line's real duration plus a breath. Change a line and the
# whole cut re-times itself from vo/NN.wav.
set -euo pipefail
cd "$(dirname "$0")"
P=../..
FPS=24
mkdir -p seg

# shot | source clip | in-point | caption card
# In-points avoid the first second of each clip, where the generated motion
# ramps up and looks synthetic.
SHOTS=(
  "1|$P/0006-dream-of-every-parent/work/clips/clip4-closeup.mp4|2.0|t1"
  "2|$P/0006-dream-of-every-parent/work/clips/clip1-hook.mp4|1.6|t2"
  "3|$P/0022-la-hawla/work/clips/n3-steps.mp4|1.4|t3"
  "4|$P/0006-dream-of-every-parent/work/clips/clip2-table.mp4|2.2|t4"
  "5|$P/0006-dream-of-every-parent/work/clips/clip5-tug.mp4|1.8|t5"
  "6|$P/0022-la-hawla/work/clips/n1-hands.mp4|1.5|t6"
  "7|$P/0008-little-girl-reciting-dua/work/clips/dua.mp4|2.4|t7"
)

# Breath after each line; longer after the hook and the turn, which need to land.
# Tightened from the placeholder's spacing because seed_audio already breathes
# inside a line — stacking a long gap on top of that reads as hesitation.
GAPS=(${GAPS_OVERRIDE:-0.40 0.45 0.22 0.22 0.22 0.35 0.50})

dur () { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }

echo "== segments =="
T=0
: > seg/plan.txt
for row in "${SHOTS[@]}"; do
  IFS='|' read -r n src inp card <<< "$row"
  vo="vo/0$n.wav"
  L=$(dur "$vo")
  G=${GAPS[$((n-1))]}
  SEG=$(echo "$L + $G" | bc)

  # Source clips are silent by design here — the voice and bed are mixed later.
  ffmpeg -v error -y -ss "$inp" -t "$SEG" -i "$src" \
    -i "cards/$card.png" \
    -filter_complex "[0:v]fps=$FPS,scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,format=yuv420p[v];\
[v][1:v]overlay=0:0:format=auto[o]" \
    -map "[o]" -an -c:v libx264 -crf 18 -preset medium "seg/s$n.mp4"

  printf "%s %s %s\n" "$n" "$T" "$SEG" >> seg/plan.txt
  printf "  s%s  %5.2fs  vo %5.2fs + gap %s   %s\n" "$n" "$SEG" "$L" "$G" "$(basename "$src")"
  T=$(echo "$T + $SEG" | bc)
done
echo "  picture before tag: ${T}s"

# --- brand tag, 2 s, carrying the follow-ask ---
ffmpeg -v error -y -loop 1 -framerate $FPS -t 2.0 -i tag.png \
  -vf "fps=$FPS,scale=720:1280,format=yuv420p" \
  -c:v libx264 -crf 18 -preset medium seg/tag.mp4

# --- picture: filter concat, never the demuxer (it drops silent tracks) ---
ffmpeg -v error -y $(for n in 1 2 3 4 5 6 7; do printf ' -i seg/s%s.mp4' "$n"; done) -i seg/tag.mp4 \
  -filter_complex "[0:v][1:v][2:v][3:v][4:v][5:v][6:v][7:v]concat=n=8:v=1:a=0[v]" \
  -map "[v]" -r $FPS -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p seg/picture.mp4

TOTAL=$(dur seg/picture.mp4)
echo "== picture $TOTAL s =="

# --- voice: each line delayed to its own segment start ---
VOICE_ARGS=""; VOICE_FILTER=""; k=0
while read -r n start seglen; do
  ms=$(python3 -c "print(int(float('$start')*1000))")
  VOICE_ARGS="$VOICE_ARGS -i vo/0$n.wav"
  VOICE_FILTER="$VOICE_FILTER[$k:a]adelay=$ms|$ms,volume=1.6[d$k];"
  k=$((k+1))
done < seg/plan.txt
MIXIN=$(for i in $(seq 0 $((k-1))); do printf "[d%s]" "$i"; done)

# Piano bed: the MASTERED render from 0022, reused. Two traps here, both hit:
# inside the mix graph -stream_loop quietly stopped short and left the brand tag
# in silence, the exact fault 0014 shipped with; and 0021's piano-raw.wav sits at
# -44 dB, so at 0.13 gain it was inaudible — a bed that measures present and
# cannot be heard. This source is -31 dB and 64 s, long enough to need no loop.
BEDFADE=$(python3 -c "print(round(float('$TOTAL')-1.6,2))")
ffmpeg -v error -y -i $P/0022-la-hawla/work/music-piano.m4a \
  -t "$TOTAL" -af "volume=0.80,afade=t=in:st=0:d=1.2,afade=t=out:st=$BEDFADE:d=1.6,aresample=48000" \
  -ac 1 -c:a pcm_s16le seg/bed.wav
BED=$(dur seg/bed.wav)
echo "== bed $BED s (must equal picture) =="

# A bed you notice is a bed that is too loud; it sits well under the voice.
ffmpeg -v error -y $VOICE_ARGS -i seg/bed.wav \
  -filter_complex "${VOICE_FILTER}${MIXIN}amix=inputs=$k:normalize=0[voice];\
[voice][$k:a]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.95,aresample=48000[a]" \
  -map "[a]" -t "$TOTAL" -c:a pcm_s16le seg/audio.wav

# --- mux + watermark ---
mkdir -p ../OUTPUT
ffmpeg -v error -y -i seg/picture.mp4 -i seg/audio.wav -i watermark.png \
  -filter_complex "[0:v][2:v]overlay=W-w-22:22:format=auto[v]" \
  -map "[v]" -map 1:a -r $FPS -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart \
  ../OUTPUT/0036-youre-already-teaching-them-9x16.mp4

f=../OUTPUT/0036-youre-already-teaching-them-9x16.mp4
printf "\n%s\n  total %ss  v=%s a=%s\n" "$(basename "$f")" \
  "$(dur "$f")" \
  "$(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 "$f")" \
  "$(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 "$f")"
