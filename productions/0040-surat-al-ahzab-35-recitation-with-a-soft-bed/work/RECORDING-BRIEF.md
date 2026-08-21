# Recording brief — Surat Al-Ahzab 35

For **Abdul Baset**, or any qualified reciter on the team. Replaces the supplied
41 kbps file with something worth building on.

## Why re-record rather than synthesise

The supplied take is a messaging-app encode: **41 kbps, 6.8 dB of dynamic range**.
It is usable and it is real recitation, but it will never sound better than it
does now.

A synthetic recitation was considered and ruled out — a text-to-speech voice
reads Qur'an as prose and applies no tajweed at all. See `01-NOTES.md`.

## What to record

`../source/al-ahzab-35.md` — the full ayah, unbroken.

## How

- **Quiet room, soft furnishings.** A bedroom with a wardrobe open beats an
  office. Avoid tiled or empty rooms.
- **Phone is fine**, held about a hand's width away and slightly off to the side
  so breaths do not hit the mic directly.
- **Voice Memos on iPhone: turn on lossless** if available, otherwise it encodes
  to something close to what we already have. On Android, use a recorder app set
  to WAV.
- **Silence before and after.** Two seconds of room tone at the start and end —
  it is what lets a bed be placed cleanly, and it costs nothing to leave running.
- **One unbroken take** if possible. If a line is fluffed, pause, then start that
  phrase again — do not stop the recording. Every take is kept and the best is
  used.
- **No processing.** No noise reduction, no EQ, no "enhance". Send it raw.

## Deliver

Drop the file in `inbox/`. Any format. Say who recited it so the credit is right,
as with 0039.

## What happens next

The bed already exists, tuned to the recitation's key — root and fifth, no third,
because the maqam here uses a neutral or flattened second. **A new take may sit in
a different key**, in which case `work/makepad.py` is re-run against it; that is
one command and no credits.
