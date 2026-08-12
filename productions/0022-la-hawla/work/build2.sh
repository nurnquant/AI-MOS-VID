#!/bin/bash
# "Lā ḥawla wa lā quwwata illā billāh" — v2, all real motion.
#
# Fixes from v1:
#   * every beat is a veo3_1 clip (v1 used Ken Burns on stills for 6 of 9)
#   * narration is ONE continuous Emmett read (v1 stitched 7 fragments)
#   * card timings derived from the read's actual speech boundaries
#   * sunrise re-rolled with exposure pinned (v1 clipped to white)
#
# ALL veo clip audio is discarded: 6 of 8 clips came back with a music bed
# despite "ABSOLUTELY NO MUSIC" in the prompt. Soundtrack is built locally =
# continuous VO + Apple-DLS piano + rain ambience from the one clean clip.

set -euo pipefail
cd "$(dirname "$0")"
W=720; H=1280; FPS=24
mkdir -p seg2

cut () {   # cut <out-name> <src> <seconds>
  ffmpeg -v error -y -i "$2" -an \
    -vf "scale=${W}:${H},fps=${FPS},trim=duration=$3,setpts=PTS-STARTPTS,format=yuv420p" \
    -c:v libx264 -crf 18 -preset medium "seg2/$1.mp4"
}

cut b0 clips/n0-quran.mp4   5.5
cut b1 clips/n1-hands.mp4   4.8
cut b2 clips/c1-rain.mp4    8.0
cut b3 clips/n3-steps.mp4   6.8
cut b4 clips/n4-arch.mp4    6.0
cut b5 clips/c2-sujud.mp4   8.0
cut b6 clips/n6-hands2.mp4  5.7
cut b7 clips/n8-sunrise.mp4 8.0

: > seg2/list.txt
for s in b0 b1 b2 b3 b4 b5 b6 b7; do echo "file '$PWD/seg2/$s.mp4'" >> seg2/list.txt; done
ffmpeg -v error -y -f concat -safe 0 -i seg2/list.txt -c copy seg2/video.mp4
echo "video: $(ffprobe -v error -show_entries stream=duration -select_streams v -of csv=p=0 seg2/video.mp4)s"

# ---- main body -----------------------------------------------------------
# VO starts at 5.5s so the dua card can land first.
ffmpeg -v error -y \
  -i seg2/video.mp4 -i vo2/full.wav -i music-piano.m4a -i clips/c1-rain.mp4 \
  -loop 1 -framerate $FPS -t 53 -i card-dua-full.png \
  -loop 1 -framerate $FPS -t 53 -i card-frag1.png \
  -loop 1 -framerate $FPS -t 53 -i card-frag2.png \
  -loop 1 -framerate $FPS -t 53 -i card-frag3.png \
  -loop 1 -framerate $FPS -t 53 -i card-meaning.png \
  -loop 1 -framerate $FPS -t 53 -i card-ameen.png \
  -filter_complex "\
[4:v]format=rgba,fade=in:st=0.8:d=1.0:alpha=1,fade=out:st=4.6:d=0.7:alpha=1[k0];\
[5:v]format=rgba,fade=in:st=10.0:d=0.6:alpha=1,fade=out:st=13.2:d=0.7:alpha=1[k1];\
[6:v]format=rgba,fade=in:st=19.3:d=0.6:alpha=1,fade=out:st=22.6:d=0.7:alpha=1[k2];\
[7:v]format=rgba,fade=in:st=25.0:d=0.6:alpha=1,fade=out:st=27.5:d=0.7:alpha=1[k3];\
[8:v]format=rgba,fade=in:st=39.6:d=0.8:alpha=1,fade=out:st=43.9:d=0.7:alpha=1[k4];\
[9:v]format=rgba,fade=in:st=44.7:d=0.8:alpha=1[k5];\
[0:v][k0]overlay=0:0:enable='between(t,0.8,5.4)'[v1];\
[v1][k1]overlay=0:0:enable='between(t,10.0,14.0)'[v2];\
[v2][k2]overlay=0:0:enable='between(t,19.3,23.4)'[v3];\
[v3][k3]overlay=0:0:enable='between(t,25.0,28.3)'[v4];\
[v4][k4]overlay=0:0:enable='between(t,39.6,44.7)'[v5];\
[v5][k5]overlay=0:0:enable='gte(t,44.7)',fade=t=out:st=51.9:d=0.9:color=0x0A2E24[outv];\
[1:a]adelay=5500|5500,apad=whole_dur=52.8,volume=1.6[vox];\
[2:a]atrim=0:52.8,asetpts=PTS-STARTPTS,volume=0.45[pno];\
[3:a]atrim=0:8,asetpts=PTS-STARTPTS,adelay=10300|10300,volume=1.7,\
apad=whole_dur=52.8,afade=t=out:st=17.3:d=1.2[amb];\
[vox][pno][amb]amix=inputs=3:normalize=0:dropout_transition=0,\
alimiter=limit=0.9,afade=t=out:st=51.6:d=1.2[outa]" \
  -map "[outv]" -map "[outa]" -t 52.8 \
  -r $FPS -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p \
  -c:a aac -b:a 192k seg2/main.mp4

# ---- end card + join -----------------------------------------------------
ffmpeg -v error -y -loop 1 -framerate $FPS -t 5 -i endcard.png \
  -f lavfi -t 5 -i anullsrc=r=48000:cl=stereo \
  -vf "fade=t=in:st=0:d=0.7,format=yuv420p" \
  -r $FPS -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k -shortest seg2/end.mp4

ffmpeg -v error -y -i seg2/main.mp4 -i seg2/end.mp4 \
  -filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" -r $FPS \
  -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart riwaq-la-hawla-9x16.mp4

echo "final video: $(ffprobe -v error -select_streams v -show_entries stream=duration -of csv=p=0 riwaq-la-hawla-9x16.mp4)s"
echo "final audio: $(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 riwaq-la-hawla-9x16.mp4)s"
