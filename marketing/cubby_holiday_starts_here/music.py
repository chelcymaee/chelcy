# 10 s cinematic bed: hushed piano + pad until NO (4.2 s: impact, silence), riser into a drop at 5.3 s, upbeat groove after.
# usage: music.py out.wav
import sys, numpy as np
from scipy.io import wavfile
SR = 48000; DUR = 10.6; N = int(DUR * SR); L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(11)
T_NO, T_DROP, BEAT, T_END = 4.2, 5.3, 0.5, 9.3
def add(s, t, pan=0.0, g=1.0):
    i = int(t * SR); j = min(N, i + len(s))
    if j <= i: return
    s = s[:j - i] * g; L[i:j] += s * np.sqrt(0.5 * (1 - pan)); R[i:j] += s * np.sqrt(0.5 * (1 + pan))
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
def tone(freqs, d, a=0.01, dec=1.0, harm=(1, 0.3, 0.1)):
    n = int(d * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for f in freqs:
        for k, h in enumerate(harm): s += h * np.sin(2 * np.pi * f * (k + 1) * t) * np.exp(-t * dec * (k + 1))
    return s * np.minimum(1, t / a)
def piano(m, d=2.0): return tone([mid(m)], d, 0.004, 1.6, (1, 0.45, 0.2, 0.08)) * 0.5
def pad(ms, d):
    n = int(d * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for m in ms:
        f = mid(m); s += np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.003 * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    e = np.minimum(1, t / 0.8) * np.minimum(1, np.maximum(0, (d - t)) / 0.15)
    return s * e * 0.10
def kick(g=1.0):
    n = int(0.45 * SR); t = np.arange(n) / SR; f = 46 + 120 * np.exp(-t * 30)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) + rng.normal(0, 1, n) * np.exp(-t * 250) * 0.12) * 0.9 * g
def clap():
    n = int(0.25 * SR); t = np.arange(n) / SR; x = np.diff(np.concatenate([[0], rng.normal(0, 1, n)]))
    return x * (sum(np.exp(-np.maximum(0, t - o) * 60) * (t >= o) for o in (0, 0.012, 0.024)) + 0.5 * np.exp(-t * 16)) * 0.26
def hat(o=False):
    n = int((0.2 if o else 0.05) * SR); t = np.arange(n) / SR; x = np.diff(np.concatenate([[0], rng.normal(0, 1, n)]))
    return x * np.exp(-t * (13 if o else 85)) * (0.08 if o else 0.06)
def boom():
    n = int(2.2 * SR); t = np.arange(n) / SR; f = 32 + 60 * np.exp(-t * 6)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6) + rng.normal(0, 1, n) * np.exp(-t * 18) * 0.25
    return s * 0.9
def riser(d):
    n = int(d * SR); t = np.arange(n) / n; x = rng.normal(0, 1, n); x = np.convolve(x, np.ones(4) / 4, 'same')
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1800 * t ** 2) / SR) * 0.15
    return (x * 0.45 + sweep * 2.2) * t ** 2.2
# --- part 1: hush (Am9 pad, sparse piano)
add(pad([45, 52, 57, 60, 64, 71], T_NO + 0.05), 0.0)
for t0, m in ((0.15, 76), (0.95, 72), (1.7, 71), (2.45, 69), (3.2, 67), (3.75, 64)): add(piano(m), t0, 0.2 if m % 2 else -0.2)
# cut everything at NO (hard), boom + tail
fade = int(0.03 * SR); i = int(T_NO * SR); L[i:i + fade] *= np.linspace(1, 0, fade); R[i:i + fade] *= np.linspace(1, 0, fade); L[i + fade:] = 0; R[i + fade:] = 0
add(boom(), T_NO); add(riser(T_DROP - (T_NO + 0.35)), T_NO + 0.35)
# --- part 2: groove from the drop
CH = [[53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67], [57, 60, 64, 69]]; RT = [41, 36, 43, 45]
k = 0; t = T_DROP
while t < T_END - 1e-6:
    bar = int(k // 4); c = bar % 4; q = k % 4
    add(kick(1.15 if k == 0 else 1.0), t)
    if q in (1, 3): add(clap(), t, 0.1)
    add(hat(), t + BEAT / 2, 0.3); add(hat(True), t + BEAT / 2 + 0.01, -0.3, 0.5)
    stab = tone([mid(m) for m in CH[c]], BEAT * 0.9, 0.004, 3.5, (1, 0.35, 0.12)) * 0.07
    add(stab, t + BEAT / 2, 0.0)
    if q == 0: add(tone([mid(m + 12) for m in CH[c][1:]], BEAT * 3.6, 0.01, 0.9, (1, 0.25)) * 0.045, t)
    b = tone([mid(RT[c])], BEAT * 0.45, 0.005, 3.0, (1, 0.5, 0.2)); add(np.tanh(2 * b) * 0.35, t); add(np.tanh(2 * b) * 0.25, t + BEAT * 0.75)
    k += 1; t = T_DROP + k * BEAT
# ending: one last kick + bright chord ring on the end card
add(kick(), T_END); add(tone([mid(m) for m in (53, 60, 65, 69, 72, 77)], 1.4, 0.005, 1.2, (1, 0.3, 0.1)) * 0.09, T_END)
mix = np.stack([L, R], 1); mix /= np.max(np.abs(mix)) + 1e-9; mix *= 0.9
f = int(0.5 * SR); mix[-f:] *= np.linspace(1, 0, f)[:, None]
wavfile.write(sys.argv[1], SR, (mix * 32767).astype(np.int16)); print('ok')
