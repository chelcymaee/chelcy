# Placeholder voiceover for the Mountain Oasis check-in guide (Kokoro af_heart), one wav per line + timing json.
# usage: tts.py [sid] [speed]
import sys, json, numpy as np, sherpa_onnx
from scipy.io import wavfile
M = '../models/kokoro-multi-lang-v1_0/'
sid = int(sys.argv[1]) if len(sys.argv) > 1 else 3; speed = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
lex = M + ('lexicon-gb-en.txt' if 20 <= sid <= 27 else 'lexicon-us-en.txt')
cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
    model=M + 'model.onnx', voices=M + 'voices.bin', tokens=M + 'tokens.txt', data_dir=M + 'espeak-ng-data', lexicon=lex), num_threads=4))
tts = sherpa_onnx.OfflineTts(cfg)
LINES = json.load(open('vo/script.json'))
SR = 24000; out = []; t = 0.35; timing = []
out.append(np.zeros(int(0.35 * SR), np.float32))
for k, (lid, text, gap) in enumerate(LINES):
    a = tts.generate(text, sid=sid, speed=speed); s = np.array(a.samples, np.float32)
    # trim leading/trailing silence
    nz = np.where(np.abs(s) > 0.01)[0]; s = s[max(0, nz[0] - 600): nz[-1] + 1200] if len(nz) else s
    timing.append(dict(id=lid, text=text, s=round(t, 3), e=round(t + len(s) / SR, 3)))
    out += [s, np.zeros(int(gap * SR), np.float32)]; t += len(s) / SR + gap
x = np.concatenate(out); x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
wavfile.write('vo/vo_raw.wav', SR, (x * 32767).astype(np.int16))
json.dump(dict(lines=timing, total=round(t, 3)), open('vo/timing.json', 'w'), indent=1)
print('total', round(t, 2))
