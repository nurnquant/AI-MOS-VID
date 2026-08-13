# Recording the voiceover yourself

The fastest fix for 0036, and free. Phone voice memo or Mac QuickTime is fine —
a quiet room matters far more than the microphone.

## The seven lines

Record each one **separately**, or record straight through and I will split it.
Leave a beat of silence at the start and end of each.

```
1  You think you're not teaching your child deen.
2  You are. You just don't count it.
3  Bismillah before you left the house. They heard it.
4  Alhamdulillah when you were exhausted.
5  You apologised when you were wrong.
6  Dua out loud when the news was bad.
7  They learn deen the way they learned to talk. From you.
```

## How to read it

This is one tired parent talking to another. Not a lecture, not an
advertisement, not a khutbah.

- **Slow.** Slower than feels right. The whole piece is only 22 seconds.
- **Line 1 is an accusation you are about to withdraw.** Say it flat, almost
  apologetic. Do not sell it.
- **Line 2 is the turn.** Warm. This is the moment the viewer relaxes.
- **Lines 3 to 6 are a list of small kindnesses.** Even, unhurried, no build.
  Resist making them dramatic — the point is that they were ordinary.
- **Line 7 is quiet.** The temptation is to lift into an inspirational finish.
  Do not. Land it softly and stop.

If you fluff one, just say it again — I will take the best pass.

## Getting them to me

Drop the files anywhere in `work/vo-raw/` in this production folder. Any format
(m4a, wav, mp3, aiff), any sample rate, one file or seven.

Then `bash work/revoice.sh` — it converts, trims silence, normalises, replaces
the placeholder track, and rebuilds. **The cut re-times itself around your
timing**, so a slower or faster read changes the video's length and stays in
sync automatically. Nothing else needs touching.

## If you would rather not use your own voice

Two other routes, in the notes: download macOS Premium voices (free, but a
System Settings step only you can do), or a paid TTS pass which needs your
approval and the Higgsfield connector authorised.

`OUTPUT/0036-voice-comparison.wav` has the five best voices already on this
machine, each announced then reading the opening lines. It is there to pick a
**type** — female or male, US, UK, Irish, Australian — not to argue that any of
them is good enough.
