#!/bin/bash
# Overlay a caption set onto the four clips and rebuild the film.
#
#   bash overlay-captions.sh quiet     # the recommendation
#   bash overlay-captions.sh kinetic   # the comparison
#
# Captions are burned per CLIP, before the join, because every chunk time in
# plan.json is relative to its own clip. Burning after the join would mean
# re-deriving every time against the running total and getting it wrong once.
set -euo pipefail
cd "$(dirname "$0")"
STYLE=${1:-quiet}
SET="cap-$STYLE"
[ -d "$SET" ] || { echo "no $SET — run: python3 captions.py $STYLE"; exit 1; }
FPS=24
mkdir -p seg

for c in A B C D; do
  # Build one filter chain per clip: every chunk that belongs to it, each
  # shifted to its own start time. setpts+T/TB is what places a sequence at an
  # absolute time rather than at zero.
  # one value per line: a single-variable `read` takes the whole line, so the
  # input list keeps its spaces instead of being split into separate words
  { read -r INPUTS; read -r FILTER; read -r LAST; } < <(python3 - "$c" "$SET" <<'PY'
import json, sys
clip, sett = sys.argv[1], sys.argv[2]
plan = [p for p in json.load(open(f"{sett}/plan.json")) if p["clip"] == clip]
ins, filt, last, n = "", "", "[0:v]", 1
for p in plan:
    ins += f" -framerate 24 -i {sett}/{clip}{p['i']}/%04d.png"
    filt += f"[{n}:v]setpts=PTS-STARTPTS+{p['start']}/TB[o{n}];"
    filt += f"{last}[o{n}]overlay=0:0:eof_action=pass:format=auto[v{n}];"
    last = f"[v{n}]"
    n += 1
print(ins.strip())
print(filt)
print(last)
PY
)
  ffmpeg -v error -y -i "$c.mp4" $INPUTS \
    -filter_complex "${FILTER%;}" -map "$LAST" -map 0:a \
    -r $FPS -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p \
    -af "loudnorm=I=-18:TP=-2:LRA=11,aresample=48000" -c:a pcm_s16le \
    "seg/${c}-cap.mov"
  printf "  %s captioned  %ss\n" "$c" \
    "$(ffprobe -v error -show_entries format=duration -of csv=p=0 seg/${c}-cap.mov)"
done

ffmpeg -v error -y -loop 1 -framerate $FPS -t 2.0 -i ../tag-base.png \
  -f lavfi -t 2.0 -i anullsrc=r=48000:cl=mono \
  -vf "fps=$FPS,scale=720:1280,format=yuv420p" \
  -c:v libx264 -crf 18 -preset medium -c:a pcm_s16le seg/tag.mov

ffmpeg -v error -y -i seg/A-cap.mov -i seg/B-cap.mov -i seg/C-cap.mov -i seg/D-cap.mov -i seg/tag.mov \
  -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a][3:v][3:a][4:v][4:a]concat=n=5:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" -r $FPS -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p \
  -c:a pcm_s16le seg/joined-$STYLE.mov

TOTAL=$(ffprobe -v error -show_entries format=duration -of csv=p=0 seg/joined-$STYLE.mov)
BEDIN=$(python3 -c "print(round(float('$TOTAL')-3.6,2))")
MS=$(python3 -c "print(int(float('$BEDIN')*1000))")

ffmpeg -v error -y -i seg/joined-$STYLE.mov -i ../../../0022-la-hawla/work/music-piano.m4a \
  -filter_complex "[1:a]atrim=0:4.2,asetpts=PTS-STARTPTS,volume=0.55,\
afade=t=in:st=0:d=1.4,afade=t=out:st=2.9:d=1.3,adelay=$MS|$MS[bed];\
[0:a][bed]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95,aresample=48000[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a pcm_s16le seg/mixed-$STYLE.mov

mkdir -p ../../OUTPUT
OUT=../../OUTPUT/0036-v3-$STYLE-9x16.mp4
ffmpeg -v error -y -i seg/mixed-$STYLE.mov -i ../watermark.png \
  -filter_complex "[0:v][1:v]overlay=W-w-22:22:format=auto[v]" \
  -map "[v]" -map 0:a -r $FPS -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart "$OUT"

printf "\n%s\n  total %ss  v=%s a=%s\n" "$(basename $OUT)" \
  "$(ffprobe -v error -show_entries format=duration -of csv=p=0 $OUT)" \
  "$(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 $OUT)" \
  "$(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 $OUT)"
