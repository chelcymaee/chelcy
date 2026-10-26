# Film-style end credits for the safety & liability section: centred serif text, paragraph k centred at ys[k].
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W = 1080
SERIF = '../fonts/cormorant-500.ttf'; SERIF_B = '../fonts/cormorant-600.ttf'; SANS = '../fonts/montserrat-500.ttf'
TEXT = {
 't22': ('head', 'Safety & Liability'),
 't23': ('body', 'Use of the hot tub is entirely at your own risk.'),
 't24': ('body', 'Mountain Oasis, its owners, and management accept no responsibility or liability for any injury, accident, loss, damage, or illness arising from the use of the hot tub.'),
 't25': ('body', 'Children must be supervised by an adult at all times while using or near the hot tub.'),
 't26': ('body', 'Guests are responsible for using the hot tub safely and in accordance with these instructions.'),
}
def wrap(d, text, font, maxw):
    lines, cur = [], ''
    for w in text.split():
        t = (cur + ' ' + w).strip()
        if cur and d.textlength(t, font=font) > maxw: lines.append(cur); cur = w
        else: cur = t
    return lines + [cur]
def make(path, ys):
    fb = ImageFont.truetype(SERIF, 62); fh = ImageFont.truetype(SERIF_B, 78); fs = ImageFont.truetype(SANS, 26)
    Hc = int(max(ys.values()) + 400)
    im = Image.new('RGBA', (W, Hc), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for k, y in ys.items():
        kind, text = TEXT[k]
        if kind == 'head':
            t = 'MOUNTAIN OASIS'; x = (W - sum(fs.getlength(c) for c in t) - 8 * (len(t) - 1)) / 2
            for c in t: d.text((x, y - 120), c, font=fs, fill=(235, 225, 205, 255)); x += fs.getlength(c) + 8
            tw = d.textlength(text, font=fh); d.text(((W - tw) / 2, y - 55), text, font=fh, fill=(255, 250, 240, 255))
            d.line([(W / 2 - 90, y + 50), (W / 2 + 90, y + 50)], fill=(235, 225, 205, 220), width=2)
        else:
            lines = wrap(d, text, fb, 820); lh = 76; y0 = y - lh * len(lines) / 2
            for j, l in enumerate(lines):
                tw = d.textlength(l, font=fb); d.text(((W - tw) / 2, y0 + j * lh), l, font=fb, fill=(255, 250, 240, 255))
            d.text((W / 2 - 6, y0 + lh * len(lines) + 34), '·', font=fb, fill=(235, 225, 205, 200))
    sh = im.split()[3].filter(ImageFilter.GaussianBlur(10)).point(lambda v: v * 0.55)
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.paste((10, 8, 20, 255), (0, 3), sh); out.alpha_composite(im); out.save(path)
def shade(path):
    import numpy as np
    H = 1920; y = np.linspace(0, 1, H)[:, None]
    a = 0.48 + 0.4 * (np.exp(-((y - 0.0) / 0.16) ** 2) + np.exp(-((y - 1.0) / 0.16) ** 2))
    a = np.clip(a, 0, 0.92) * np.ones((1, W))
    arr = np.zeros((H, W, 4), np.uint8); arr[..., 0] = 8; arr[..., 1] = 6; arr[..., 2] = 16; arr[..., 3] = (a * 255).astype(np.uint8)
    Image.fromarray(arr, 'RGBA').save(path)
if __name__ == '__main__': shade('g/credits_shade.png'); print('ok')
