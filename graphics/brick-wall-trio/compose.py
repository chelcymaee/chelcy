import cv2, numpy as np
from wall import build_wall, W, H

import os
HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, 'sources') + '/'
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def load_rgba(path):
    im = cv2.imread(path, cv2.IMREAD_UNCHANGED).astype(np.float32) / 255
    return im[..., :3], im[..., 3]


def fix_lebron_head(rgb, a):
    """Head touches the top of the original frame: rebuild the missing dome."""
    pad = 40
    h, w = a.shape
    rgb2 = np.zeros((h + pad, w, 3), np.float32)
    a2 = np.zeros((h + pad, w), np.float32)
    rgb2[pad:], a2[pad:] = rgb, a
    # mirror the top rows of the scalp upward
    rgb2[:pad] = rgb[1:pad + 1][::-1]
    # fit a circle to the head silhouette between y=0..55
    pts = []
    for y in range(0, 56, 3):
        r = np.where(a[y, 300:700] > .5)[0]
        if len(r):
            pts += [(r[0] + 300, y), (r[-1] + 300, y)]
    pts = np.array(pts, np.float64)
    A = np.c_[2 * pts[:, 0], 2 * pts[:, 1], np.ones(len(pts))]
    b = (pts ** 2).sum(1)
    cx, cy, c = np.linalg.lstsq(A, b, rcond=None)[0]
    R = np.sqrt(c + cx ** 2 + cy ** 2)
    Y, X = np.mgrid[-pad:h, 0:w]
    d = R - np.hypot(X - cx, Y - cy)
    dome = np.clip(d / 1.5 + .5, 0, 1).astype(np.float32)
    a2[:pad + 6] = np.maximum(a2[:pad + 6], dome[:pad + 6]) * (dome[:pad + 6] > 0)
    a2[:pad] = dome[:pad]
    return rgb2, a2, pad


def place(rgb, a, s, ox, oy):
    M = np.float32([[s, 0, ox], [0, s, oy]])
    pre = rgb * a[..., None]
    P = cv2.warpAffine(pre, M, (W, H), flags=cv2.INTER_LANCZOS4, borderValue=0)
    A = cv2.warpAffine(a, M, (W, H), flags=cv2.INTER_LANCZOS4, borderValue=0)
    A = np.clip(A, 0, 1)
    C = np.clip(P / np.maximum(A, 1e-4)[..., None], 0, 1)
    return C, A


def tighten(A, px=1):
    # pull the matte in slightly to kill background fringes
    e = cv2.erode(A, np.ones((2 * px + 1, 2 * px + 1), np.uint8))
    return cv2.GaussianBlur(e, (0, 0), 0.7)


def rim(A, strength, up_bias=0.6):
    b = cv2.GaussianBlur(A, (0, 0), 3)
    edge = np.clip(A - b, 0, 1) * 2.0 * A
    gy = cv2.Sobel(b, cv2.CV_32F, 0, 1, ksize=5)
    gx = cv2.Sobel(b, cv2.CV_32F, 1, 0, ksize=5)
    n = np.hypot(gx, gy) + 1e-5
    facing_up = np.clip(gy / n, 0, 1)  # alpha increases downward → top edge
    side = np.abs(gx / n)
    return np.clip(edge * (up_bias * facing_up + (1 - up_bias) * side + .25), 0, 1) * strength


def cone(ax, ay, tx, ty, half_deg, soft=0.72):
    """Spotlight cone projected on the wall from apex (ax, ay) aimed at (tx, ty)."""
    dirx, diry = tx - ax, ty - ay
    base = np.arctan2(dirx, diry)
    ang = np.arctan2(xx - ax, yy - ay) - base
    th = np.radians(half_deg)
    c = smooth(th, th * soft, np.abs(ang))
    return c


def gauss(cx, cy, rx, ry):
    return np.exp(-(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2))


def main():
    wall = build_wall()

    # ---------- players ----------
    lb_rgb, lb_a = load_rgba(WORK + 'lebron_cut.png')
    lb_rgb, lb_a = lb_rgb[:607], lb_a[:607]
    lb_rgb, lb_a, pad = fix_lebron_head(lb_rgb, lb_a)
    sL = 1.38
    L_rgb, L_a = place(lb_rgb, lb_a, sL, 960 - 497 * sL, H - (607 + pad) * sL)

    kb_rgb, kb_a = load_rgba(WORK + 'kobe_cut.png')
    sK = 1.12
    K_rgb, K_a = place(kb_rgb, kb_a, sK, -55, H - 844 * sK + 4)
    K_a = tighten(K_a)

    cf_rgb, cf_a = load_rgba(WORK + 'flagg_cut.png')
    sF = 1.30
    F_oy = H - 718 * sF - 105
    F_rgb, F_a = place(cf_rgb, cf_a, sF, 1575 - 320 * sF, F_oy)
    F_a = tighten(F_a)
    # fade the cropped bottom of Flagg's photo into the floor darkness
    F_bottom = F_oy + 718 * sF
    F_a *= 1 - smooth(F_bottom - 300, F_bottom - 10, yy)

    # ---------- lighting on the wall ----------
    spots = [  # apex x, apex y, target x, target y, half angle, strength
        (960, -380, 960, 420, 21, 1.15),
        (470, -380, 500, 420, 19, 0.9),
        (1600, -380, 1570, 420, 19, 0.9),
    ]
    light = np.full((H, W), 0.24, np.float32)
    beams = np.zeros((H, W), np.float32)
    for ax, ay, tx, ty, hd, k in spots:
        c = cone(ax, ay, tx, ty, hd)
        dist = np.hypot(xx - ax, yy - ay)
        fall = np.clip((1.0 - (dist - 420) / 1500), 0.25, 1) ** 1.6
        pool = gauss(tx, ty - 60, 300, 360)
        light += k * (0.70 * c * fall + 0.65 * pool * c + 0.10 * pool)
        beams += k * c * np.clip(1 - (yy + 80) / 1250, 0, 1) ** 1.3
    # floor falloff
    light *= 1 - 0.55 * smooth(H * 0.62, H * 1.0, yy)
    # contact shadows: each player casts down-right onto the wall
    def shadow(A, dx, dy, blur, op):
        M = np.float32([[1, 0, dx], [0, 1, dy]])
        s = cv2.warpAffine(A, M, (W, H))
        s = cv2.GaussianBlur(s, (0, 0), blur)
        return 1 - op * s
    light *= shadow(K_a, 30, 26, 16, 0.55)
    light *= shadow(F_a, 30, 26, 16, 0.55)
    light *= shadow(L_a, 48, 30, 22, 0.62)

    lit_wall = wall * 1.0 * light[..., None]
    wl = lit_wall.mean(2, keepdims=True)
    lit_wall = np.clip(wl + (lit_wall - wl) * 1.45, 0, None)
    # slight cool tint in the spill, warm-white in the hot core
    out = lit_wall

    # ---------- relight + composite players ----------
    def relight(rgb, A, spot_x, top, bottom, gain, warm=(1, 1, 1), contrast=1.0):
        g = 1.08 - 0.5 * smooth(top, bottom, yy)
        g *= 1 - 0.18 * smooth(250, 900, np.abs(xx - spot_x))
        c = rgb
        if contrast != 1.0:
            m = c.mean()
            c = np.clip((c - m) * contrast + m, 0, 1)
        c = c * np.array(warm, np.float32) * (g * gain)[..., None]
        r = rim(A, 0.32)
        c = c + r[..., None] * np.array([1.0, .82, .62], np.float32) * 0.8  # BGR blue bounce rim
        return c

    K_c = relight(K_rgb, K_a, 520, 120, 1050, 0.95, warm=(1.04, 1.0, 0.95), contrast=1.08)
    F_c = relight(F_rgb, F_a, 1570, 60, 950, 0.95, contrast=1.1)
    L_c = relight(L_rgb, L_a, 960, 250, 1150, 1.06, contrast=1.04)

    def over(dst, c, A):
        return dst * (1 - A[..., None]) + c * A[..., None]

    out = over(out, K_c, K_a)
    out = over(out, F_c, F_a)
    # floor darkness over the back row (LeBron stays in front of it)
    fog = smooth(H * 0.62, H * 1.0, yy) * 0.75
    out *= (1 - fog)[..., None]
    out = over(out, L_c, L_a)

    # LeBron casts a soft occlusion onto the players behind him
    occ = cv2.GaussianBlur(cv2.warpAffine(L_a, np.float32([[1, 0, -18], [0, 1, 10]]), (W, H)), (0, 0), 22)
    out *= (1 - 0.35 * occ * (1 - L_a) * np.maximum(K_a, F_a))[..., None]

    # ---------- atmosphere ----------
    rng = np.random.default_rng(3)
    haze = cv2.GaussianBlur(rng.normal(0, 1, (H // 4, W // 4)).astype(np.float32), (0, 0), 6)
    haze = cv2.resize(haze, (W, H)) * 0.35 + 1
    beam_col = np.array([1.0, .96, .9], np.float32)  # BGR, cool white
    out = 1 - (1 - out) * (1 - (beams * haze * 0.13)[..., None] * beam_col)
    # dust in the beams
    dust = (rng.random((H, W)) > 0.9997).astype(np.float32)
    dust = cv2.GaussianBlur(dust, (0, 0), 1.1) * 6
    out += (dust * beams * 0.35)[..., None]

    # ---------- grade ----------
    out = np.clip(out, 0, None)
    # highlight roll-off on luminance so the blue stays saturated in the hot spots
    lum = out.max(2, keepdims=True) + 1e-5
    lt = (1 - np.exp(-lum * 1.25)) / (1 - np.exp(-1.25))
    out = out * (lt / lum)
    # S-curve
    out = np.clip(out, 0, 1)
    out = out + 0.10 * (out - out ** 2) * (2 * out - 1) * -1
    # vignette
    v = 1 - 0.38 * smooth(0.45, 1.15, np.hypot((xx - W / 2) / (W / 2), (yy - H * 0.45) / (H * 0.62)))
    out *= v[..., None]
    # shadows toward deep navy
    lum = out.mean(2, keepdims=True)
    out = out + (1 - smooth(0, .18, lum)) * np.array([0.02, 0.006, 0.0], np.float32)
    # grain
    out += rng.normal(0, 0.012, (H, W, 1)).astype(np.float32)
    # gentle sharpen
    bl = cv2.GaussianBlur(out, (0, 0), 1.2)
    out = out + (out - bl) * 0.45
    out = np.clip(out, 0, 1)
    cv2.imwrite(os.path.join(HERE, 'brick-wall-trio.png'), (out * 255 + .5).astype(np.uint8))


if __name__ == '__main__':
    main()
