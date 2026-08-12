#!/bin/bash
# Assemble "Lā ḥawla wa lā quwwata illā billāh" — 9:16, ~65s.
#
# Structure: English VO (TTS, per-beat segments) over a mix of Ken Burns moves
# on 4K stills and three veo3_1 clips. All Arabic appears as locally rendered
# gold calligraphy — never spoken, never AI-generated text.
#
# Audio bed = VO (primary) + looped Apple-DLS piano + a little rain ambience
# from clip 1 only. Clip 2's audio is DISCARDED: veo added a music bed
# (-21 dB vs -43 dB ambient on the others) despite "no music" being pinned.

set -euo pipefail
cd "$(dirname "$0")"

W=720; H=1280; FPS=24
mkdir -p seg

# ---- Ken Burns beats -------------------------------------------------------
# kb <still> <out> <seconds> <zoom-from> <zoom-to> <x-expr> <y-expr>
kb () {
  local src=$1 out=$2 dur=$3 z0=$4 z1=$5 xe=$6 ye=$7
  local frames=$(python3 -c "print(int($dur*$FPS))")
  ffmpeg -v error -y -loop 1 -i "$src" \
    -vf "scale=${W}*4:${H}*4:force_original_aspect_ratio=increase,crop=${W}*4:${H}*4,\
zoompan=z='${z0}+(${z1}-${z0})*on/${frames}':x='${xe}':y='${ye}':d=1:s=${W}x${H}:fps=${FPS},\
trim=duration=${dur},setpts=PTS-STARTPTS,format=yuv420p" \
    -an -c:v libx264 -crf 18 -preset medium "$out"
}

CX="iw/2-(iw/zoom/2)"; CY="ih/2-(ih/zoom/2)"

kb still-6-quran.png   seg/b0.mp4 6.5 1.00 1.10 "$CX" "$CY"          # dua stated
kb still-1-hands.png   seg/b1.mp4 5.5 1.08 1.00 "$CX" "$CY"          # recite & reflect
kb still-3-steps.png   seg/b3.mp4 5.5 1.00 1.09 "$CX" "$CY"          # striving
kb still-7-arch.png    seg/b4.mp4 8.0 1.10 1.00 "$CX" "$CY"          # light breaks through
kb still-1-hands.png   seg/b6.mp4 5.5 1.00 1.07 "$CX" "ih/2-(ih/zoom/1.9)"
kb still-5-sunrise.png seg/b8.mp4 5.0 1.00 1.08 "$CX" "$CY"          # resolution
ffmpeg -v error -y -i seg/b8.mp4 -vf "eq=brightness=-0.06:contrast=1.06:saturation=1.05,curves=m=0/0 0.5/0.47 1/0.90" -an -c:v libx264 -crf 18 -preset medium seg/b8g.mp4 && mv seg/b8g.mp4 seg/b8.mp4

# ---- veo clips, normalised, audio dropped ---------------------------------
for pair in "c1-rain:b2" "c2-sujud:b5" "c3-sunrise:b7"; do
  src=clips/${pair%%:*}.mp4; out=seg/${pair##*:}.mp4
  extra=""
  if [ "$out" = "seg/b7.mp4" ]; then
    extra=",eq=brightness=-0.07:contrast=1.07,curves=m=0/0 0.5/0.46 1/0.88"
  fi
  ffmpeg -v error -y -i "$src" -an -vf "scale=${W}:${H},fps=${FPS}${extra},format=yuv420p" \
    -c:v libx264 -crf 18 -preset medium "$out"
done

# ---- video track ----------------------------------------------------------
: > seg/list.txt
for s in b0 b1 b2 b3 b4 b5 b6 b7 b8; do echo "file '$PWD/seg/$s.mp4'" >> seg/list.txt; done
ffmpeg -v error -y -f concat -safe 0 -i seg/list.txt -c copy seg/video.mp4
VID=$(ffprobe -v error -show_entries format=duration -of csv=p=0 seg/video.mp4)
echo "video track: ${VID}s"

# ---- VO track: each line placed at an absolute time ----------------------
ffmpeg -v error -y \
  -i vo/02.wav -i vo/04.wav -i vo/06.wav -i vo/07b.wav \
  -i vo/08.wav -i vo/10.wav -i vo/11c.wav \
  -filter_complex "\
[0:a]adelay=6000|6000[a0];\
[1:a]adelay=11500|11500[a1];\
[2:a]adelay=23000|23000[a2];\
[3:a]adelay=29500|29500[a3];\
[4:a]adelay=34000|34000[a4];\
[5:a]adelay=47000|47000[a5];\
[6:a]adelay=52500|52500[a6];\
[a0][a1][a2][a3][a4][a5][a6]amix=inputs=7:normalize=0,\
aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,\
volume=1.8,alimiter=limit=0.9[vo]" \
  -map "[vo]" -t 60 -c:a pcm_s16le seg/vo-track.wav
echo "vo track built"

# ---- main body: overlays + audio mix (59.5s) -----------------------------
ffmpeg -v error -y \
  -i seg/video.mp4 -i seg/vo-track.wav -i music-piano.m4a -i clips/c1-rain.mp4 \
  -loop 1 -framerate $FPS -t 60 -i card-dua-full.png \
  -loop 1 -framerate $FPS -t 60 -i card-frag1.png \
  -loop 1 -framerate $FPS -t 60 -i card-frag2.png \
  -loop 1 -framerate $FPS -t 60 -i card-frag3.png \
  -loop 1 -framerate $FPS -t 60 -i card-meaning.png \
  -loop 1 -framerate $FPS -t 60 -i card-ameen.png \
  -filter_complex "\
[4:v]format=rgba,fade=in:st=0.8:d=1.0:alpha=1,fade=out:st=5.4:d=0.8:alpha=1[k0];\
[5:v]format=rgba,fade=in:st=12.3:d=0.7:alpha=1,fade=out:st=15.2:d=0.7:alpha=1[k1];\
[6:v]format=rgba,fade=in:st=23.0:d=0.7:alpha=1,fade=out:st=26.4:d=0.7:alpha=1[k2];\
[7:v]format=rgba,fade=in:st=29.5:d=0.7:alpha=1,fade=out:st=32.6:d=0.7:alpha=1[k3];\
[8:v]format=rgba,fade=in:st=47.0:d=0.9:alpha=1,fade=out:st=51.6:d=0.8:alpha=1[k4];\
[9:v]format=rgba,fade=in:st=52.6:d=0.9:alpha=1[k5];\
[0:v][k0]overlay=0:0:enable='between(t,0.8,6.3)'[v1];\
[v1][k1]overlay=0:0:enable='between(t,12.3,15.9)'[v2];\
[v2][k2]overlay=0:0:enable='between(t,23.0,27.1)'[v3];\
[v3][k3]overlay=0:0:enable='between(t,29.5,33.3)'[v4];\
[v4][k4]overlay=0:0:enable='between(t,47.0,52.4)'[v5];\
[v5][k5]overlay=0:0:enable='gte(t,52.6)',fade=t=out:st=58.7:d=0.8:color=0x0A2E24[outv];\
[1:a]apad=whole_dur=59.5[vox];\
[2:a]atrim=0:59.5,asetpts=PTS-STARTPTS,volume=0.48[pno];\
[3:a]atrim=0:8,asetpts=PTS-STARTPTS,adelay=12000|12000,volume=1.8,\
apad=whole_dur=59.5,afade=t=out:st=19:d=1.5[amb];\
[vox][pno][amb]amix=inputs=3:normalize=0:dropout_transition=0,\
alimiter=limit=0.9,afade=t=out:st=58.4:d=1.1[outa]" \
  -map "[outv]" -map "[outa]" -t 59.5 \
  -r $FPS -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p \
  -c:a aac -b:a 192k seg/main.mp4
echo "main: $(ffprobe -v error -show_entries stream=duration -select_streams v -of csv=p=0 seg/main.mp4)s video"

# ---- end card (5s, silent) ----------------------------------------------
ffmpeg -v error -y -loop 1 -framerate $FPS -t 5 -i endcard.png \
  -f lavfi -t 5 -i anullsrc=r=48000:cl=stereo \
  -vf "fade=t=in:st=0:d=0.7,format=yuv420p" \
  -r $FPS -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k -shortest seg/end.mp4

# ---- join (filter concat: demuxer drops the end card's silent track) ----
ffmpeg -v error -y -i seg/main.mp4 -i seg/end.mp4 \
  -filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" \
  -r $FPS -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart riwaq-la-hawla-9x16.mp4

echo "final video: $(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 riwaq-la-hawla-9x16.mp4)s"
echo "final audio: $(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 riwaq-la-hawla-9x16.mp4)s"
