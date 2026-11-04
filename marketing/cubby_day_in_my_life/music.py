# Soft "aesthetic vlog" bed: 120 BPM, warm maj9 chords, sub bass, soft kick, snaps, shaker.
# usage: music.py seconds out.wav
import sys, numpy as np
from scipy.io import wavfile
SR = 48000; BEAT = 0.5; BAR = 2.0
dur = float(sys.argv[1]); out = sys.argv[2]
N = int((dur + 2) * SR); L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(3)
def add(s, t, pan=0.0, g=1.0):
    i = int(t * SR); j = min(N, i + len(s))
    if j <= i: return
    s = s[:j - i] * g
    L[i:j] += s * np.sqrt(0.5 * (1 - pan)); R[i:j] += s * np.sqrt(0.5 * (1 + pan))
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
def pad(freqs, d):
    n = int(d * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for k, f in enumerate(freqs):
        det = 1 + 0.002 * (k % 2 * 2 - 1)
        s += np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * det * t) * np.exp(-t * 2.5) + 0.25 * np.sin(2 * np.pi * f * det * t + 1)
    e = np.minimum(1, t / 0.05) * np.exp(-t * 0.9)
    return s * e * 0.055 * (1 + 0.08 * np.sin(2 * np.pi * 4.2 * t))
def kick():
    n = int(0.4 * SR); t = np.arange(n) / SR; f = 48 + 70 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * 0.55
def snap():
    n = int(0.12 * SR); t = np.arange(n) / SR; x = rng.normal(0, 1, n)
    x = np.convolve(x, [1, -0.6], 'same')
    return x * np.exp(-t * 55) * 0.16
def shaker():
    n = int(0.07 * SR); t = np.arange(n) / SR; x = np.diff(np.concatenate([[0], rng.normal(0, 1, n)]))
    return x * np.sin(np.pi * t / 0.07) * 0.035
def sub(f, d):
    n = int(d * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * np.minimum(1, t / 0.01) * np.exp(-t * 1.6) * 0.32
def bell(f):
    n = int(1.2 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t * 6)) * np.exp(-t * 2.8) * 0.05
# Fmaj9  Em7  Dm9  Cmaj7(add9)
CH = [[53, 57, 60, 64, 67], [52, 55, 59, 62, 67], [50, 53, 57, 60, 64], [48, 52, 55, 59, 62]]
RT = [41, 40, 38, 36]
MEL = [[72, 76, 79, 77], [71, 74, 76, 74], [69, 72, 77, 76], [67, 71, 74, 76]]
nb = int(np.ceil(dur / BAR)) + 1
for b in range(nb):
    t0 = b * BAR; c = b % 4
    add(pad([mid(m) for m in CH[c]], BAR + 0.6), t0, 0.0)
    if b == 0: continue
    add(sub(mid(RT[c]), BAR * 0.75), t0); add(sub(mid(RT[c]), BAR * 0.3), t0 + 1.5 * BEAT, 0, 0.7)
    for q in range(4):
        if q in (0, 2): add(kick(), t0 + q * BEAT)
        if q in (1, 3): add(snap(), t0 + q * BEAT, 0.15)
    add(kick(), t0 + 3.5 * BEAT, 0, 0.5)
    for e in range(8): add(shaker(), t0 + e * BEAT / 2 + (0.03 if e % 2 else 0), -0.3, 1.0 if e % 2 else 0.6)
    for k, m in enumerate(MEL[c]):
        if (b + k) % 2 == 0: add(bell(mid(m)), t0 + k * BEAT + 0.25, 0.35 if k % 2 else -0.35)
mix = np.stack([L, R], 1)
# warm it up: gentle lowpass via moving average blend, then normalise
lp = np.apply_along_axis(lambda x: np.convolve(x, np.ones(5) / 5, 'same'), 0, mix); mix = 0.6 * mix + 0.4 * lp
mix /= np.max(np.abs(mix)) + 1e-9; mix *= 0.89
mix = mix[:int((dur + 0.6) * SR)]; f = int(1.5 * SR); mix[-f:] *= np.linspace(1, 0, f)[:, None]
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
