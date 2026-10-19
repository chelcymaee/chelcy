# Original upbeat bed for the suitcase diary: 105 BPM, 1 chord per bar, filtered intro, drop on bar 2,
# riser into the Cubby reveal. usage: music.py bars out.wav [reveal_bar]
import sys, numpy as np
from scipy.io import wavfile
SR = 48000; BPM = 105; BEAT = 60 / BPM; BAR = 4 * BEAT
bars = float(sys.argv[1]); out = sys.argv[2]; reveal = int(sys.argv[3]) if len(sys.argv) > 3 else 9
N = int((bars * BAR + 1.5) * SR); L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(7)
def add(sig, t, pan=0.0, g=1.0):
    i = int(t * SR); j = min(N, i + len(sig)); s = sig[:j - i] * g
    L[i:j] += s * np.sqrt(0.5 * (1 - pan)); R[i:j] += s * np.sqrt(0.5 * (1 + pan))
def env(n, a=0.002, d=0.3):
    t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / d)
def kick():
    n = int(0.45 * SR); t = np.arange(n) / SR; f = 45 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * 0.9 + rng.normal(0, 1, n) * np.exp(-t * 300) * 0.15
def clap():
    n = int(0.25 * SR); t = np.arange(n) / SR; x = rng.normal(0, 1, n)
    x = np.diff(np.concatenate([[0], x]))   # brighter
    e = sum(np.exp(-np.maximum(0, t - o) * 60) * (t >= o) for o in (0, 0.011, 0.022)) + np.exp(-t * 18) * 0.6
    return x * e * 0.32
def hat(open_=False):
    n = int((0.22 if open_ else 0.05) * SR); t = np.arange(n) / SR; x = np.diff(np.concatenate([[0], rng.normal(0, 1, n)]))
    return x * np.exp(-t * (14 if open_ else 90)) * (0.10 if open_ else 0.08)
def ep(freqs, dur, d=0.55):   # electric-piano-ish chord stab
    n = int(dur * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for f in freqs:
        s += (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 6) + 0.12 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 10))
    return s * env(n, 0.004, d) * 0.11 * (1 + 0.15 * np.sin(2 * np.pi * 5 * t))
def bass(f, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.tanh(2.2 * (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)))
    return s * env(n, 0.005, 0.22) * 0.30
def pluck(f, dur=0.3):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 20)) * env(n, 0.002, 0.12) * 0.09
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
# Am7  Fmaj7  Cmaj7  G6  (vi IV I V) - bright, feel-good
CH = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 64]]
RT = [45, 41, 36, 43]
ARP = [[69, 72, 76, 79], [65, 69, 72, 76], [67, 72, 76, 79], [67, 71, 74, 79]]
nb = int(np.ceil(bars))
duck = np.ones(N)
for b in range(nb):
    t0 = b * BAR; c = b % 4; intro = b == 0; last = b >= nb - 1; build = b == reveal - 1
    for k in range(8):   # off-beat chord stabs, 8ths
        if k % 2 == 1 or intro: add(ep([mid(m) for m in CH[c]], BEAT * 0.9), t0 + k * BEAT / 2, 0.0, 0.7 if intro else 1.0)
    if intro: continue
    for q in range(4):
        if not (build and q >= 2):
            add(kick(), t0 + q * BEAT); i = int((t0 + q * BEAT) * SR)
            duck[i:i + int(0.22 * SR)] = np.minimum(duck[i:i + int(0.22 * SR)], 0.45 + 0.55 * np.linspace(0, 1, int(0.22 * SR)) ** 0.6)
        if q in (1, 3) and not build: add(clap(), t0 + q * BEAT, 0.1)
    for e in range(8):
        add(hat(open_=(e % 2 == 1 and e in (3, 7))), t0 + e * BEAT / 2 + (0.018 if e % 2 else 0), 0.35)
        add(bass(mid(RT[c]) * (2 if e in (3, 6) else 1), BEAT / 2), t0 + e * BEAT / 2, 0.0, 0.0 if build and e >= 4 else 1.0)
    if not last:
        for s16 in range(16):   # sparkly arp on top
            if s16 % 3 != 2: add(pluck(mid(ARP[c][s16 % 4])), t0 + s16 * BEAT / 4, 0.4 if s16 % 2 else -0.4)
    if build:   # snare roll + noise riser into the reveal
        for r in range(16): add(clap() * (0.3 + 0.7 * r / 15), t0 + 2 * BEAT + r * BEAT / 8, 0.0, 0.6)
        n = int(2 * BEAT * SR); tt = np.arange(n) / n; x = rng.normal(0, 1, n) * tt ** 2 * 0.12
        add(np.convolve(x, np.ones(6) / 6, 'same'), t0 + 2 * BEAT)
# chords/bass pump under the kick
L *= duck ** 0.7; R *= duck ** 0.7
mix = np.stack([L, R], 1); mix /= np.max(np.abs(mix)) + 1e-9; mix *= 0.89
fade = int(1.2 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print('bars', nb, 'bar sec', BAR, 'dur', N / SR)
