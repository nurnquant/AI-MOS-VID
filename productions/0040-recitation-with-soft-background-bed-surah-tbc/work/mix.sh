#!/bin/bash
# 0040 — add a soft bed under the recitation, leaving the recitation itself alone.
#
# NO SIDECHAIN, deliberately. Ducking is right when a voice leaves gaps; this
# recitation is continuous with only 6.8 dB of dynamic range, so a ducked bed
# stayed clamped the whole way and measured 27 dB down — present on paper,
# inaudible in fact. A steady level is the honest choice here.
#
# The recitation is never re-encoded, EQ'd, compressed or normalised. It is the
# thing being preserved; only the bed is placed around it.
set -euo pipefail
cd "$(dirname "$0")/.."
GAIN=${1:-0.093}                       # calibrated: ~19 dB under the recitation
OUT=${2:-OUTPUT/0040-recitation-soft-bed.m4a}

ffmpeg -v error -y -i source/recitation-source.mp4 -i work/pad.wav \
  -filter_complex "[0:a]aresample=48000[voice];\
[1:a]volume=$GAIN,aresample=48000[bed];\
[voice][bed]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.97[a]" \
  -map "[a]" -c:a aac -b:a 192k -ar 48000 -ac 2 "$OUT"

printf "  %-42s %ss\n" "$(basename "$OUT")" \
  "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")"
