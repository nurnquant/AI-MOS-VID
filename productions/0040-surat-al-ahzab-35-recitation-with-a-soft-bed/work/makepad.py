#!/usr/bin/env python3
"""Synthesise a soft drone pad in the recitation's own key. Local, zero credits.

ROOT AND FIFTH ONLY — no third. The reciter's pitch histogram showed D at 36.6%
with D# at 25.9%, which is maqam behaviour: a neutral or flattened second above
the tonic. A pad carrying a major or minor third would fight that on every
phrase. Root and fifth are consonant against any maqam.
"""
import numpy as np, wave, sys

ROOT = float(open("work/root.txt").read().split()[0])
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 30.0
SR = 48000
t = np.arange(int(DUR * SR)) / SR

def voice(f, amp, detune_c=0.0, drift=0.0):
    """One soft partial. Slight detune and slow drift stop it sounding synthetic."""
    f = f * 2 ** (detune_c / 1200)
    vib = 1 + drift * np.sin(2 * np.pi * 0.07 * t + f)      # very slow, sub-audible
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    # a few harmonics, falling away fast: warm, not buzzy
    return amp * (np.sin(ph) + 0.30 * np.sin(2 * ph) + 0.10 * np.sin(3 * ph))

L = (voice(ROOT, 0.55, -4, 0.002) + voice(ROOT * 1.5, 0.32, +3, 0.0015)
     + voice(ROOT * 2, 0.16, -6, 0.001))
R = (voice(ROOT, 0.55, +4, 0.0018) + voice(ROOT * 1.5, 0.32, -3, 0.0022)
     + voice(ROOT * 2, 0.16, +6, 0.0012))

# breathing swell, so it never sits perfectly still under the voice
swell = 0.82 + 0.18 * np.sin(2 * np.pi * t / 11.0 - np.pi / 2)
L *= swell; R *= swell

# one-pole low pass: take the top off so it sits behind the recitation
def lp(x, cut=900.0):
    a = np.exp(-2 * np.pi * cut / SR)
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y

L, R = lp(L), lp(R)

# long fades: a pad that starts abruptly announces itself
fi, fo = int(4.0 * SR), int(5.0 * SR)
env = np.ones(len(t))
env[:fi] = np.linspace(0, 1, fi) ** 2
env[-fo:] = np.linspace(1, 0, fo) ** 2
L *= env; R *= env

peak = max(np.abs(L).max(), np.abs(R).max())
L, R = L / peak * 0.5, R / peak * 0.5
inter = np.empty(len(t) * 2, dtype=np.float32)
inter[0::2], inter[1::2] = L, R

w = wave.open("work/pad.wav", "wb")
w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((inter * 32767).astype(np.int16).tobytes())
w.close()
print(f"  pad.wav  root {ROOT:.2f} Hz + fifth {ROOT*1.5:.2f} Hz, {DUR}s, no third")
