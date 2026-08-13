#!/bin/bash
# Replace the placeholder voiceover and rebuild 0036.
#
#   bash work/revoice.sh                 # take recordings from work/vo-raw/
#   bash work/revoice.sh -v Daniel       # or re-render with a different system voice
#
# Recordings win over system voices. Drop any audio files in vo-raw/ — any
# format, any sample rate, one file or seven — and this converts, trims the
# leading and trailing silence, normalises to a consistent level, and rebuilds.
#
# The cut is derived from the MEASURED length of each line, so a slower read
# simply makes a longer video that is still in sync. Nothing else needs editing.
set -euo pipefail
cd "$(dirname "$0")"

VOICE=""
while getopts "v:" o; do case $o in v) VOICE="$OPTARG";; esac; done

LINES=(
  "You think you're not teaching your child deen."
  "You are. You just don't count it."
  "Bismillah before you left the house. They heard it."
  "Alhamdulillah when you were exhausted."
  "You apologised when you were wrong."
  "Dua out loud when the news was bad."
  "They learn deen the way they learned to talk. From you."
)

mkdir -p vo vo-raw
[ -f vo/01.wav ] && { mkdir -p vo-placeholder; cp vo/*.wav vo-placeholder/ 2>/dev/null || true; }

if [ -n "$VOICE" ]; then
  echo "== re-rendering with system voice: $VOICE =="
  for i in $(seq 0 6); do
    n=$(printf "%02d" $((i+1)))
    say -v "$VOICE" -r 152 -o "vo/$n.aiff" "${LINES[$i]}"
    ffmpeg -v error -y -i "vo/$n.aiff" -ar 48000 -ac 1 "vo/$n.wav" && rm "vo/$n.aiff"
  done
else
  shopt -s nullglob
  RAW=(vo-raw/*.{wav,WAV,m4a,M4A,mp3,MP3,aiff,AIFF,aif,caf,mov,mp4})
  shopt -u nullglob
  if [ ${#RAW[@]} -eq 0 ]; then
    echo "nothing in vo-raw/ — see work/RECORD-VO.md"; exit 1
  fi
  if [ ${#RAW[@]} -ne 7 ]; then
    echo "found ${#RAW[@]} file(s) in vo-raw/, expected 7 (one per line)."
    echo "One long take is fine too — say so and it gets split by silence instead."
    exit 1
  fi
  echo "== using your recordings =="
  i=0
  for f in "${RAW[@]}"; do
    i=$((i+1)); n=$(printf "%02d" $i)
    # trim silence at both ends, then normalise so no line sits louder than another
    ffmpeg -v error -y -i "$f" -af "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,\
areverse,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,areverse,\
loudnorm=I=-18:TP=-2:LRA=9,aresample=48000" -ac 1 -c:a pcm_s16le "vo/$n.wav"
    printf "  %s  %5.2fs  <- %s\n" "$n" \
      "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "vo/$n.wav")" "$(basename "$f")"
  done
fi

echo
bash build.sh
echo
echo "check it:"
echo "  python3 ../../../.claude/skills/riwaq-story-video/scripts/checkvideo.py \\"
echo "     --video ../OUTPUT/0036-youre-already-teaching-them-9x16.mp4 --grid work/grid.png"
