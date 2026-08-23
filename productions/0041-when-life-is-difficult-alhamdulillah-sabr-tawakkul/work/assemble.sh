#!/bin/bash
# 0041 — lay the four narration lines out with breaths between them.
#
# TEMPO is a parameter, not a fixed choice: the generated read is slower than the
# 15.8 s source, and matching that exactly needs about 1.3x, which sounds rushed
# and undercuts the calm the script is asking for.
set -euo pipefail
cd "$(dirname "$0")/.."
TEMPO=${1:-1.0}; GAP=${2:-0.5}; OUT=${3:-OUTPUT/0041-vo-natural.m4a}
mkdir -p OUTPUT

INS=""; FILT=""; MIX=""; k=0; T=0
for n in 01 02 03 04; do
  D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 work/vo/$n.wav)
  D=$(python3 -c "print(round($D/$TEMPO, 3))")
  MS=$(python3 -c "print(int($T*1000))")
  INS="$INS -i work/vo/$n.wav"
  FILT="$FILT[$k:a]atempo=$TEMPO,adelay=$MS|$MS[d$k];"
  MIX="$MIX[d$k]"
  printf "  line %s  %6.2f -> %6.2f s\n" "$n" "$T" "$(python3 -c "print(round($T+$D,2))")"
  T=$(python3 -c "print(round($T + $D + $GAP, 3))")
  k=$((k+1))
done
END=$(python3 -c "print(round($T - $GAP + 0.6, 2))")

ffmpeg -v error -y $INS -filter_complex \
  "${FILT}${MIX}amix=inputs=$k:normalize=0,alimiter=limit=0.95,aresample=48000,apad[a]" \
  -map "[a]" -t "$END" -c:a aac -b:a 192k -ar 48000 -ac 2 "$OUT"
printf "  %s  %ss\n" "$(basename $OUT)" \
  "$(ffprobe -v error -show_entries format=duration -of csv=p=0 $OUT)"
