import cv2, numpy as np

import os
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sources') + '/'
W, H = 1920, 1080
WS = 1.3  # wall scale vs source pixels


def face_texture(rng):
    """Quilt the stippled block-face texture from clean areas of the source."""
    S = cv2.imread(SRC + 'lebron.webp').astype(np.float32)[:607] / 255.0
    rects = [(4, 60, 150, 220), (186, 62, 250, 218), (276, 62, 340, 218)]
    patches = []
    for x0, y0, x1, y1 in rects:
        p = S[y0:y1, x0:x1]
        lum = p.mean(2)
        low = cv2.GaussianBlur(lum, (0, 0), 25)
        p = p / low[..., None] * 0.62  # flatten lighting
        p = cv2.resize(p, None, fx=WS, fy=WS, interpolation=cv2.INTER_LANCZOS4)
        patches.append(p)
    T = 72  # tile size (output px)
    step = 52
    acc = np.zeros((H + 2 * T, W + 2 * T, 3), np.float32)
    wsum = np.zeros((H + 2 * T, W + 2 * T), np.float32)
    win1 = np.sin(np.linspace(0, np.pi, T)) ** 1.5
    win = np.outer(win1, win1).astype(np.float32) + 1e-3
    for y in range(-T // 2, H + 1, step):
        for x in range(-T // 2, W + 1, step):
            p = patches[rng.choice(len(patches), p=[.6, .2, .2])]
            py = rng.integers(0, p.shape[0] - T)
            px = rng.integers(0, p.shape[1] - T)
            t = p[py:py + T, px:px + T]
            k = rng.integers(4)
            t = np.rot90(t, k)
            if rng.random() < .5:
                t = t[:, ::-1]
            # random-phase: subtract mean so blending keeps contrast
            ys, xs = y + T // 2, x + T // 2
            acc[ys:ys + T, xs:xs + T] += t * win[..., None]
            wsum[ys:ys + T, xs:xs + T] += win
    tex = acc / np.maximum(wsum, 1e-3)[..., None]
    tex = tex[T // 2:T // 2 + H, T // 2:T // 2 + W]
    # blending lowers contrast in overlaps: restore local contrast
    mean = cv2.GaussianBlur(tex, (0, 0), 6)
    tex = mean + (tex - mean) * 1.45
    # match the real wall's face colour (BGR) and stipple contrast, one shade lighter
    tgt_m = np.array([192, 142, 105], np.float32) / 255 * 1.10
    tgt_s = np.array([18, 22, 26], np.float32) / 255 * 0.85
    m = tex.reshape(-1, 3).mean(0)
    sd = tex.reshape(-1, 3).std(0)
    tex = (tex - m) / sd * tgt_s + tgt_m
    return tex


def structure(rng, ox=-140, oy=-60):
    """Masks for horizontal mortar, vertical joints and slots."""
    bw, bh = 361.5 * WS, 188 * WS
    mortar = np.zeros((H, W), np.float32)
    mortar_mid = np.zeros((H, W), np.float32)
    joint = np.zeros((H, W), np.float32)
    slot = np.zeros((H, W), np.float32)
    slot_rim = np.zeros((H, W), np.float32)
    rows = int(H / bh) + 3
    tone = np.ones((H, W), np.float32)
    for r in range(-1, rows):
        y = oy + r * bh
        yi = int(round(y))
        cv2.rectangle(mortar, (0, yi - 8), (W, yi + 8), 1, -1)
        cv2.line(mortar_mid, (0, yi), (W, yi), 1, 3)
        off = ox + (r % 2) * bw / 2
        c0 = int((-off) // bw) - 1
        for c in range(c0, c0 + int(W / bw) + 4):
            x = off + c * bw
            xi = int(round(x))
            # joint: two thin dark lines with lighter mortar between
            cv2.line(joint, (xi - 5, yi + 6), (xi - 5, int(y + bh) - 6), 1, 3)
            cv2.line(joint, (xi + 5, yi + 6), (xi + 5, int(y + bh) - 6), 1, 3)
            # per-block tone variation
            cv2.rectangle(tone, (xi, yi), (int(x + bw), int(y + bh)), float(rng.normal(1, .04)), -1)
            for q in (0.25, 0.75):
                sx = int(round(x + q * bw))
                y0, y1 = int(y + 0.2 * bh), int(y + 0.93 * bh)
                hw = 11
                cv2.rectangle(slot, (sx - hw, y0 + hw), (sx + hw, y1 - hw), 1, -1)
                cv2.circle(slot, (sx, y0 + hw), hw, 1, -1)
                cv2.circle(slot, (sx, y1 - hw), hw, 1, -1)
    slot_rim = np.clip(cv2.dilate(slot, np.ones((7, 7), np.uint8)) - slot, 0, 1)
    # slot interior: darkest at top edge (overhang shadow)
    blur = lambda a, s: cv2.GaussianBlur(a, (0, 0), s)
    return dict(mortar=blur(mortar, 1.6), mortar_mid=blur(mortar_mid, 1.2), joint=blur(joint, 1.0),
                slot=blur(slot, 1.4), slot_rim=blur(slot_rim, 2.5), tone=blur(tone, 1.5))


def build_wall(seed=11):
    rng = np.random.default_rng(seed)
    tex = face_texture(rng)  # RGB float, BGR order
    st = structure(rng)
    wall = tex * st['tone'][..., None]
    mortar_c = np.array([111, 29, 1], np.float32) / 255  # BGR deep blue
    mortar_m = np.array([156, 78, 29], np.float32) / 255
    slot_c = np.array([34, 14, 1], np.float32) / 255
    jm = st['joint'][..., None]
    wall = wall * (1 - jm) + mortar_c * 1.2 * jm
    mm = st['mortar'][..., None]
    mortar_col = mortar_c * (1 - st['mortar_mid'][..., None]) + mortar_m * st['mortar_mid'][..., None]
    # mortar keeps some stipple
    wall = wall * (1 - mm * 0.85) + mortar_col * mm * 0.85 + tex * mm * 0.0
    rim = st['slot_rim'][..., None]
    wall = wall * (1 - rim * 0.45) + mortar_c * rim * 0.45
    sm = st['slot'][..., None]
    wall = wall * (1 - sm) + slot_c * sm
    return wall


if __name__ == '__main__':
    w = build_wall()
    cv2.imwrite('wall_flat.png', np.clip(w * 255, 0, 255).astype(np.uint8))
