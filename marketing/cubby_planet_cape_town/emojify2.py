# Cover every person's head in a 1080x1920 clip with a cartoon emoji that follows them.
# Person boxes from YOLOX-s (two overlapping square tiles + full frame), tracked by IoU.
# usage: emojify2.py in.mp4 out.mp4 [seed]
import sys, subprocess, numpy as np, cv2, onnxruntime as ort
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]; seed = int(sys.argv[3]) if len(sys.argv) > 3 else 0
W, H, FPS = 1080, 1920, 30
EMO = [Image.open(f'g/emoji/e{i}.png').convert('RGBA') for i in range(1, 5)]
sess = ort.InferenceSession('../models/yolox_s.onnx', providers=['CPUExecutionProvider'])
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
frames = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3); N = len(frames)
grids, strides = [], []
for s in (8, 16, 32):
    g = 640 // s; yv, xv = np.meshgrid(np.arange(g), np.arange(g), indexing='ij')
    grids.append(np.stack([xv, yv], -1).reshape(-1, 2)); strides.append(np.full((g * g, 1), s))
grids = np.concatenate(grids); strides = np.concatenate(strides)
def yolo(img):   # img RGB HxW -> boxes x1,y1,x2,y2,score in img coords
    h, w = img.shape[:2]; r = min(640 / h, 640 / w)
    pad = np.full((640, 640, 3), 114, np.uint8)
    pad[:int(h * r), :int(w * r)] = cv2.resize(img, (int(w * r), int(h * r)))
    x = pad[:, :, ::-1].transpose(2, 0, 1)[None].astype(np.float32)   # model expects BGR 0-255
    o = sess.run(None, {'images': x})[0][0]
    xy = (o[:, :2] + grids) * strides; wh = np.exp(o[:, 2:4]) * strides
    sc = o[:, 4] * o[:, 5]; m = sc > 0.38
    b = np.concatenate([xy[m] - wh[m] / 2, xy[m] + wh[m] / 2], 1) / r
    return np.concatenate([b, sc[m, None]], 1)
def iou(a, b):
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    i = ix * iy; return i / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - i + 1e-6)
def head(b):
    x1, y1, x2, y2 = b[:4]; w, h = x2 - x1, y2 - y1
    size = max(60, min(0.55 * w, max(0.2 * h, 0.3 * w)) * 1.25)
    return (x1 + x2) / 2, y1 + size * 0.42, size
TILES = [(0, 0), (0, 420), (0, 840)]   # 1080x1080 squares covering the frame
def detect(img):
    bs = [yolo(img)]
    for x, y in TILES:
        d = yolo(img[y:y + 1080, x:x + 1080]); d[:, [0, 2]] += x; d[:, [1, 3]] += y; bs.append(d)
    bs = np.concatenate(bs); bs = bs[np.argsort(-bs[:, 4])]; keep = []
    for b in bs:
        if b[3] - b[1] < 40 or b[1] < 6: continue   # head cut off by the top of frame: nothing to hide
        # drop boxes cut by a tile edge if a bigger overlapping one exists
        if all(iou(b, k) < 0.45 and not (b[0] >= k[0] - 8 and b[2] <= k[2] + 8 and b[1] >= k[1] - 8 and b[3] <= k[3] + 8) for k in keep): keep.append(b)
    out = []
    for b in sorted(keep, key=lambda b: -(b[3] - b[1])):
        hx, hy, hs = head(b)
        if all(np.hypot(hx - o[0], hy - o[1]) > 0.8 * max(hs, o[2]) and not (abs(hx - o[0]) < 0.5 * (o[3][2] - o[3][0]) and o[3][1] - 10 < hy < o[3][3]) for o in out): out.append((hx, hy, hs, b))
    return [o[3] for o in out]
tracks = []; nid = 0
for i in range(0, N, 2):
    bs = detect(frames[i]); used = set()
    for tr in tracks:
        if i - tr['last'] > 16: continue
        lb = tr['pts'][-1][1:]; best, bv = None, 0.2
        for j, b in enumerate(bs):
            if j not in used and iou(lb, b) > bv: best, bv = j, iou(lb, b)
        if best is not None: used.add(best); tr['pts'].append((i, *bs[best][:4])); tr['last'] = i
    for j, b in enumerate(bs):
        if j not in used: tracks.append(dict(id=nid, pts=[(i, *b[:4])], last=i)); nid += 1
per = [[] for _ in range(N)]
for tr in tracks:
    p = np.array(tr['pts'])
    if len(p) < 3 and N > 10: continue
    lo, hi = max(0, int(p[0, 0]) - 4), min(N - 1, int(p[-1, 0]) + 10)
    for f in range(lo, hi + 1): per[f].append((tr['id'], *[np.interp(f, p[:, 0], p[:, k]) for k in range(1, 5)]))
out = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                        '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', dst], stdin=subprocess.PIPE)
cache = {}
for f in range(N):
    im = Image.fromarray(frames[f])
    placed = []
    for tid, x1, y1, x2, y2 in sorted(per[f], key=lambda p: -(p[4] - p[2])):
        cx, cy, size = head((x1, y1, x2, y2)); size = int(size)
        if any(np.hypot(cx - px, cy - py) < 0.75 * max(size, ps) for px, py, ps in placed): continue   # same person, track hand-over
        placed.append((cx, cy, size))
        key = (tid, size)
        if key not in cache: cache[key] = EMO[(tid + seed) % 4].resize((size, size), Image.LANCZOS)
        im.paste(cache[key], (int(cx - size / 2), int(cy - size / 2)), cache[key])
    out.stdin.write(im.tobytes())
out.stdin.close(); out.wait()
print(f'{src}: {N} frames, {len([t for t in tracks if len(t["pts"]) >= 2])} people covered')
