# Recitation with a soft background bed

_Production 0040 · placeholder, 2026-08-21_

## Request

The user supplied `source/recitation-source.mp4` — audio only, 29.56 s of Arabic
recitation — and asked to **keep the recitation exactly as it is** and add a
layer of soft, emotional background sound beneath it.

**This is a placeholder.** The surah has not been identified and no video exists
yet; only the audio work is done.

## What the source actually is

|               |                                                   |
| ------------- | ------------------------------------------------- |
| duration      | 29.56 s, audio only, no video stream              |
| encode        | AAC **41 kbps**, 44.1 kHz stereo                  |
| level         | mean -17.8 dB, peak -2.1 dB                       |
| dynamic range | **6.8 dB**                                        |
| existing bed  | none — the sustain is compression and codec noise |

**41 kbps is a messaging-app encode.** Nothing done here improves that; a cleaner
capture of the same recitation would be worth more than any processing.

## Not identified

Whisper returned a badly mangled transcript with Latin fragments spliced in, so
**the surah is not named and has not been guessed.** The production title says
"surah TBC" for that reason. Tell me what it is and it gets renamed.

## What was built

Three mixes, differing only in how loud the bed sits:

| file                                   | bed level                        |
| -------------------------------------- | -------------------------------- |
| `0040-recitation-bed-present.m4a`      | about 16 dB under the recitation |
| `0040-recitation-bed-balanced.m4a`     | about 19 dB under                |
| `0040-recitation-bed-barely-there.m4a` | about 22 dB under                |

Three exist because how loud a bed should sit is a judgement by ear, and that is
the user's to make.

## Cost

**Zero credits.** The pad is synthesised locally; everything else is ffmpeg.
