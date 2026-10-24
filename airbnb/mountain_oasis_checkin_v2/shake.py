# mean frame-to-frame jitter (high-frequency part of global motion), px
import sys, cv2, numpy as np
def jitter(p, t0, t1):
    cap = cv2.VideoCapture(p); cap.set(cv2.CAP_PROP_POS_MSEC, t0 * 1000); prev = None; d = []
    while cap.get(cv2.CAP_PROP_POS_MSEC) < t1 * 1000:
        ok, f = cap.read()
        if not ok: break
        g = cv2.cvtColor(cv2.resize(f, (270, 480)), cv2.COLOR_BGR2GRAY).astype(np.float32)
        if prev is not None: (dx, dy), _ = cv2.phaseCorrelate(prev, g); d.append((dx, dy))
        prev = g
    d = np.array(d); sm = np.array([np.convolve(d[:, k], np.ones(9) / 9, 'same') for k in range(2)]).T
    return float(np.abs(d - sm).mean() * 4)
for a, b in [(46, 64), (66, 72), (85, 95), (99, 106)]:
    print(a, b, 'old %.2f new %.2f' % (jitter('base_mid.mp4', a, b), jitter('base.mp4', a, b)))
