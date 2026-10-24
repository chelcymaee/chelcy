# Mountain Oasis self check-in guide v2 (new footage): tester style + house walkthrough + sunset breathers.
import json, os, subprocess
os.chdir(os.path.dirname(os.path.abspath(__file__)))
FPS = 30; W, H = 1080, 1920; F = 0.22   # crossfade length
VO = os.environ.get('VO', 'vo/vo_raw.wav'); TIM = os.environ.get('TIM', 'vo/timing.json')
tm = json.load(open(TIM)); L = {l['id']: l for l in tm['lines']}
S = lambda i: L[i]['s']; E = lambda i: L[i]['e']
def at(i, frac): return round(S(i) + (E(i) - S(i)) * frac, 3)
r30 = lambda x: round(x * FPS) / FPS
RAMP = json.load(open('ramp.json')); RD = sum(round((b - a) / s * FPS) for a, b, s, _ in RAMP) / FPS
END_T = r30(E('l21') + 3.2)
C = dict(a1=S('l02'), a2=S('l03'), a3=S('l03') + 2.4, op=S('l08'), a4=S('l04'), a6=S('l06'), a7=S('l07b'), a8=S('l07c'),
         b1=S('l09'), b1b=S('l09') + 1.8, b2=S('l09') + 3.0, b4=S('l12') - RD, c1=S('l12'), c1b=S('l12b'), c2=S('l13'), c3=S('l13b'),
         c5=S('l14'), c6=S('l14') + 1.5, c7=S('l15'), c8=S('l15') + 3.0, c9=S('l16'), d1=S('l17'), d2=S('l18'), ds=S('l18b'), d3=S('l19'),
         d4=S('l20'), d5=S('l20') + 1.4, d6=S('l20') + 2.8, d8=E('l21') - 0.2)
C = {k: r30(v) for k, v in C.items()}
SEG = [
    (0, C['a1'], 'clip', dict(f='5915', ss=0.0, speed=0.35)),
    (C['a1'], C['a2'], 'clip', dict(f='5890', ss=0.0, speed=0.4)),
    (C['a2'], C['a3'], 'clip', dict(f='1186', ss=0.6, speed=0.8)),
    (C['a3'], C['op'], 'clip', dict(f='1188', ss=0.0, speed=0.5)),
    (C['op'], C['a4'], 'clip', dict(f='5893', ss=0.0, speed=0.35, blur=True)),
    (C['a4'], C['a6'], 'freeze_end', dict(f='1192', ss=0.0, until=2.3, speed=0.75)),
    (C['a6'], C['a7'], 'clip', dict(f='T1107', ss=0.0, path='src/T1107.MOV')),
    (C['a7'], C['a8'], 'clip', dict(f='1195', ss=0.0)),
    (C['a8'], C['b1'], 'clip', dict(f='1199', ss=0.0, speed=0.75)),
    (C['b1'], C['b1b'], 'clip', dict(f='1196', ss=0.5, speed=0.8)),
    (C['b1b'], C['b2'], 'clip', dict(f='1201', ss=0.3, speed=0.85)),
    (C['b2'], C['b4'], 'still', dict(f='1202', ss=1.0, z=0.0, px=640, py=1000)),
    (C['b4'], C['c1'], 'ramp', dict(f='1203')),
    (C['c1'], C['c2'], 'clip', dict(f='1204', ss=2.6)),
    (C['c2'], C['c3'], 'clip', dict(f='1205', ss=0.0, speed=0.5)),
    (C['c3'], C['c5'], 'still', dict(f='1205', ss=1.2, z=0.10, px=540, py=1400)),
    (C['c5'], C['c6'], 'clip', dict(f='1208', ss=1.6, speed=0.8)),
    (C['c6'], C['c7'], 'clip', dict(f='1206', ss=0.0, speed=0.7)),
    (C['c7'], C['c8'], 'clip', dict(f='1212', ss=1.8, speed=0.8)),
    (C['c8'], C['c9'], 'clip', dict(f='1213', ss=0.0, speed=0.75)),
    (C['c9'], C['d1'], 'clip', dict(f='1215', ss=4.6)),
    (C['d1'], C['d2'], 'clip', dict(f='1218', ss=0.0, speed=0.6)),
    (C['d2'], C['ds'], 'clip', dict(f='1225', ss=3.4)),
    (C['ds'], C['d3'], 'clip', dict(f='1216', ss=2.4, speed=0.5)),
    (C['d3'], C['d4'], 'clip', dict(f='1222', ss=0.0, speed=0.7)),
    (C['d4'], C['d5'], 'clip', dict(f='1220', ss=4.8, speed=0.6)),
    (C['d5'], C['d6'], 'clip', dict(f='1227', ss=8.4, speed=0.5)),
    (C['d6'], C['d8'], 'clip', dict(f='5965', ss=0.0, speed=0.35)),
    (C['d8'], END_T, 'clip', dict(f='5966', ss=0.0, speed=0.3, blur=True)),
]
GRADE = GRADE = "eq=contrast=1.04:saturation=1.08:gamma=1.02,colorbalance=rs=0.03:bs=-0.02:rm=0.02,vignette=PI/6"
os.makedirs('seg', exist_ok=True)
files = []
for i, (a, b, kind, A) in (enumerate(SEG) if not os.environ.get('SKIP_BASE') else []):
    D = (b - a) + (F if i < len(SEG) - 1 else 0); n = round(D * FPS); out = f'seg/{i:02d}.mp4'; files.append((out, a))
    src = A.get('path') or f"src/IMG_{A['f']}.MOV"
    _st = f"stab/{os.path.basename(src).rsplit('.', 1)[0]}.mp4"
    if os.path.exists(_st): src = _st; sp = A.get('speed', 1.0)
    fill = f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},setsar=1"
    drift = f"zoompan=z='1+0.035*on/{n}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s={W}x{H}:fps={FPS}"
    blur = ',gblur=sigma=14,eq=brightness=-0.05' if A.get('blur') else ''
    if kind == 'clip':
        vf = f"setpts=PTS/{sp},{fill},fps={FPS},tpad=stop_mode=clone:stop_duration=20,{drift},{GRADE}{blur}"
        cmd = ['-ss', str(A['ss']), '-i', src, '-vf', vf]
    elif kind == 'freeze_end':
        vf = f"setpts=PTS/{sp},{fill},fps={FPS},trim=end={(A['until'] - A['ss']) / sp:.3f},tpad=stop_mode=clone:stop_duration=20,{GRADE}"
        cmd = ['-ss', str(A['ss']), '-i', src, '-vf', vf]
    elif kind == 'still':
        z, px, py = A['z'], A['px'], A['py']
        vf = (f"{fill},loop=loop=-1:size=1,fps={FPS},zoompan=z='1+{z}*min(1\\,on/{n})':x='{px}-{px}/zoom':y='{py}-{py}/zoom':d=1:s={W}x{H}:fps={FPS},{GRADE}")
        cmd = ['-ss', str(A['ss']), '-i', src, '-frames:v', '1', '-vf', vf]; cmd = ['-ss', str(A['ss']), '-i', src, '-vf', vf]
    elif kind == 'ramp':
        pieces = RAMP; parts = []; used = 0
        for j, (pa, pb, ps, _) in enumerate(pieces):
            pn = round((pb - pa) / ps * FPS) if j < len(pieces) - 1 else n - used; used += pn; pp = f'seg/r{j:02d}.mp4'; parts.append(pp)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(pa), '-i', src, '-vf', f"setpts=PTS/{ps},{fill},fps={FPS},tpad=stop_mode=clone:stop_duration=5,{GRADE}",
                            '-frames:v', str(pn), '-an', '-r', str(FPS), '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', pp], check=True)
        open('seg/ramp.txt', 'w').write(''.join(f"file '{os.path.basename(p)}'\n" for p in parts))
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'seg/ramp.txt', '-c', 'copy', out], check=True)
        print(i, kind, A['f'], f'{a:.2f}-{b:.2f}'); continue
    elif kind == 'card':   # landscape clip as a rounded card over its own blurred fill
        cw, ch = 980, 552
        vf_bg = f"[0:v]setpts=PTS/{sp},{fill},fps={FPS},tpad=stop_mode=clone:stop_duration=20,gblur=sigma=30,eq=brightness=-0.08:saturation=1.1[bg]"
        vf_fg = (f"[0:v]setpts=PTS/{sp},scale={cw}:{ch}:flags=lanczos,fps={FPS},tpad=stop_mode=clone:stop_duration=20,{GRADE},format=rgba[fg0];"
                 f"[1:v]scale={cw}:{ch},format=gray[mk];[fg0][mk]alphamerge[fg];[2:v]format=rgba[bd]")
        from PIL import Image, ImageDraw
        m = Image.new('L', (cw, ch), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, cw - 1, ch - 1), radius=48, fill=255); m.save('g/cardmask.png')
        bd = Image.new('RGBA', (cw + 24, ch + 24), (0, 0, 0, 0)); ImageDraw.Draw(bd).rounded_rectangle((0, 0, cw + 23, ch + 23), radius=58, fill=(255, 255, 255, 255)); bd.save('g/cardborder.png')
        fc = f"{vf_bg};{vf_fg};[bg][bd]overlay=x={(W - cw) // 2 - 12}:y={760 - 12}[b1];[b1][fg]overlay=x={(W - cw) // 2}:y=760"
        cmd = ['-ss', str(A['ss']), '-i', src, '-loop', '1', '-i', 'g/cardmask.png', '-loop', '1', '-i', 'g/cardborder.png', '-filter_complex', fc]
    subprocess.run(['ffmpeg', '-v', 'error', '-y'] + cmd + ['-frames:v', str(n), '-an', '-r', str(FPS), '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', out], check=True)
    print(i, kind, A['f'], f'{a:.2f}-{b:.2f}')
# crossfade chain
ins = []; fc = []
for p, _ in files: ins += ['-i', p]
prev = '0:v'
for i in range(1, len(files)):
    fc.append(f"[{prev}][{i}:v]xfade=transition=fade:duration={F}:offset={files[i][1]:.3f}[x{i}]"); prev = f'x{i}'
if not os.environ.get('SKIP_BASE') and not os.environ.get('DUMP_RINGS'): subprocess.run(['ffmpeg', '-v', 'error', '-y'] + ins + ['-filter_complex', ';'.join(fc), '-map', f'[{prev}]', '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', 'base.mp4'], check=True)

if os.environ.get('BASE_ONLY'): raise SystemExit
# ---------------- overlays ----------------
POP = "if(lt(T\\,0.16)\\,0.3+0.95*T/0.16\\,if(lt(T\\,0.28)\\,1.25-0.25*(T-0.16)/0.12\\,1))"
OV = []; TOP = 230
OV += [('g/title.png', 0.1, C['a1'] + 0.1, 540, 820, 'pop'), ('g/subtitle_guide.png', 0.7, C['a1'] + 0.1, 540, 1130, 'pop'),
       ('g/sparkle.png', 0.5, C['a1'], 240, 640, 'twinkle'), ('g/sparkle_s.png', 0.8, C['a1'], 860, 700, 'twinkle'), ('g/sparkle_y.png', 1.0, C['a1'], 820, 1020, 'twinkle')]
ov_t = [C['a1'] + 0.3 + k * 0.6 for k in range(4)]
for k in range(4): OV.append((f'g/overview{k + 1}.png', ov_t[k], ov_t[k + 1] if k < 3 else C['a2'], 540, 1060, 'pop' if k == 0 else 'static'))
OV += [('g/step1.png', C['a2'] + 0.2, C['op'], 540, TOP, 'pop'), ('g/parking.png', C['a3'] + 0.2, C['op'], 860, 640, 'pop'),
       ('g/chip_signs.png', C['a3'] + 0.3, C['op'], 540, 1300, 'pop'), ('g/options.png', C['op'] + 0.4, C['a4'], 540, 1000, 'pop'),
       ('g/chip_keysfirst.png', at('l08', 0.7), C['a4'], 540, 1380, 'pop')]
OV += [('g/step2.png', C['a4'] + 0.2, C['b1'], 540, TOP, 'pop'),
       ('g/ring.png', S('l05'), C['a6'], 600, 710, 'pulse'), ('g/arrow_left.png', S('l05') + 0.15, C['a6'], 850, 710, 'bobx'),
       ('g/chip_top.png', S('l05') + 0.3, C['a6'], 540, 420, 'pop'),
       ('g/chip_code.png', S('l06') + 0.3, S('l07'), 540, 420, 'pop'), ('g/chip_sides.png', S('l07') + 0.1, C['a7'], 540, 420, 'pop'),
       ('g/arrow_right.png', S('l07') + 0.2, C['a7'] - 0.3, 285, 1110, 'bobx'), ('g/arrow_left.png', S('l07') + 0.2, C['a7'] - 0.3, 945, 1110, 'bobx_r'),
       ('g/sparkle_y.png', E('l07') - 0.2, C['a7'], 640, 1000, 'twinkle')]
OV += [('g/ring_r.png', C['a7'] + 0.7, C['a7'] + 2.6, 432, 1048, 'pulse'), ('g/chip_red.png', C['a7'] + 0.8, C['a8'], 540, 420, 'pop'),
       ('g/ring_g.png', C['a8'] + 0.3, C['a8'] + 1.6, 408, 1172, 'pulse'), ('g/chip_greenkey.png', C['a8'] + 0.4, C['b1'], 540, 420, 'pop')]
t_yel = max(C['b2'] + 0.1, at('l09', 0.66)); t_grn = at('l10', 0.6)
OV += [('g/step3.png', C['b1'] + 0.2, C['c1'], 540, TOP, 'pop'), ('g/chip_lift.png', C['b1'] + 0.3, C['b2'], 540, 420, 'pop'),
       ('g/ring_w.png', t_yel, t_grn, 660, 815, 'pulse'), ('g/chip_yellow.png', t_yel + 0.15, t_grn, 540, 420, 'pop'),
       ('g/ring_w.png', t_grn, C['b4'], 660, 1172, 'pulse'), ('g/chip_green.png', t_grn + 0.15, C['b4'], 540, 420, 'pop'),
       ('g/chip_stairs.png', C['b4'] + 0.3, C['b4'] + 3.0, 540, 420, 'pop')]
from PIL import Image as _I
SC = 0.6
for nm in ('welcome', 'follow', 'legday', 'moment', 'halfway', 'made_it'):
    sc_ = 0.5 if nm == 'made_it' else SC
    im = _I.open(f'g/signs/{nm}.png'); im.resize((int(im.width * sc_), int(im.height * sc_)), _I.LANCZOS).save(f'g/signs/{nm}_s.png')
SIDE = dict(follow=(250, 820), legday=(225, 820), moment=(250, 820), halfway=(250, 820), made_it=(180, 820))
tt = C['b4']; SIGN_T = []
for pa, pb, ps, nm in RAMP:
    d_ = round((pb - pa) / ps * FPS) / FPS
    if nm:
        x_, y_ = SIDE[nm]
        OV.append((f'g/signs/{nm}_s.png', tt + 0.08, min(tt + d_ + 0.3, C['c1']), x_, y_, 'float'))
        OV.append(('g/sparkle_s.png', tt + 0.2, tt + d_, x_ + 150, y_ - 280, 'twinkle')); SIGN_T.append(tt + 0.08)
    tt += d_
OV += [('g/step4.png', C['c1'] + 0.2, C['d4'], 540, TOP, 'pop'), ('g/chip_doorkey.png', C['c1'] + 0.8, C['c1b'] + 0.6, 540, 420, 'pop'),
       ('g/ring_w.png', C['c1'] + 0.8, C['c1'] + 2.6, 0, 0, 'pulse'),
       ('g/chip_firewood.png', S('l13') + 0.6, C['c3'], 540, 420, 'pop'), ('g/chip_bags.png', C['c3'] + 0.3, C['c5'], 540, 420, 'pop'),
       ('g/ring_book.png', C['c6'] + 0.2, C['c7'], 560, 1280, 'pulse'), ('g/wifi.png', C['c6'] + 0.1, C['c7'], 820, 900, 'pop'), ('g/chip_wifi.png', C['c6'] + 0.25, C['c7'], 540, 420, 'pop'),
       ('g/chip_pillow.png', C['c8'] + 0.1, C['c9'], 540, 420, 'pop'), ('g/ring.png', C['c8'] + 0.2, C['c9'], 505, 1575, 'pulse'),
       ('g/chip_wind.png', C['c8'] + 0.9, C['c9'], 540, 530, 'pop'),
       ('g/chip_leftlight.png', C['c9'] + 0.4, C['d1'], 540, 420, 'pop'), ('g/ring_y.png', C['c9'] + 2.5, C['d1'], 500, 1160, 'pulse'),
       ('g/chip_fire.png', C['d1'] + 0.4, C['d2'], 540, 420, 'pop'), ('g/sparkle_y.png', C['d1'] + 0.8, C['d2'], 300, 1000, 'twinkle'),
       ('g/chip_rightlight.png', C['d2'] + 0.4, C['ds'], 540, 420, 'pop'), ('g/ring_y.png', C['d2'] + 2.4, C['d2'] + 3.15, 708, 978, 'pulse'),
       ('g/chip_sensor.png', C['ds'] + 0.5, C['d3'], 540, 420, 'pop'), ('g/chip_auto.png', C['ds'] + 2.0, C['d3'], 540, 530, 'pop'),
       ('g/chip_dryer.png', C['d3'] + 0.3, C['d4'], 540, 420, 'pop')]
OV += [('g/heart.png', S('l21') + 0.6, C['d8'], 820, 640, 'float'), ('g/sparkle_s.png', S('l20') + 0.2, C['d5'], 270, 700, 'twinkle'),
       ('g/end.png', C['d8'] + 0.25, END_T, 540, 860, 'pop'), ('g/heart.png', C['d8'] + 0.6, END_T, 540, 470, 'float'),
       ('g/sparkle.png', C['d8'] + 0.5, END_T, 230, 820, 'twinkle'), ('g/sparkle_y.png', C['d8'] + 0.8, END_T, 860, 760, 'twinkle'),
       ('g/sparkle_s.png', C['d8'] + 1.0, END_T, 820, 1180, 'twinkle')]
import gfx
for l in tm['lines']:
    if l['id'] in ('l01',): continue
    p = f"g/sub_{l['id']}.png"; gfx.caption(p, l['text'].replace("'", "’"))
    nxt = [m['s'] for m in tm['lines'] if m['s'] > l['s']]; t1 = min(l['e'] + 0.45, nxt[0] - 0.02) if nxt else min(l['e'] + 0.6, C['d8'])
    if l['id'] == 'l21': t1 = C['d8']
    OV.append((p, l['s'], t1, 540, {'l07b': 760, 'l15': 760, 'l13b': 1650, 'l12': 760}.get(l['id'], 1610), 'fade'))
RINGS = [o for o in OV if o[0].startswith('g/ring')]; OV = [o for o in OV if not o[0].startswith('g/ring')]
if os.environ.get('DUMP_RINGS'): json.dump([[o[0], round(o[1], 3), round(o[2], 3)] for o in RINGS], open('ring_list.json', 'w')); raise SystemExit
RA = json.load(open('ring_anchors.json'))
json.dump([dict(png=o[0], t0=round(o[1], 3), t1=round(o[2], 3), **RA[o[0] + '@' + str(round(o[1], 2))]) for o in RINGS], open('rings.json', 'w'), indent=1)
if not os.environ.get('SKIP_RINGS'): subprocess.run(['python3', 'track_rings.py'], check=True)
ins = ['-i', 'base_r.mp4']; fc = []; prev = '0:v'; k = 1
for png, t0, t1, cx, cy, an in OV:
    D = t1 - t0
    if D <= 0.05: continue
    ins += ['-loop', '1', '-framerate', str(FPS), '-t', f'{D + 0.1:.2f}', '-i', png]
    T = 't'; sc = '1'; xo = '0'; yo = '0'; pre = 'format=rgba'
    if an == 'pop': sc = POP.replace('T', 't')
    elif an == 'pulse': sc = f"if(lt(t\\,0.2)\\,0.5+0.5*t/0.2\\,1+0.07*sin(2*PI*1.6*t))"
    elif an == 'twinkle': sc = f"0.55+0.45*abs(sin(PI*1.1*t+{k % 3}))"
    elif an == 'float': sc = POP.replace('T', 't'); yo = f"-10*sin(2*PI*0.8*(t-{t0}))"
    elif an == 'bobx': xo = f"-16*abs(sin(2*PI*1.2*(t-{t0})))"
    elif an == 'bobx_r': xo = f"16*abs(sin(2*PI*1.2*(t-{t0})))"
    elif an == 'boby': yo = f"-18*abs(sin(2*PI*1.2*(t-{t0})))"
    if an == 'fade': pre = 'format=rgba,fade=in:st=0:d=0.2:alpha=1'
    scale = f",scale=w='trunc(iw*{sc}/2)*2':h='trunc(ih*{sc}/2)*2':eval=frame" if sc != '1' else ''
    fc.append(f"[{k}:v]{pre}{scale},setpts=PTS+{t0}/TB[o{k}];[{prev}][o{k}]overlay=x='({cx})-w/2+{xo}':y='({cy})-h/2+{yo}':eval=frame:enable='between(t,{t0},{t1 - 0.001})'[v{k}]")
    prev = f'v{k}'; k += 1
# ---------------- audio ----------------
SFX = '../sfx/'
cues = [('sparkle', 0.3, -12), ('card_pop', C['a1'] + 0.3, -14), ('pop', ov_t[1], -16), ('pop', ov_t[2], -16), ('pop', ov_t[3], -16),
        ('pop', C['a2'] + 0.2, -15), ('pop', C['a3'] + 0.2, -14), ('card_pop', C['op'] + 0.4, -14), ('pop', at('l08', 0.7), -15),
        ('pop', C['a4'] + 0.2, -15), ('pop', S('l05'), -13), ('pop', S('l06') + 0.3, -15), ('pop', S('l07') + 0.1, -15),
        ('lock_click', E('l07') - 0.3, -9), ('sparkle', E('l07') - 0.2, -15),
        ('pop', C['a7'] + 0.7, -13), ('pop', C['a8'] + 0.3, -13), ('pop', C['b1'] + 0.3, -15), ('pop', t_yel, -13), ('pop', t_grn, -13),
        ('pop', C['b4'] + 0.3, -15), ('pop', C['c1'] + 0.2, -15), ('pop', C['c1'] + 0.8, -13), ('pop', S('l13') + 0.6, -14), ('pop', C['c3'] + 0.3, -14),
        ('sparkle', C['c6'] + 0.1, -14), ('pop', C['c8'] + 0.1, -14), ('pop', C['c9'] + 0.4, -14), ('pop', C['c9'] + 2.5, -15),
        ('pop', C['d1'] + 0.4, -14), ('pop', C['d2'] + 0.4, -14), ('pop', C['d2'] + 2.4, -15), ('pop', C['ds'] + 0.5, -14), ('pop', C['ds'] + 2.0, -15),
        ('pop', C['d3'] + 0.3, -14), ('sparkle', C['d8'] + 0.3, -11)]
cues += [('card_pop', t_, -12) for t_ in SIGN_T]
os.makedirs('aud', exist_ok=True)
subprocess.run(['python3', '../cubby/aes/music.py', str(END_T + 0.5), 'aud/music.wav'], check=True)
ai = len([x for x in ins if x == '-i'])
ins += ['-i', VO, '-i', 'aud/music.wav']
fc.append(f"[{ai}:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=80,equalizer=f=220:t=q:w=1:g=2,equalizer=f=6500:t=q:w=1.5:g=-2,"
          f"acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120,adelay=0|0,asplit[vo1][vo2]")
fc.append(f"[{ai + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=-17dB,atrim=0:{END_T}[mb];[mb][vo2]sidechaincompress=threshold=0.04:ratio=5:attack=30:release=500[bed]")
labels = ['[vo1]', '[bed]']
for j, (c, t0, g) in enumerate(cues):
    ins += ['-i', SFX + c + '.wav']; d = int(t0 * 1000)
    fc.append(f"[{ai + 2 + j}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={g}dB,adelay={d}|{d}[s{j}]"); labels.append(f'[s{j}]')
fc.append(''.join(labels) + f"amix=inputs={len(labels)}:duration=longest:normalize=0,loudnorm=I=-15:TP=-1.5:LRA=8,aresample=48000,apad,atrim=0:{END_T},afade=t=out:st={END_T - 1.2}:d=1.2[a]")
subprocess.run(['ffmpeg', '-v', 'error', '-y'] + ins + ['-filter_complex', ';'.join(fc), '-map', f'[{prev}]', '-map', '[a]', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium',
                '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', str(END_T), 'mountain_oasis_checkin_v2.mp4'], check=True)
print('done', END_T)
