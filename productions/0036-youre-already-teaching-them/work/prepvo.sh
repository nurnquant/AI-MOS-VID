#!/bin/bash
# Prepare a set of voiceover lines for the cut.
#
#   bash prepvo.sh vo-desmond      # -> vo/ , ready for build.sh
#
# Three things, in order:
#   1. trim silence off both ends
#   2. collapse any internal pause longer than 0.45 s down to 0.25 s
#   3. normalise every line to the same loudness
#
# Step 2 is not cosmetic. seed_audio returned lines with multi-second holes in
# the middle of a sentence — Landon's "Bismillah before you left the house" had
# 3.7 s of dead air after the first word. Those pass every duration check and
# sound broken. A pause that long inside one short line is never intended.
set -euo pipefail
cd "$(dirname "$0")"
SRC=${1:?usage: prepvo.sh <dir-of-01..07.wav>}
mkdir -p vo

TRIM="silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,\
areverse,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,areverse"
# stop_periods=-1 collapses EVERY internal run of silence, not just the first
SQUASH="silenceremove=stop_periods=-1:stop_duration=0.25:stop_threshold=-38dB"
NORM="loudnorm=I=-18:TP=-2:LRA=9,aresample=48000"

echo "line   raw -> prepped"
for i in 01 02 03 04 05 06 07; do
  [ -f "$SRC/$i.wav" ] || { echo "missing $SRC/$i.wav"; exit 1; }
  raw=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC/$i.wav")
  ffmpeg -v error -y -i "$SRC/$i.wav" -af "$TRIM,$SQUASH,$NORM" -ac 1 -c:a pcm_s16le "vo/$i.wav"
  new=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "vo/$i.wav")

  # a line that is still mostly silence after squashing is a bad generation
  hole=$(ffmpeg -hide_banner -i "vo/$i.wav" -af "silencedetect=n=-38dB:d=0.4" -f null - 2>&1 \
         | grep -c "silence_start" || true)
  flag=""; [ "$hole" -gt 0 ] && flag="  <-- still has a long internal pause, re-roll this line"
  printf "  %s  %5.2fs -> %5.2fs%s\n" "$i" "$raw" "$new" "$flag"
done

total=$(python3 -c "
import subprocess
print(round(sum(float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f'vo/{i:02d}.wav'],capture_output=True,text=True).stdout) for i in range(1,8)),2))")
echo "  voice total ${total}s (+ gaps + 2s tag = finished length)"
