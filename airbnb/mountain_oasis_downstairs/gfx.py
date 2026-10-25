# Cute graphics for the Mountain Oasis check-in guide (all PNG, drawn at 2x then downsampled for smooth edges).
import math, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
os.makedirs('g', exist_ok=True)
N9 = '../fonts/nunito-900.ttf'; N8 = '../fonts/nunito-800.ttf'; SI = '../fonts/instrument-serif-400-italic.ttf'
NAVY = (31, 42, 68); CREAM = (255, 248, 236); SAGE = (156, 190, 150); BUTTER = (255, 214, 107); CORAL = (240, 128, 110); SKY = (120, 180, 230)
def shadow(im, r=12, a=0.35, off=(0, 8)):
    sh = im.split()[3].filter(ImageFilter.GaussianBlur(r)).point(lambda v: v * a)
    out = Image.new('RGBA', (im.width + 60, im.height + 60), (0, 0, 0, 0))
    out.paste((0, 0, 0, 255), (30 + off[0], 30 + off[1]), sh); out.alpha_composite(im, (30, 30)); return out
def hi(w, h): return Image.new('RGBA', (w * 2, h * 2), (0, 0, 0, 0))
def lo(im): return im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
def sparkle(path, size=90, col=(255, 255, 255)):
    im = hi(size, size); d = ImageDraw.Draw(im); c = size; r = size * 0.95; k = size * 0.16
    pts = []
    for i in range(8):
        a = math.pi / 4 * i - math.pi / 2; rr = r if i % 2 == 0 else k
        pts.append((c + rr * math.cos(a), c + rr * math.sin(a)))
    d.polygon(pts, fill=col + (255,)); lo(im).save(path)
def heart(path, size=80, col=CORAL):
    im = hi(size, size); d = ImageDraw.Draw(im); s = size * 2
    d.ellipse((s * 0.05, s * 0.12, s * 0.52, s * 0.58), fill=col); d.ellipse((s * 0.48, s * 0.12, s * 0.95, s * 0.58), fill=col)
    d.polygon([(s * 0.08, s * 0.42), (s * 0.92, s * 0.42), (s * 0.5, s * 0.92)], fill=col); lo(im).save(path)
def ring(path, r=110, col=(255, 255, 255), w=12):
    S = r * 2 + 80; im = hi(S, S); d = ImageDraw.Draw(im); c = S
    glow = Image.new('L', im.size, 0); ImageDraw.Draw(glow).ellipse((c - 2 * r - 20, c - 2 * r - 20, c + 2 * r + 20, c + 2 * r + 20), outline=255, width=w * 4)
    im.paste(col + (255,), (0, 0), glow.filter(ImageFilter.GaussianBlur(18)).point(lambda v: v * 0.5))
    d.ellipse((c - 2 * r, c - 2 * r, c + 2 * r, c + 2 * r), outline=col + (255,), width=w * 2); lo(im).save(path)
def arrow(path, direction='right', L=170, col=(255, 255, 255)):
    im = hi(L, 110); d = ImageDraw.Draw(im); s = 2; Lw = L * s
    d.rounded_rectangle((10, 80, Lw - 110, 140), radius=30, fill=col + (255,))
    d.polygon([(Lw - 150, 20), (Lw - 10, 110), (Lw - 150, 200)], fill=col + (255,))
    im = lo(im)
    if direction == 'left': im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if direction == 'down': im = im.rotate(-90, expand=True)
    if direction == 'up': im = im.rotate(90, expand=True)
    shadow(im, 8, 0.45, (0, 5)).save(path)
def pill(path, text, bg=NAVY, fg=CREAM, size=46, font=N8, dot=None, num=None, pad=34):
    f = ImageFont.truetype(font, size * 2); bb = f.getbbox(text); tw, th = bb[2] - bb[0], bb[3] - bb[1]
    lead = 0
    if dot: lead = int(size * 1.9 + 8)
    if num: lead = size * 2 + 30
    H_ = int(size * 2 * 1.7); W_ = tw + 2 * pad * 2 + lead
    im = Image.new('RGBA', (W_, H_), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, W_ - 1, H_ - 1), radius=H_ // 2, fill=bg + (255,))
    x = pad * 2
    if dot:
        R = size * 0.95; d.ellipse((x - 10, H_ / 2 - R, x - 10 + 2 * R, H_ / 2 + R), fill=dot + (255,), outline=NAVY + (255,), width=6); x += 2 * R + 18
    if num:
        R = H_ * 0.38; cx = x + R - 20; d.ellipse((cx - R, H_ / 2 - R, cx + R, H_ / 2 + R), fill=fg + (255,))
        nf = ImageFont.truetype(N9, int(size * 1.8)); nb = nf.getbbox(str(num))
        d.text((cx - (nb[2] - nb[0]) / 2 - nb[0], H_ / 2 - (nb[3] - nb[1]) / 2 - nb[1]), str(num), font=nf, fill=bg + (255,)); x = cx + R + 26
    d.text((x - bb[0], H_ / 2 - th / 2 - bb[1]), text, font=f, fill=fg + (255,))
    shadow(lo(im), 10, 0.35, (0, 6)).save(path)
def caption(path, text, size=46, maxw=900):
    f = ImageFont.truetype(N8, size * 2); words = text.split(); lines = []; cur = ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if cur and f.getlength(t) > (maxw - 80) * 2: lines.append(cur); cur = w
        else: cur = t
    lines.append(cur)
    lh = int(size * 2 * 1.3); wmax = max(f.getlength(l) for l in lines)
    W_ = int(wmax + 100 * 2 / 2 * 2); H_ = lh * len(lines) + 60
    im = Image.new('RGBA', (W_, H_), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, W_ - 1, H_ - 1), radius=44, fill=NAVY + (215,))
    for i, l in enumerate(lines):
        bb = f.getbbox(l); d.text(((W_ - f.getlength(l)) / 2, 30 + i * lh + (lh - (bb[3] - bb[1])) / 2 - bb[1]), l, font=f, fill=(255, 255, 255, 255))
    shadow(lo(im), 10, 0.3, (0, 6)).save(path)
def wifi(path, size=130, col=NAVY):
    im = hi(size, size); d = ImageDraw.Draw(im); s = size * 2
    d.rounded_rectangle((0, 0, s - 1, s - 1), radius=s // 3, fill=(255, 255, 255, 255))
    cx, cy = s / 2, s * 0.72
    for k, r in enumerate((s * 0.40, s * 0.27, s * 0.14)):
        d.arc((cx - r, cy - r, cx + r, cy + r), 225, 315, fill=col + (255,), width=int(s * 0.07))
    d.ellipse((cx - s * 0.05, cy - s * 0.05, cx + s * 0.05, cy + s * 0.05), fill=col + (255,))
    shadow(lo(im), 10, 0.35).save(path)
def parking(path, size=120):
    im = hi(size, size); d = ImageDraw.Draw(im); s = size * 2
    d.rounded_rectangle((0, 0, s - 1, s - 1), radius=s // 4, fill=(40, 100, 200, 255), outline=(255, 255, 255, 255), width=10)
    f = ImageFont.truetype(N9, int(s * 0.75)); bb = f.getbbox('P')
    d.text(((s - (bb[2] - bb[0])) / 2 - bb[0], (s - (bb[3] - bb[1])) / 2 - bb[1]), 'P', font=f, fill='white'); shadow(lo(im), 10, 0.35).save(path)
def title(path):
    im = Image.new('RGBA', (1080, 700), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    f = ImageFont.truetype(SI, 168)
    for j, t in enumerate(['Mountain', 'Oasis']):
        bb = d.textbbox((0, 0), t, font=f); d.text(((1080 - (bb[2] - bb[0])) / 2 - bb[0], 120 + j * 165), t, font=f, fill=(255, 255, 255))
    sh = im.split()[3].filter(ImageFilter.GaussianBlur(14)).point(lambda v: v * 0.55)
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.paste((20, 25, 45, 255), (0, 5), sh); out.alpha_composite(im); out.save(path)
def overview(path, k):   # 4-step card; k = number of steps shown
    steps = [('park out front', SKY), ('grab your keys', BUTTER), ('find your unit', SAGE), ('settle in', CORAL)]
    W_, H_ = 820, 520; im = Image.new('RGBA', (W_ * 2, H_ * 2), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, W_ * 2 - 1, H_ * 2 - 1), radius=80, fill=CREAM + (250,))
    ft = ImageFont.truetype(N9, 64); fs = ImageFont.truetype(N8, 78)
    d.text((80, 56), 'YOUR CHECK-IN IN 4 STEPS', font=ft, fill=NAVY + (255,))
    for i, (t, c) in enumerate(steps[:k]):
        y = 190 + i * 200; R = 70
        d.ellipse((80, y, 80 + 2 * R, y + 2 * R), fill=c + (255,))
        nf = ImageFont.truetype(N9, 88); nb = nf.getbbox(str(i + 1))
        d.text((80 + R - (nb[2] - nb[0]) / 2 - nb[0], y + R - (nb[3] - nb[1]) / 2 - nb[1]), str(i + 1), font=nf, fill=NAVY + (255,))
        bb = fs.getbbox(t); d.text((260, y + R - (bb[3] - bb[1]) / 2 - bb[1]), t, font=fs, fill=NAVY + (255,))
    shadow(lo(im), 16, 0.35, (0, 10)).save(path)
def options(path):
    W_, H_ = 900, 330; im = Image.new('RGBA', (W_ * 2, H_ * 2), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for i, (lab, sub, c) in enumerate((('A', 'the lift', BUTTER), ('B', 'the stairs', SAGE))):
        x0 = i * (W_ + 40); d.rounded_rectangle((x0, 0, x0 + W_ - 40, H_ * 2 - 1), radius=70, fill=CREAM + (250,))
        R = 90; cx = x0 + W_ / 2 - 20; d.ellipse((cx - R, 60, cx + R, 60 + 2 * R), fill=c + (255,))
        nf = ImageFont.truetype(N9, 110); nb = nf.getbbox(lab); d.text((cx - (nb[2] - nb[0]) / 2 - nb[0], 60 + R - (nb[3] - nb[1]) / 2 - nb[1]), lab, font=nf, fill=NAVY + (255,))
        f = ImageFont.truetype(N8, 84); bb = f.getbbox(sub); d.text((cx - (bb[2] - bb[0]) / 2 - bb[0], 440 - (bb[3] - bb[1]) / 2 - bb[1]), sub, font=f, fill=NAVY + (255,))
    shadow(lo(im), 16, 0.35, (0, 10)).save(path)
def endcard(path):
    im = Image.new('RGBA', (1080, 900), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    f = ImageFont.truetype(SI, 150); f2 = ImageFont.truetype(N8, 54)
    for j, (t, ff, y) in enumerate((('enjoy your', f, 160), ('stay', f, 320), ('at Mountain Oasis', f2, 540))):
        bb = d.textbbox((0, 0), t, font=ff); d.text(((1080 - (bb[2] - bb[0])) / 2 - bb[0], y), t, font=ff, fill=(255, 255, 255))
    sh = im.split()[3].filter(ImageFilter.GaussianBlur(14)).point(lambda v: v * 0.6)
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.paste((20, 25, 45, 255), (0, 5), sh); out.alpha_composite(im); out.save(path)
if __name__ == '__main__':
    sparkle('g/sparkle.png'); sparkle('g/sparkle_s.png', 50); sparkle('g/sparkle_y.png', 60, BUTTER); heart('g/heart.png')
    ring('g/ring.png'); ring('g/ring_y.png', 70, BUTTER, 10); ring('g/ring_g.png', 70, (110, 220, 140), 10); ring('g/ring_book.png', 120)
    for dname in ('right', 'left', 'down', 'up'): arrow(f'g/arrow_{dname}.png', dname)
    pill('g/step1.png', 'park out front', bg=NAVY, fg=SKY, num=1, size=58); pill('g/step2.png', 'grab your keys', bg=NAVY, fg=BUTTER, num=2, size=58)
    pill('g/step3.png', 'find your unit', bg=NAVY, fg=SAGE, num=3, size=58); pill('g/step4.png', 'settle in', bg=NAVY, fg=CORAL, num=4, size=58)
    pill('g/chip_signs.png', 'look for the blue signs', bg=CREAM, fg=NAVY, size=52)
    pill('g/chip_top.png', 'top lockbox = your keys', bg=CREAM, fg=NAVY, size=52)
    pill('g/chip_code.png', 'enter your code', bg=CREAM, fg=NAVY, size=52)
    pill('g/chip_sides.png', 'press both sides together', bg=CREAM, fg=NAVY, size=52)
    pill('g/chip_yellow.png', 'up to your pathway', bg=CREAM, fg=NAVY, size=50, dot=BUTTER)
    pill('g/chip_green.png', 'back to the parking', bg=CREAM, fg=NAVY, size=50, dot=(90, 200, 120))
    pill('g/chip_up.png', 'follow the “Upstairs” signs', bg=CREAM, fg=NAVY, size=52)
    pill('g/chip_wifi.png', 'Wi-Fi details: in the welcome book', bg=CREAM, fg=NAVY, size=48)
    ring('g/ring_r.png', 62, (240, 80, 70), 10); ring('g/ring_w.png', 78, (255, 255, 255), 11)
    pill('g/chip_red.png', 'red button = main gate', bg=CREAM, fg=NAVY, size=50, dot=(230, 60, 55))
    pill('g/chip_greenkey.png', 'green key = lift gate', bg=CREAM, fg=NAVY, size=50, dot=(110, 200, 90))
    wifi('g/wifi.png'); parking('g/parking.png'); title('g/title.png'); options('g/options.png'); endcard('g/end.png')
    for k in range(1, 5): overview(f'g/overview{k}.png', k)
    pill('g/subtitle_guide.png', 'self check-in guide', bg=CREAM, fg=NAVY, size=46)
    pill('g/chip_firewood.png', 'firewood: in the front entrance', bg=CREAM, fg=NAVY, size=48)
    pill('g/chip_bags.png', '2 bags included · R100 per extra bag', bg=CREAM, fg=NAVY, size=46)
    pill('g/chip_rack.png', 'clothing rack: under the table', bg=CREAM, fg=NAVY, size=48)
    pill('g/chip_pillow.png', 'pillow in front of the door', bg=CREAM, fg=NAVY, size=50)
    pill('g/chip_wind.png', 'stops it slamming in the wind', bg=CREAM, fg=NAVY, size=46)
    pill('g/chip_leftlight.png', 'left balcony lights: living room switch', bg=CREAM, fg=NAVY, size=44, dot=BUTTER)
    pill('g/chip_rightlight.png', 'right balcony lights: main bedroom', bg=CREAM, fg=NAVY, size=44, dot=BUTTER)
    pill('g/chip_fire.png', 'everything’s in the buckets', bg=CREAM, fg=NAVY, size=50)
    pill('g/chip_dryer.png', 'hairdryer + iron: in the cupboards', bg=CREAM, fg=NAVY, size=46)
    pill('g/chip_home.png', 'welcome home', bg=CREAM, fg=NAVY, size=52)
    pill('g/chip_keysfirst.png', 'first: grab your keys', bg=CREAM, fg=NAVY, size=50)
    pill('g/chip_lift.png', 'option A: the elevator', bg=CREAM, fg=NAVY, size=50, dot=BUTTER)
    pill('g/chip_stairs.png', 'option B: the stairs', bg=CREAM, fg=NAVY, size=50, dot=SAGE)
    pill('g/chip_doorkey.png', 'silver key = front door', bg=CREAM, fg=NAVY, size=50, dot=(200, 205, 215))
    pill('g/chip_sensor.png', '15-min motion sensor', bg=CREAM, fg=NAVY, size=50, dot=BUTTER)
    pill('g/chip_auto.png', 'switches off by itself to save power', bg=CREAM, fg=NAVY, size=44)
    pill('g/chip_downstairs.png', 'downstairs unit', bg=CREAM, fg=NAVY, size=46)
    pill('g/chip_bottom.png', 'bottom lockbox = your keys', bg=CREAM, fg=NAVY, size=50)
    pill('g/chip_blue.png', 'blue button = your front entrance', bg=CREAM, fg=NAVY, size=46, dot=(60, 120, 220))
    pill('g/chip_downleft.png', 'head left: Downstairs + Bungalow', bg=CREAM, fg=NAVY, size=46)
    pill('g/chip_bluekey.png', 'blue key = small white gate', bg=CREAM, fg=NAVY, size=50, dot=(60, 120, 220))
    pill('g/chip_redkey.png', 'red key = front sliding door', bg=CREAM, fg=NAVY, size=50, dot=(220, 50, 50))
    pill('g/chip_wifi2.png', 'Wi-Fi password: in the welcome book', bg=CREAM, fg=NAVY, size=44)
    pill('g/chip_basket.png', 'all keys: in the kitchen basket', bg=CREAM, fg=NAVY, size=48)
    pill('g/chip_dryer2.png', 'hairdryer + iron: in the cupboards', bg=CREAM, fg=NAVY, size=46)
    print('ok')
