# Draw pulsing highlight rings that stay locked on a feature: template-track each ring's anchor point
# forwards and backwards through its time window, then composite onto base.mp4 -> base_r.mp4.
# rings.json: [{"png":..., "t0":..., "t1":..., "ta": anchor time, "x":..., "y":...}]
import json, subprocess, numpy as np, cv2
from PIL import Image
W, H, FPS = 1080, 1920, 30
R = json.load(open('rings.json'))
def frames(t0, t1):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t0:.3f}', '-i', 'base.mp4', '-t', f'{t1 - t0:.3f}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W)
def track(fr, i0, x, y, step):
    T = 70; S = 110; pos = {i0: (x, y)}
    tpl = fr[i0][max(0, y - T):y + T, max(0, x - T):x + T].astype(np.float32)
    cx, cy = x, y; i = i0 + step
    while 0 <= i < len(fr):
        x0, y0 = max(0, cx - T - S), max(0, cy - T - S)
        win = fr[i][y0:min(H, cy + T + S), x0:min(W, cx + T + S)].astype(np.float32)
        if win.shape[0] > tpl.shape[0] and win.shape[1] > tpl.shape[1]:
            r = cv2.matchTemplate(win, tpl, cv2.TM_CCOEFF_NORMED); _, sc, _, loc = cv2.minMaxLoc(r)
            if sc > 0.45:
                cx, cy = x0 + loc[0] + tpl.shape[1] // 2, y0 + loc[1] + tpl.shape[0] // 2
                if sc > 0.75:   # refresh template slowly so it follows perspective changes
                    new = fr[i][max(0, cy - T):cy + T, max(0, cx - T):cx + T].astype(np.float32)
                    if new.shape == tpl.shape: tpl = 0.8 * tpl + 0.2 * new
        pos[i] = (cx, cy); i += step
    return pos
paths = []
for r in R:
    n = round((r['t1'] - r['t0']) * FPS)
    if 'keys' in r:   # hand-placed keyframes (thin/low-contrast targets the tracker can't hold)
        kt = np.array([k[0] for k in r['keys']]) - r['t0']; tt_ = np.arange(n) / FPS
        xs = np.interp(tt_, kt, [k[1] for k in r['keys']]); ys = np.interp(tt_, kt, [k[2] for k in r['keys']])
    else:
        fr = frames(r['t0'], r['t1']); n = len(fr); i0 = min(n - 1, max(0, round((r['ta'] - r['t0']) * FPS)))
        p = track(fr, i0, r['x'], r['y'], 1); p.update(track(fr, i0, r['x'], r['y'], -1))
        xs = np.array([p[i][0] for i in range(n)], float); ys = np.array([p[i][1] for i in range(n)], float)
    k = np.ones(5) / 5; xs = np.convolve(np.pad(xs, 2, mode='edge'), k, 'valid'); ys = np.convolve(np.pad(ys, 2, mode='edge'), k, 'valid')
    paths.append((round(r['t0'] * FPS), xs, ys, Image.open(r['png']).convert('RGBA')))
    print(r['png'], r['t0'], 'moved', int(xs.max() - xs.min()), int(ys.max() - ys.min()))
dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', 'base.mp4', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                        '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', 'base_r.mp4'], stdin=subprocess.PIPE)
f = 0; cache = {}
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    act = [(s, xs, ys, im) for s, xs, ys, im in paths if s <= f < s + len(xs)]
    if act:
        img = Image.frombuffer('RGB', (W, H), buf).convert('RGBA')
        for s, xs, ys, im in act:
            j = f - s; t = j / FPS
            sc = (0.5 + 0.5 * t / 0.2) if t < 0.2 else 1 + 0.07 * np.sin(2 * np.pi * 1.6 * t)
            key = (id(im), round(sc, 2))
            if key not in cache: cache[key] = im.resize((max(2, int(im.width * sc)), max(2, int(im.height * sc))), Image.LANCZOS)
            r_ = cache[key]; img.alpha_composite(r_, (int(xs[j] - r_.width / 2), int(ys[j] - r_.height / 2))) if 0 <= int(xs[j] - r_.width / 2) and int(ys[j] - r_.height / 2) >= 0 and int(xs[j] + r_.width / 2) <= W and int(ys[j] + r_.height / 2) <= H else img.paste(r_, (int(xs[j] - r_.width / 2), int(ys[j] - r_.height / 2)), r_)
        buf = img.convert('RGB').tobytes()
    enc.stdin.write(buf); f += 1
enc.stdin.close(); enc.wait(); print('frames', f)
