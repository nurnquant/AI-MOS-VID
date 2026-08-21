#!/bin/bash
# 0039 V2 — ayah + translation burned over V1.
#
# The text comes from the user's supplied, verified file, NOT from a transcript.
# V1 shipped clean precisely because a whisper transcript is not a source for
# Qur'anic text; a supplied mushaf text is.
#
# Cards are rendered by a BROWSER, not Pillow. Without libraqm, Pillow silently
# drops every harakat — verified, both a stripped and a voweled string rendered
# identically. Dropping vowel marks from Qur'an is not a cosmetic defect.
set -euo pipefail
cd "$(dirname "$0")"
BASE=../../OUTPUT/0039-surat-al-asr-9x16.mp4
OUT=../../OUTPUT/0039-v2-surat-al-asr-ayah-overlay-9x16.mp4
FPS=24
FADE=0.4

node render.mjs >/dev/null && rm -f _a*.html

INS=""; FILT=""; LAST="[0:v]"; k=1
while read -r id start end; do
  DUR=$(python3 -c "print(round($end - $start, 3))")
  OUTFADE=$(python3 -c "print(round($DUR - $FADE, 3))")
  INS="$INS -loop 1 -framerate $FPS -t $DUR -i card-$id.png"
  FILT="$FILT[$k:v]format=rgba,fade=t=in:st=0:d=$FADE:alpha=1,"
  FILT="$FILT fade=t=out:st=$OUTFADE:d=$FADE:alpha=1,setpts=PTS-STARTPTS+$start/TB[c$k];"
  FILT="$FILT$LAST[c$k]overlay=0:0:eof_action=pass:format=auto[v$k];"
  LAST="[v$k]"
  printf "  %s  %5.1fs -> %5.1fs\n" "$id" "$start" "$end"
  k=$((k+1))
done < <(python3 -c "
import json
for a in json.load(open('ayahs.json')):
    print(a['id'], a['start'], a['end'])
")

ffmpeg -v error -y -i "$BASE" $INS \
  -filter_complex "${FILT%;}" -map "$LAST" -map 0:a \
  -r $FPS -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p \
  -c:a copy -movflags +faststart "$OUT"

printf "\n%s\n  total %ss  v=%s a=%s\n" "$(basename $OUT)" \
  "$(ffprobe -v error -show_entries format=duration -of csv=p=0 $OUT)" \
  "$(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 $OUT)" \
  "$(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 $OUT)"
