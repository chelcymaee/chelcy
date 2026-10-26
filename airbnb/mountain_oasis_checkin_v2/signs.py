# Recreations of the Mountain Oasis wayfinding signs as pop-up cards (drawn at 2x for crisp edges).
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
NAVY = (40, 44, 82); WHITE = (255, 255, 255)
FS = '../fonts/cormorant-600.ttf'; FSB = '../fonts/cormorant-700.ttf'; FSI = '../fonts/cormorant-500i.ttf'; FSR = '../fonts/cormorant-500.ttf'
FM = '../fonts/montserrat-600.ttf'; FMR = '../fonts/montserrat-500.ttf'; FSCRIPT = '../fonts/greatvibes.ttf'
K = 2
def F(p, s): return ImageFont.truetype(p, int(s * K))
def ctext(d, cx, y, text, font, fill=WHITE, track=0):
    if track:
        w = sum(font.getlength(c) for c in text) + track * K * (len(text) - 1); x = cx - w / 2
        for c in text: d.text((x, y), c, font=font, fill=fill); x += font.getlength(c) + track * K
        return
    bb = d.textbbox((0, 0), text, font=font); d.text((cx - (bb[2] - bb[0]) / 2 - bb[0], y), text, font=font, fill=fill)
def logo(d, cx, y, s=1.0):
    u = lambda x, yy: (cx + (x - 150) * K * s, y + yy * K * s); lw = int(3.2 * K * s)
    d.line([u(78, 70), u(110, 44), u(122, 38), u(222, 37), u(240, 46), u(262, 50), u(280, 62)], fill=WHITE, width=lw, joint='curve')
    for k, (yy, amp, x0, x1) in enumerate(((78, 4, 40, 285), (88, 5, 60, 270), (98, 4, 90, 250))):
        pts = [u(x, yy + amp * math.sin((x - x0) / (x1 - x0) * math.pi * 2)) for x in range(x0, x1 + 1, 4)]; d.line(pts, fill=WHITE, width=lw)
    pts = [u(70 + 6 * math.sin(t / 60 * 1.2), 100 - t) for t in range(0, 62, 3)]; d.line(pts, fill=WHITE, width=lw + 1)
    top = (76, 38)
    for ang, ln, droop in ((200, 30, 10), (235, 26, 8), (300, 28, 8), (335, 32, 11), (265, 20, 4)):
        a = math.radians(ang); pts = []
        for t in range(0, 11):
            f = t / 10; x = top[0] + math.cos(a) * ln * f; yy = top[1] + math.sin(a) * ln * f + droop * f * f
            pts.append(u(x, yy))
        d.line(pts, fill=WHITE, width=lw)
def card(w=560, h=792):
    im = Image.new('RGBA', (w * K, h * K), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w * K - 1, h * K - 1), radius=18 * K, fill=NAVY + (255,))
    d.rounded_rectangle((14 * K, 14 * K, (w - 14) * K, (h - 14) * K), radius=12 * K, outline=(200, 205, 225, 170), width=int(1.5 * K))
    return im, d
def finish(im, path, w):
    im = im.resize((im.width // K, im.height // K), Image.LANCZOS)
    sh = im.split()[3].filter(ImageFilter.GaussianBlur(18)).point(lambda v: v * 0.45)
    out = Image.new('RGBA', (im.width + 80, im.height + 80), (0, 0, 0, 0)); out.paste((0, 0, 0, 255), (40, 52), sh); out.alpha_composite(im, (40, 40)); out.save(path)
def up_arrow(d, x, y, h, lw=3):
    d.line([(x, y), (x, y + h)], fill=WHITE, width=int(lw * K)); d.line([(x - h * 0.28, y + h * 0.3), (x, y), (x + h * 0.28, y + h * 0.3)], fill=WHITE, width=int(lw * K), joint='curve')
def left_arrow(d, x, y, w_, lw=3):
    d.line([(x, y), (x + w_, y)], fill=WHITE, width=int(lw * K)); d.line([(x + w_ * 0.32, y - w_ * 0.3), (x, y), (x + w_ * 0.32, y + w_ * 0.3)], fill=WHITE, width=int(lw * K), joint='curve')
def standard(path, head, sub, extra=None, arrow=False, w=560, h=792):
    im, d = card(w, h); cx = w * K / 2
    logo(d, cx, 92 * K, 1.18); ctext(d, cx, 238 * K, 'MOUNTAIN OASIS', F(FM, 23), track=4)
    fh = F(FS, 88); y = 312 * K
    for line in head: ctext(d, cx, y, line, fh); y += 86 * K
    y += 26 * K; d.line([(cx - 125 * K, y), (cx + 125 * K, y)], fill=WHITE, width=int(2.5 * K)); y += 40 * K
    fs = F(FSR, 60); x_off = -40 * K if arrow else 0
    for line in sub: ctext(d, cx + x_off, y, line, fs); y += 58 * K
    if arrow: up_arrow(d, cx + 180 * K, y - 124 * K, 104 * K)
    if extra: ctext(d, cx, y + 8 * K, extra, F(FSI, 34))
    finish(im, path, w)
def heading(path, w=560, h=792):
    im, d = card(w, h); cx = w * K / 2
    logo(d, cx, 60 * K, 1.0); ctext(d, cx, 185 * K, 'MOUNTAIN OASIS', F(FM, 21), track=4)
    fh = F(FS, 68); y = 240 * K
    for line in ('WHERE', 'ARE YOU', 'HEADING?'): ctext(d, cx, y, line, fh); y += 64 * K
    y += 26 * K; d.line([(60 * K, y), ((w - 60) * K, y)], fill=WHITE, width=int(2.5 * K))
    d.line([(cx, y + 20 * K), (cx, (h - 50) * K)], fill=WHITE, width=int(2.5 * K))
    lx, rx = cx - 135 * K, cx + 135 * K; ay = y + 75 * K
    left_arrow(d, lx - 50 * K, ay, 100 * K); up_arrow(d, rx, ay - 45 * K, 92 * K)
    fl = F(FSR, 32); ctext(d, lx, ay + 75 * K, 'DOWNSTAIRS', fl); ctext(d, lx, ay + 108 * K, '+BUNGALOW', fl); ctext(d, lx, ay + 150 * K, 'Private Entrance', F(FSI, 28))
    ctext(d, rx, ay + 108 * K, 'VILLA', fl); ctext(d, rx, ay + 150 * K, 'Keep Climbing', F(FSI, 28))
    finish(im, path, w)
def welcome(path, w=560, h=792):
    im, d = card(w, h); cx = w * K / 2
    logo(d, cx, 46 * K, 0.85); ctext(d, cx, 150 * K, 'MOUNTAIN OASIS', F(FM, 19), track=4)
    ctext(d, cx, 175 * K, 'Welcome', F(FSCRIPT, 96))
    fsec = F(FSB, 31); fb = F(FMR, 21)
    def section(y, title, rows):
        bb = d.textbbox((0, 0), title, font=fsec); tw = bb[2] - bb[0]; ctext(d, cx, y, title, fsec)
        d.line([(cx - tw / 2, y + 42 * K), (cx + tw / 2, y + 42 * K)], fill=WHITE, width=int(1.6 * K)); y += 70 * K
        for n, col, l1, l2 in rows:
            R = 21 * K; x0 = 70 * K; d.ellipse((x0, y, x0 + 2 * R, y + 2 * R), fill=WHITE)
            nf = F(FM, 30); nb = d.textbbox((0, 0), str(n), font=nf); d.text((x0 + R - (nb[2] - nb[0]) / 2 - nb[0], y + R - (nb[3] - nb[1]) / 2 - nb[1]), str(n), font=nf, fill=col)
            d.text((x0 + 2 * R + 22 * K, y - 4 * K), l1, font=fb, fill=WHITE); d.text((x0 + 2 * R + 22 * K, y + 24 * K), l2, font=fb, fill=WHITE); y += 76 * K
        return y
    y = section(300 * K, 'FOR UPSTAIRS:', [(1, (90, 180, 70), 'Please press the GREEN button', 'to bring the lift down.'), (2, (235, 180, 40), 'Then press the YELLOW button', 'and follow the signs.')])
    section(y + 14 * K, 'FOR DOWNSTAIRS & BUNGALOW', [(1, (90, 180, 70), 'Please press the GREEN button', 'to bring the lift down.'), (2, (60, 100, 200), 'Then press the BLUE button to take', 'you to your floor & follow the signs.')])
    finish(im, path, w)
if __name__ == '__main__':
    import os; os.makedirs('g/signs', exist_ok=True)
    welcome('g/signs/welcome.png')
    standard('g/signs/made_it.png', ['YOU', 'MADE IT'], ['Welcome to', 'Mountain Oasis'], extra='Now Exhale.')
    standard('g/signs/halfway.png', ['HALFWAY', 'THERE'], ['The view is', 'worth it.'], arrow=True)
    standard('g/signs/follow.png', ['FOLLOW', 'THE STAIRS'], ['Your holiday', 'starts here.'])
    standard('g/signs/moment.png', ['TAKE A', 'MOMENT'], ['You’ve earned', 'this view.'])
    heading('g/signs/heading.png')
    standard('g/signs/legday.png', ['LEG DAY?', 'CONSIDER', 'IT DONE.'], ['Keep going…'], arrow=True)
    from PIL import Image
    names = ['welcome', 'follow', 'moment', 'halfway', 'heading', 'made_it']
    ims = [Image.open(f'g/signs/{n}.png') for n in names]; out = Image.new('RGBA', (sum(i.width for i in ims), ims[0].height), (110, 110, 110, 255)); x = 0
    for i in ims: out.alpha_composite(i, (x, 0)); x += i.width
    out.convert('RGB').resize((out.width // 2, out.height // 2)).save('signs_preview.png'); print('ok')
