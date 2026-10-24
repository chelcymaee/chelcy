# Put one steady emoji on each of the two main walkers in a 1080x1920 clip.
# YOLOX-s person boxes on every frame -> two biggest full-body boxes -> left/right person ->
# outlier rejection + smoothing so the emoji glides with the head instead of jumping.
# usage: emoji2p.py in.mp4 out.mp4
import sys, subprocess, numpy as np, cv2, onnxruntime as ort
from PIL import Image
from scipy.ndimage import median_filter, gaussian_filter1d
src, dst = sys.argv[1], sys.argv[2]
W, H, FPS = 1080, 1920, 30
EMO = [Image.open(f'g/emoji/e{i}.png').convert('RGBA') for i in (1, 2)]   # left: sunglasses, right: wink
sess = ort.InferenceSession('../models/yolox_s.onnx', providers=['CPUExecutionProvider'])
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
frames = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3); N = len(frames)
grids, strides = [], []
for s in (8, 16, 32):
    g = 640 // s; yv, xv = np.meshgrid(np.arange(g), np.arange(g), indexing='ij')
    grids.append(np.stack([xv, yv], -1).reshape(-1, 2)); strides.append(np.full((g * g, 1), s))
grids = np.concatenate(grids); strides = np.concatenate(strides)
def yolo(img):
    h, w = img.shape[:2]; r = min(640 / h, 640 / w)
    pad = np.full((640, 640, 3), 114, np.uint8); pad[:int(h * r), :int(w * r)] = cv2.resize(img, (int(w * r), int(h * r)))
    o = sess.run(None, {'images': pad[:, :, ::-1].transpose(2, 0, 1)[None].astype(np.float32)})[0][0]
    xy = (o[:, :2] + grids) * strides; wh = np.exp(o[:, 2:4]) * strides; sc = o[:, 4] * o[:, 5]; m = sc > 0.3
    return np.concatenate([np.concatenate([xy[m] - wh[m] / 2, xy[m] + wh[m] / 2], 1) / r, sc[m, None]], 1)
def iou(a, b):
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0, min(a[3], b[3]) - max(a[1], b[1])); i = ix * iy
    return i / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - i + 1e-6)
def detect(img):
    d = [yolo(img)]
    for y in (0, 420, 840):
        t = yolo(img[y:y + 1080]); t[:, [1, 3]] += y; d.append(t)
    d = np.concatenate(d); d = d[np.argsort(-d[:, 4])]; keep = []
    for b in d:
        h, w = b[3] - b[1], b[2] - b[0]
        if h < 120 or h / w < 1.7 or b[1] < 6 or b[3] > H - 6: continue   # whole, standing people only
        if all(iou(b, k) < 0.3 for k in keep): keep.append(b)
    return sorted(keep, key=lambda b: -(b[3] - b[1]))
# raw head observations per person: x centre, head-top y, body height
obs = np.full((2, N, 3), np.nan)
for f in range(N):
    bs = detect(frames[f])[:3]
    if len(bs) >= 2:
        # the two walkers are the two tallest people of similar height
        a, b = bs[0], bs[1]
        if (b[3] - b[1]) > 0.6 * (a[3] - a[1]):
            for k, bb in enumerate(sorted([a, b], key=lambda q: q[0])): obs[k, f] = ((bb[0] + bb[2]) / 2, bb[1], bb[3] - bb[1])
            continue
    if len(bs) >= 1 and f > 0:   # only one walker visible this frame: give it to whoever was nearest
        bb = bs[0]; cx = (bb[0] + bb[2]) / 2
        last = [np.nanmean(obs[k, max(0, f - 15):f, 0]) if not np.all(np.isnan(obs[k, max(0, f - 15):f, 0])) else np.nan for k in range(2)]
        if not np.isnan(last).all():
            k = int(np.nanargmin([abs(cx - l) if not np.isnan(l) else 1e9 for l in last])); obs[k, f] = (cx, bb[1], bb[3] - bb[1])
out = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                        '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', dst], stdin=subprocess.PIPE)
tracks = []
for k in range(2):
    o = obs[k]; ok = ~np.isnan(o[:, 0]); fr = np.arange(N)
    print(f'person {k}: seen in {ok.sum()}/{N} frames')
    sm = np.zeros((N, 3))
    for c in range(3):
        v = np.interp(fr, fr[ok], o[ok, c])
        v = median_filter(v, 9, mode='nearest')            # throw away one-off bad boxes
        # drop observations far from the median trend, then re-interpolate
        bad = ok & (np.abs(np.interp(fr, fr[ok], o[ok, c]) - v) > (0.06 * np.nanmedian(o[:, 2]) if c != 2 else 0.12 * v))
        good = ok & ~bad
        v = np.interp(fr, fr[good], o[good, c]); v = median_filter(v, 7, mode='nearest')
        sm[:, c] = gaussian_filter1d(v, 4 if c < 2 else 10, mode='nearest')
    tracks.append(sm)
for f in range(N):
    im = Image.fromarray(frames[f])
    for k, sm in enumerate(tracks):
        cx, top, h = sm[f]; size = int(max(60, 0.23 * h))
        e = EMO[k].resize((size, size), Image.LANCZOS)
        im.paste(e, (int(round(cx - size / 2)), int(round(top + 0.07 * h - size / 2 + size * 0.12))), e)
    out.stdin.write(im.tobytes())
out.stdin.close(); out.wait()
