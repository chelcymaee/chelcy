# Episode 2 (Mock Pod, Seahawks back-to-back) - rule book v5 + inspiration layer
import json, re, subprocess, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
os.chdir(os.path.dirname(os.path.abspath(__file__)))
FONTS = '../fonts'; F9 = FONTS + '/barlow-condensed-latin-900-normal.ttf'
FPS = 30000 / 1001
CYAN, GREEN, RED = (49, 198, 232), (43, 211, 75), (232, 49, 46)

# ---------- pacing (source seconds) ----------
START, END = 0.10, 26.40
CUTS = [(1.55, 2.10), (3.35, 4.15), (17.60, 18.10)]
_q = lambda t: (round(t * 30000 / 1001) - 0.5) * 1001 / 30000
START, END = _q(START), _q(END); CUTS = [(_q(a), _q(b)) for a, b in CUTS]
keep = []; cur = START
for a, b in CUTS: keep.append((cur, a)); cur = b
keep.append((cur, END))
def E(t):  # source -> edit time
    acc = 0
    for a, b in keep:
        if t < a: return acc
        if t <= b: return acc + t - a
        acc += b - a
    return acc
DUR = E(END)

# ---------- camera shots (source) with 4K face centre ----------
C = [(round(x * 30000 / 1001) - 0.5) * 1001 / 30000 for x in [0, 7.5409, 9.0757, 15.5822, 16.1495, 21.0877, 25.5922, 26.6]]   # half a frame before each camera cut's first frame
SHOTS = [(C[0], C[1], 648, 1088), (C[1], C[2], 1384, 1700), (C[2], C[3], 688, 1116), (C[3], C[4], 1424, 1584),
         (C[4], C[5], 664, 1040), (C[5], C[6], 1396, 1588), (C[6], C[7], 528, 1116)]
def full_crop(cx, cy):   # 9:16 close-up, face ~1/3 width
    w, h = 1400, 2489; x = min(max(cx - w // 2, 0), 2160 - w); y = min(max(cy - int(0.45 * h), 0), 3840 - h); return w, h, x, y
def top_crop(cx, cy):    # 9:8 for split top half
    w, h = 1400, 1244; x = min(max(cx - w // 2, 0), 2160 - w); y = min(max(cy - int(0.52 * h), 0), 3840 - h); return w, h, x, y

# ---------- layout windows (source times) ----------
SPLITS = [  # (t0, t1, panel name)
    (0.10, 3.35, 'hook'), (6.20, 9.0657, 'article'), (13.65, 14.85, 'trio'), (14.85, 16.1395, 'offense'), (16.1395, 19.25, 'defense')]
CUTAWAY = (19.25, 21.15, 5.6)   # source window, broll start
ZOOMS = [(9.70, 11.05)]
STICKERS = [('st_b2b.png', 12.05, 13.65, 540, 330), ('st_trophy.png', 24.40, 26.10, 540, 330)]

# snap all edit points to the source frame grid so layout changes land on exact frames
def q(t): return (round(t * FPS) - 0.5) / FPS
SNAP = {9.0657: C[2], 16.1395: C[4], 21.15: C[5]}
sn = lambda t: SNAP.get(t, q(t))
SPLITS = [(sn(a), sn(b), n) for a, b, n in SPLITS]; CUTAWAY = (sn(CUTAWAY[0]), sn(CUTAWAY[1]), CUTAWAY[2])
ZOOMS = [(q(a), q(b)) for a, b in ZOOMS]; STICKERS = [(f, q(a), q(b), x, y) for f, a, b, x, y in STICKERS]
HF = 0.0
OFF = 1 / FPS   # concat output runs one frame behind the E() timeline
def EN(t0, t1): return f"between(t,{(t0 + OFF) if t0 > 0.01 else -1:.4f},{t1 + OFF - 0.001:.4f})"

# ---------- panels (1080x960 frames) ----------
def fit(im, W, H, cover):
    s = (max if cover else min)(W / im.width, H / im.height); return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS), s
def backdrop(im):
    bg, _ = fit(im, 1080, 960, True); bg = bg.crop(((bg.width - 1080) // 2, (bg.height - 960) // 2, (bg.width - 1080) // 2 + 1080, (bg.height - 960) // 2 + 960))
    return Image.blend(bg.filter(ImageFilter.GaussianBlur(28)), Image.new('RGB', (1080, 960), (12, 14, 20)), 0.55)
def stamp_img(text, col):
    f = ImageFont.truetype(F9, 150); d0 = ImageDraw.Draw(Image.new('RGBA', (10, 10))); w = int(d0.textlength(text, font=f)) + 40
    im = Image.new('RGBA', (w, 190), (0, 0, 0, 0)); d = ImageDraw.Draw(im); d.text((20, 5), text, font=f, fill=col, stroke_width=9, stroke_fill=(10, 10, 10)); return im
def make_panel(name, src, dur, cover, crop=None, box=None, stamp=None):
    im = Image.open(src).convert('RGB')
    if crop: im = im.crop(crop)
    bg = None if cover else backdrop(im)
    base, s = fit(im, 1080 if cover else 1000, 960 if cover else 880, cover)
    n = int(dur * FPS) + 8; out = f'pan_{name}'; os.makedirs(out, exist_ok=True)
    st = stamp_img(*stamp) if stamp else None
    for i in range(n):
        t = i / FPS; z = 1.0 + 0.08 * t / max(dur, 0.1)          # slow zoom 100 -> 108 %
        frame = Image.new('RGB', (1080, 960)) if cover else bg.copy()
        zi = base.resize((round(base.width * z), round(base.height * z)), Image.BILINEAR)
        ox, oy = (1080 - zi.width) // 2, (960 - zi.height) // 2; frame.paste(zi, (ox, oy))
        d = ImageDraw.Draw(frame)
        if not cover: pass
        if box:   # red box draws on from 0.35s over 0.3s (perimeter sweep)
            p = min(max((t - 0.35) / 0.3, 0), 1)
            if p > 0:
                x0, y0, x1, y1 = [ox + v * s * z for v in box[:2]] + [ox + v * s * z for v in box[2:]]
                y0 = oy + box[1] * s * z; y1 = oy + box[3] * s * z
                pts = [(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)]
                L = [abs(pts[k + 1][0] - pts[k][0]) + abs(pts[k + 1][1] - pts[k][1]) for k in range(4)]; tot = sum(L) * p
                for k in range(4):
                    if tot <= 0: break
                    seg = min(1, tot / L[k]); a, b = pts[k], pts[k + 1]
                    d.line([a, (a[0] + (b[0] - a[0]) * seg, a[1] + (b[1] - a[1]) * seg)], fill=RED, width=10); tot -= L[k]
        if st is not None and t > 0.75:   # stamp slams in (scale 1.6 -> 1.0 over 0.15s)
            k = max(1.0, 1.6 - (t - 0.75) / 0.15 * 0.6); sw = st.resize((int(st.width * k * 0.75), int(st.height * k * 0.75)), Image.LANCZOS)
            frame.paste(sw, ((1080 - sw.width) // 2, 960 - sw.height - 40), sw)
        frame.save(f'{out}/{i:04d}.png')
    return out
IN = 'in/'
pw = {n: E(b) - E(a) for a, b, n in SPLITS}
make_panel('hook', IN + 's5.png', pw['hook'], True, crop=(0, 0, 1036, 560))
make_panel('article', IN + 's2.png', pw['article'], False, crop=(0, 0, 1488, 300), box=(18, 10, 1470, 180))
make_panel('trio', IN + 's0.png', pw['trio'], True, crop=(0, 0, 1040, 505))
make_panel('offense', IN + 's3.png', pw['offense'], False, crop=(0, 0, 1424, 560), box=(40, 8, 1340, 112), stamp=('10TH IN SCORING', GREEN))
make_panel('defense', IN + 's4.png', pw['defense'], False, crop=(900, 320, 1774, 886), box=(18, 120, 864, 200), stamp=('#1 DEFENSE', GREEN))

# ---------- hook title (white box, cyan key words) ----------
W, H = 1000, 270; im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
d.rounded_rectangle((8, 8, W - 8, H - 8), radius=32, fill=(255, 255, 255), outline=(15, 15, 15), width=7)
f = ImageFont.truetype(F9, 100)
def line(parts, y):
    w = sum(d.textlength(p, font=f) for p, _ in parts); x = (W - w) / 2
    for p, c in parts:
        d.text((x, y), p, font=f, fill=c, stroke_width=4 if c != (15, 15, 15) else 0, stroke_fill=(15, 15, 15)); x += d.textlength(p, font=f)
line([("CAN THE ", (15, 15, 15)), ("SEAHAWKS", CYAN)], 22); line([("GO ", (15, 15, 15)), ("BACK TO BACK?", CYAN)], 132)
im.save('fx_hook.png')

# ---------- captions ----------
words = json.load(open('words.json'))
FIX = {12.4: 'Seahawks'}   # "seek"/"Seattle's" -> flagged in notes
for w in words:
    for t, v in FIX.items():
        if abs(w['s'] - t) < 0.05: w['w'] = v
ws = [w for w in words if START <= w['s'] < END]
groups = []; g = []
for w in ws:
    g.append(w); txt = " ".join(x['w'] for x in g)
    if len(g) == 3 or re.search(r'[.,?!]$', w['w']) or len(txt) > 14: groups.append(g); g = []
if g: groups.append(g)
def clean(s): return re.sub(r'[.,?!]', '', s).upper()
def ts(t): t = max(t + 1 / FPS, 0); return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"
split_e = [(E(a), E(b)) for a, b, n in SPLITS if n != 'hook']; hook_e = (E(SPLITS[0][0]), E(SPLITS[0][1]))
hdr = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Barlow Condensed ExtraBold,122,&H00FFFFFF,&H00FFFFFF,&H00000000,&H99000000,0,0,0,0,100,100,1,0,1,6,3,2,80,80,300,1
Style: Split,Barlow Condensed ExtraBold,122,&H00FFFFFF,&H00FFFFFF,&H00000000,&H99000000,0,0,0,0,100,100,1,0,1,6,3,2,80,80,965,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
CY = r"{\c&HE8C631&}"; WH = r"{\c&HFFFFFF&}"; ev = []; srt = []
for gi, g in enumerate(groups):
    gend = groups[gi + 1][0]['s'] if gi + 1 < len(groups) else END
    for i, w in enumerate(g):
        a = E(w['s']); b = E(g[i + 1]['s'] if i + 1 < len(g) else min(gend, w['s'] + 1.2))
        if b - a < 0.02 or (hook_e[0] <= a < hook_e[1]): continue
        style = 'Split' if any(x <= a < y for x, y in split_e) else 'Cap'
        ev.append(f"Dialogue: 0,{ts(a)},{ts(b)},{style},,0,0,0,,{' '.join((CY if j == i else WH) + clean(x['w']) for j, x in enumerate(g))}")
    def sr(t): return f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(round((t % 1) * 1000)):03d}"
    srt.append(f"{gi + 1}\n{sr(E(g[0]['s']))} --> {sr(E(min(gend, g[-1]['s'] + 1.2)))}\n{clean(' '.join(x['w'] for x in g))}\n")
open('captions.ass', 'w').write(hdr + "\n".join(ev) + "\n"); open('captions.srt', 'w').write("\n".join(srt))

# ---------- render ----------
inputs = ['raw.mov', 'in/broll.mp4']; fc = []
# speaker pieces: intersect keep x shots, two crops each (full + top)
pieces = []
for a, b in keep:
    for s0, s1, cx, cy in SHOTS:
        x, y = max(a, s0), min(b, s1)
        if y - x > 0.03: pieces.append((x, y, cx, cy))
for i, (a, b, cx, cy) in enumerate(pieces):
    w, h, x, y = full_crop(cx, cy); w2, h2, x2, y2 = top_crop(cx, cy)
    fc.append(f"[0:v]trim={a:.3f}:{b:.3f},setpts=PTS-STARTPTS,split[pa{i}][pb{i}]")
    fc.append(f"[pa{i}]crop={w}:{h}:{x}:{y},scale=1080:1920:flags=lanczos,setsar=1[f{i}]")
    fc.append(f"[pb{i}]crop={w2}:{h2}:{x2}:{y2},scale=1080:960:flags=lanczos,setsar=1[t{i}]")
    fc.append(f"[0:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS[a{i}]")
n = len(pieces)
fc.append("".join(f"[f{i}][t{i}][a{i}]" for i in range(n)) + f"concat=n={n}:v=2:a=1[full0][top][voice0]")
zexpr = "+".join(EN(E(a), E(b)) for a, b in ZOOMS)
fc.append(f"[full0]split[fz0][fz1];[fz1]crop=940:1672:70:150,scale=1080:1920:flags=lanczos[fzz];[fz0][fzz]overlay=0:0:enable='{zexpr}'[full]")
splen = "+".join(EN(E(a), E(b)) for a, b, _ in SPLITS)
fc.append(f"[full][top]overlay=0:0:enable='{splen}'[v0]"); prev = 'v0'; k = 2
for a, b, name in SPLITS:
    inputs += ['-framerate', f'{FPS}', '-i', f'pan_{name}/%04d.png']
    fc.append(f"[{k}:v]setpts=PTS+{max(E(a) + OFF - 2 / FPS, 0):.4f}/TB[p{k}];[{prev}][p{k}]overlay=0:960:eof_action=pass:enable='{EN(E(a), E(b))}'[v{k}]"); prev = f'v{k}'; k += 1
ca, cb, cs = CUTAWAY
fc.append(f"[1:v]trim={cs - 0.1}:{cs + (E(cb) - E(ca)) + 0.3:.3f},setpts=PTS-STARTPTS+{E(ca) + OFF - 0.1:.4f}/TB,scale=1080:1920:flags=lanczos,setsar=1[br];[{prev}][br]overlay=0:0:eof_action=pass:enable='{EN(E(ca), E(cb))}'[vb]"); prev = 'vb'
# hook title + stickers with bounce
pops = [('fx_hook.png', SPLITS[0][0], SPLITS[0][1], 540, 960)] + STICKERS
for f_, a, b, cx, cy in pops:
    t0, t1 = E(a), E(b); D = t1 - t0
    inputs += ['-loop', '1', '-framerate', f'{FPS}', '-t', f'{D + 0.05:.2f}', '-i', f_]
    S = f"if(lt(t\\,0.18)\\,0.25+0.95*t/0.18\\,if(lt(t\\,0.30)\\,1.2-0.2*(t-0.18)/0.12\\,if(gt(t\\,{D - 0.15:.2f})\\,max(0.02\\,({D:.2f}-t)/0.15)\\,1)))"
    fc.append(f"[{k}:v]format=rgba,scale=w='trunc(iw*{S}/2)*2':h='trunc(ih*{S}/2)*2':eval=frame,setpts=PTS+{(t0 + OFF) if t0 > 0.01 else 0:.4f}/TB[s{k}];[{prev}][s{k}]overlay=x='{cx}-w/2':y='{cy}-h/2+7*sin(2*PI*0.7*(t-{t0 + OFF:.4f}))':eval=frame:enable='{EN(t0, t1)}'[v{k}]"); prev = f'v{k}'; k += 1
fc.append(f"[{prev}]subtitles=captions.ass:fontsdir={FONTS}[v]")
# audio
fc.append("[voice0]highpass=f=80,afftdn=nr=8:nf=-45,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=200,loudnorm=I=-14:TP=-1.5:LRA=9,aresample=48000[voice]")
cues = [('card_pop', E(0.10), -9), ('whoosh', E(0.12), -9),
        ('hawk_cry', E(6.20) - 0.05, -11), ('card_pop', E(6.20), -8),
        ('whoosh', E(9.70), -9), ('sparkle', E(12.05), -7),
        ('wr_swish_ooh', E(13.65) - 0.05, -8), ('card_pop', E(14.85), -8), ('impact', E(14.85) + 0.75, -9),
        ('card_pop', E(16.15), -8), ('impact', E(16.15) + 0.75, -7),
        ('impact', E(19.25), -8), ('crowd_cheer', E(19.25), -10),
        ('coin_chime', E(24.40), -8), ('whistle', DUR - 0.80, -10)]
base = len([x for x in inputs if x == '-i']) + 2  # raw + broll counted below
idx0 = 2 + len(SPLITS) + len(pops)
for j, (c, t0, g) in enumerate(cues):
    inputs += ['-i', f'../sfx/{c}.wav']
    fc.append(f"[{idx0 + j}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={g}dB,adelay={int(t0 * 1000)}|{int(t0 * 1000)}[x{j}]")
fc.append("[voice]" + "".join(f"[x{j}]" for j in range(len(cues))) + f"amix=inputs={len(cues) + 1}:duration=longest:normalize=0,alimiter=limit=0.7:level=false,apad,atrim=0:{DUR:.3f}[a]")
cmd = ['ffmpeg', '-v', 'error', '-y', '-i', inputs[0], '-i', inputs[1]] + inputs[2:] + ['-filter_complex', ";".join(fc), '-map', '[v]', '-map', '[a]',
       '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-r', '30000/1001', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', f'{DUR:.3f}', 'reel_ep2.mp4']
subprocess.run(cmd, check=True)
json.dump(dict(keep=keep, dur=DUR, splits=[(E(a), E(b), n) for a, b, n in SPLITS], cutaway=(E(CUTAWAY[0]), E(CUTAWAY[1]))), open('timeline.json', 'w'), indent=1)
print('done', round(DUR, 2))
