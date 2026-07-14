#!/usr/bin/env bash
# AIVS media smoke test — non-destructive, self-cleaning.
# 1. Generates a 2-second color test video.
# 2. Adds silent audio.
# 3. Inspects the output with ffprobe.
# 4. Deletes temporary output.
set -euo pipefail

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

OUT="$TMP_DIR/aivs-smoke.mp4"

echo "== AIVS media smoke test =="

command -v ffmpeg >/dev/null || { echo "FAIL: ffmpeg not found. Install with: brew install ffmpeg"; exit 1; }
command -v ffprobe >/dev/null || { echo "FAIL: ffprobe not found. Install with: brew install ffmpeg"; exit 1; }

echo "-- generating 2s color test video with silent audio"
ffmpeg -hide_banner -loglevel error \
  -f lavfi -i "color=c=blue:s=640x360:d=2:r=25" \
  -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=44100" \
  -t 2 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest \
  "$OUT"

echo "-- inspecting with ffprobe"
STREAMS="$(ffprobe -hide_banner -loglevel error -show_entries stream=codec_type,codec_name,width,height,duration -of csv=p=0 "$OUT")"
echo "$STREAMS"

echo "$STREAMS" | grep -q "video" || { echo "FAIL: no video stream in output"; exit 1; }
echo "$STREAMS" | grep -q "audio" || { echo "FAIL: no audio stream in output"; exit 1; }

DURATION="$(ffprobe -hide_banner -loglevel error -show_entries format=duration -of csv=p=0 "$OUT")"
echo "-- container duration: ${DURATION}s"

echo "PASS: media smoke test complete (temp files removed on exit)"
