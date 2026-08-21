#!/bin/bash
# Burn rendered cards onto a base video at their own times, with alpha fades.
#
#   bash burn.sh base.mp4 cards.json carddir out.mp4 [fps] [fade]
set -euo pipefail
BASE=$1; CARDS=$2; DIR=$3; OUT=$4; FPS=${5:-24}; FADE=${6:-0.4}

INS=""; FILT=""; LAST="[0:v]"; k=1
while read -r id start end; do
  DUR=$(python3 -c "print(round($end - $start, 3))")
  OUTFADE=$(python3 -c "print(round($DUR - $FADE, 3))")
  INS="$INS -loop 1 -framerate $FPS -t $DUR -i $DIR/card-$id.png"
  FILT="$FILT[$k:v]format=rgba,fade=t=in:st=0:d=$FADE:alpha=1,"
  FILT="$FILT fade=t=out:st=$OUTFADE:d=$FADE:alpha=1,setpts=PTS-STARTPTS+$start/TB[c$k];"
  FILT="$FILT$LAST[c$k]overlay=0:0:eof_action=pass:format=auto[v$k];"
  LAST="[v$k]"; k=$((k+1))
done < <(python3 -c "
import json,sys
for a in json.load(open('$CARDS')): print(a['id'], a['start'], a['end'])
")

# audio is copied untouched: never re-encode a recitation to add pictures to it
ffmpeg -v error -y -i "$BASE" $INS -filter_complex "${FILT%;}" \
  -map "$LAST" -map 0:a -r "$FPS" -c:v libx264 -crf 18 -preset medium \
  -pix_fmt yuv420p -c:a copy -movflags +faststart "$OUT"
echo "  $OUT  $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s"
