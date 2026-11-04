# Mountain Oasis downstairs hot tub guide (new footage): tester style + house walkthrough + sunset breathers.
import json, os, subprocess
os.chdir(os.path.dirname(os.path.abspath(__file__)))
FPS = 30; W, H = 1080, 1920; F = 0.22   # crossfade length
VO = os.environ.get('VO', 'vo/vo_raw.wav'); TIM = os.environ.get('TIM', 'vo/timing.json')
tm = json.load(open(TIM)); L = {l['id']: l for l in tm['lines']}
S = lambda i: L[i]['s']; E = lambda i: L[i]['e']
def at(i, frac): return round(S(i) + (E(i) - S(i)) * frac, 3)
r30 = lambda x: round(x * FPS) / FPS
RAMP = json.load(open('ramp.json')); RD = sum(round((b - a) / s * FPS) for a, b, s, _ in RAMP) / FPS
END_T = r30(E('t27') + 3.8)
C = dict(w0=S('t05'), bl=S('t06') - 0.1, lv=S('t07') - 0.1, fi=S('t08'), bf=S('t09'), st=S('t10'), hr=S('t11'), hr2=S('t12'),
         n0=S('t13'), n3=S('t16'), cr=S('t22') - 0.4, en=S('t27') - 0.2)
C = {k: r30(v) for k, v in C.items()}
CR = dict(c2=r30(C['cr'] + 8.0))
def sp(clip_len, a_, b_, ss=0.0): return round((clip_len - ss) / (b_ - a_), 3)
SEG = [
    (0, C['w0'], 'clip', dict(f='0055', ss=0.0, speed=sp(2.75, 0, C['w0']))),
    (C['w0'], C['bl'], 'clip', dict(f='1237.2', ss=0.0, speed=sp(2.8, C['w0'], C['bl']))),
    (C['bl'], C['lv'], 'clip', dict(f='1239', ss=3.5, speed=sp(8.8, C['bl'], C['lv'], 3.5))),
    (C['lv'], C['fi'], 'clip', dict(f='1239', ss=8.8, speed=sp(10.8, C['lv'], C['fi'], 8.8))),
    (C['fi'], C['bf'], 'clip', dict(f='1238', ss=0.0, speed=sp(5.0, C['fi'], C['bf']))),
    (C['bf'], C['st'], 'clip', dict(f='1238', ss=5.0, speed=sp(8.8, C['bf'], C['st'], 5.0))),
    (C['st'], C['hr'], 'clip', dict(f='1239', ss=10.8, speed=sp(13.4, C['st'], C['hr'], 10.8))),
    (C['hr'], C['hr2'], 'clip', dict(f='0056', ss=0.0, speed=sp(2.45, C['hr'], C['hr2']))),
    (C['hr2'], C['n0'], 'clip', dict(f='0057', ss=0.0, speed=sp(2.35, C['hr2'], C['n0']))),
    (C['n0'], C['n3'], 'clip', dict(f='0059', ss=0.0, speed=sp(8.3, C['n0'], C['n3']))),
    (C['n3'], C['cr'], 'clip', dict(f='0060', ss=0.0, speed=sp(10.4, C['n3'], C['cr']))),
    (C['cr'], CR['c2'], 'clip', dict(f='0061', ss=3.0, speed=sp(8.4, C['cr'], CR['c2'], 3.0))),
    (CR['c2'], C['en'], 'clip', dict(f='0058', ss=0.0, speed=sp(2.5, CR['c2'], C['en']))),
    (C['en'], END_T, 'clip', dict(f='0055', ss=0.4, speed=0.3, blur=True)),
]
GRADE = GRADE = "eq=contrast=1.04:saturation=1.08:gamma=1.02,colorbalance=rs=0.03:bs=-0.02:rm=0.02,vignette=PI/6"
os.makedirs('seg', exist_ok=True)
files = []
FJ = {}   # next-segment index -> longer crossfade (raw footage gaps)
for _i, _sg in enumerate(SEG):
    if _sg[2] == 'clip' and _sg[3].get('f') in ('1235', '1236') and SEG[_i - 1][3].get('f') in ('1234', '1235'): FJ[_i] = 0.7
for i, (a, b, kind, A) in (enumerate(SEG) if not os.environ.get('SKIP_BASE') else []):
    D = (b - a) + (FJ.get(i + 1, F) if i < len(SEG) - 1 else 0); n = round(D * FPS); out = f'seg/{i:02d}.mp4'; files.append((out, a))
    src = A.get('path') or f"src/IMG_{A['f']}.MOV"
    _st = f"stab2/{os.path.basename(src).rsplit('.', 1)[0]}.mp4"
    if os.path.exists(_st): src = _st; sp = A.get('speed', 1.0)
    fill = f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},setsar=1"
    drift = f"zoompan=z='1+0.035*on/{n}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s={W}x{H}:fps={FPS}"
    blur = ',gblur=sigma=14,eq=brightness=-0.05' if A.get('blur') else ''
    if kind == 'clip':
        vf = f"setpts=PTS/{sp},{fill},fps={FPS},tpad=stop_mode=clone:stop_duration=20,{GRADE}{blur}"   # no zoompan drift: it steps in whole pixels and adds jitter
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
            psrc = src.replace('stab2/', 'src/').replace('.mp4', '.MOV') if _ else src   # stabiliser crop cuts these edge-of-frame signs
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(pa), '-i', psrc, '-vf', (f"tmix=frames={min(8, int(ps))}," if ps > 1.5 else '') + f"setpts=PTS/{ps},{fill},fps={FPS},tpad=stop_mode=clone:stop_duration=5,{GRADE}",
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
    fc.append(f"[{prev}][{i}:v]xfade=transition=fade:duration={FJ.get(i, F)}:offset={files[i][1]:.3f}[x{i}]"); prev = f'x{i}'
if not os.environ.get('SKIP_BASE') and not os.environ.get('DUMP_RINGS'): subprocess.run(['ffmpeg', '-v', 'error', '-y'] + ins + ['-filter_complex', ';'.join(fc), '-map', f'[{prev}]', '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', 'base.mp4'], check=True)

if os.environ.get('BASE_ONLY'): raise SystemExit
# ---------------- overlays ----------------
POP = "if(lt(T\\,0.16)\\,0.3+0.95*T/0.16\\,if(lt(T\\,0.28)\\,1.25-0.25*(T-0.16)/0.12\\,1))"
OV = []; TOP = 230; CH = 420
OV += [('g/title.png', 0.1, C['w0'] + 0.1, 540, 820, 'pop'), ('g/chip_tubguide.png', 0.7, C['w0'] + 0.1, 540, 1130, 'pop'),
       ('g/chip_downstairs.png', 1.0, C['w0'] + 0.1, 540, 1240, 'pop'),
       ('g/sparkle.png', 0.5, C['w0'], 240, 640, 'twinkle'), ('g/sparkle_s.png', 0.8, C['w0'], 860, 700, 'twinkle'), ('g/sparkle_y.png', 1.0, C['w0'], 820, 1020, 'twinkle')]
OV += [('g/tstep1.png', C['w0'] + 0.2, C['fi'], 540, TOP, 'pop'), ('g/chip_inlet.png', C['w0'] + 0.4, C['bl'], 540, CH, 'pop'),
       ('g/chip_blanket.png', C['bl'] + 0.3, C['lv'], 540, CH, 'pop'), ('g/chip_level.png', C['lv'] + 0.3, C['fi'], 540, CH, 'pop')]
OV += [('g/tstep2.png', C['fi'] + 0.2, C['st'], 540, TOP, 'pop'), ('g/chip_coil.png', C['fi'] + 0.3, C['bf'], 540, CH, 'pop'),
       ('g/chip_nobonfire.png', C['bf'] + 0.3, C['st'], 540, CH, 'pop')]
OV += [('g/tstep3.png', C['st'] + 0.2, C['n0'], 540, TOP, 'pop'), ('g/chip_handstir.png', C['st'] + 0.3, C['hr'], 540, CH, 'pop'),
       ('g/chip_temp.png', C['hr'] + 0.3, C['hr2'], 540, CH, 'pop'), ('g/chip_keep.png', C['hr2'] + 0.3, C['n0'], 540, CH, 'pop')]
OV += [('g/tstep4.png', C['n0'] + 0.2, C['cr'], 540, TOP, 'pop'), ('g/chip_d1.png', S('t14') + 0.3, S('t15'), 540, CH, 'pop'),
       ('g/chip_d2.png', S('t15') + 0.3, S('t16'), 540, CH, 'pop'), ('g/chip_d3.png', S('t16') + 0.3, S('t17'), 540, CH, 'pop'),
       ('g/chip_d4.png', S('t17') + 0.3, S('t18'), 540, CH, 'pop'), ('g/chip_d5.png', S('t18') + 0.3, C['cr'], 540, CH, 'pop')]
# film-credits scroll for the safety & liability section
import credits
CR_T0 = C['cr']; CR_T1 = r30(S('t27') + 0.4); V = 72
mids = {k: (L[k]['s'] + L[k]['e']) / 2 for k in ('t22', 't23', 't24')}
Y0 = 960 - 110 + (mids['t22'] - CR_T0) * V
credits.make('g/credits.png', {k: 960 - Y0 + (m - CR_T0) * V for k, m in mids.items()})
from PIL import Image as _I
HC = _I.open('g/credits.png').height
OV += [('g/credits_shade.png', CR_T0, CR_T1, 540, 960, 'fadeio'),
       ('g/credits.png', CR_T0, CR_T1, 540, f"{Y0}+{HC / 2}-(t-{CR_T0})*{V}", 'fadeio')]
OV += [('g/heart.png', C['en'] + 0.6, END_T, 540, 470, 'float'), ('g/end_tub.png', C['en'] + 0.25, END_T, 540, 860, 'pop'),
       ('g/sparkle.png', C['en'] + 0.5, END_T, 230, 820, 'twinkle'), ('g/sparkle_y.png', C['en'] + 0.8, END_T, 860, 760, 'twinkle'),
       ('g/sparkle_s.png', C['en'] + 1.0, END_T, 820, 1180, 'twinkle')]
import gfx
for l in tm['lines']:
    if l['id'] in ('t01', 't22', 't23', 't24', 't27'): continue
    p = f"g/sub_{l['id']}.png"; gfx.caption(p, l['text'].replace("'", "’"))
    nxt = [m['s'] for m in tm['lines'] if m['s'] > l['s']]; t1 = min(l['e'] + 0.45, nxt[0] - 0.02) if nxt else min(l['e'] + 0.6, C['d8'])
    if l['id'] == 't18': t1 = min(t1, C['cr'])
    OV.append((p, l['s'], t1, 540, 1610, 'fade'))
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
    if an == 'fadeio': pre = f'format=rgba,fade=in:st=0:d=0.8:alpha=1,fade=out:st={D - 0.8:.2f}:d=0.8:alpha=1'
    scale = f",scale=w='trunc(iw*{sc}/2)*2':h='trunc(ih*{sc}/2)*2':eval=frame" if sc != '1' else ''
    fc.append(f"[{k}:v]{pre}{scale},setpts=PTS+{t0}/TB[o{k}];[{prev}][o{k}]overlay=x='({cx})-w/2+{xo}':y='({cy})-h/2+{yo}':eval=frame:enable='between(t,{t0},{t1 - 0.001})'[v{k}]")
    prev = f'v{k}'; k += 1
# ---------------- audio ----------------
SFX = '../sfx/'
SIGN_T = []
cues = [('sparkle', 0.3, -12), ('pop', C['w0'] + 0.2, -15), ('pop', C['w0'] + 0.4, -14), ('pop', C['bl'] + 0.3, -14), ('pop', C['lv'] + 0.3, -14),
        ('pop', C['fi'] + 0.2, -15), ('pop', C['fi'] + 0.3, -14), ('pop', C['bf'] + 0.3, -14), ('pop', C['st'] + 0.2, -15), ('pop', C['st'] + 0.3, -14),
        ('pop', C['hr'] + 0.3, -14), ('pop', C['hr2'] + 0.3, -14), ('pop', C['n0'] + 0.2, -15)] + [('pop', S(k) + 0.3, -15) for k in ('t14', 't15', 't16', 't17', 't18')] + [('sparkle', C['en'] + 0.3, -11)]
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
                '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', str(END_T), 'mountain_oasis_hot_tub_downstairs.mp4'], check=True)
print('done', END_T)
