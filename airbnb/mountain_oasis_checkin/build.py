# Mountain Oasis self check-in guide: 9:16, voice-anchored timeline, soft crossfades, cute tutorial graphics.
import json, os, subprocess
os.chdir(os.path.dirname(os.path.abspath(__file__)))
FPS = 30; W, H = 1080, 1920; F = 0.22   # crossfade length
VO = os.environ.get('VO', 'vo/vo_raw.wav'); TIM = os.environ.get('TIM', 'vo/timing.json')
tm = json.load(open(TIM)); L = {l['id']: l for l in tm['lines']}
S = lambda i: L[i]['s']; E = lambda i: L[i]['e']
def at(i, frac): return round(S(i) + (E(i) - S(i)) * frac, 3)   # a moment inside a line
END_T = round(E('l14') + 2.3, 2)
r30 = lambda x: round(x * FPS) / FPS
# cut points (edit times) anchored to the voice
C = dict(s1=S('l02'), s2=S('l03'), s2b=S('l03') + 4.0, s3=S('l04'), s4=S('l06'), s5=S('l08'), s6=S('l09'), s7=S('l09') + 2.4,
         s8=S('l11'), s9=S('l12'), s9b=S('l12') + 1.5, s9c=S('l12') + 2.7, s10=S('l13'), s10b=S('l13') + 2.5, s10c=S('l13') + 5.0)
C = {k: r30(v) for k, v in C.items()}
# (start, end, kind, args)
SEG = [
    (0, C['s1'], 'clip', dict(f='1095', ss=0.0)),
    (C['s1'], C['s2'], 'clip', dict(f='1094', ss=0.0, speed=0.85)),
    (C['s2'], C['s2b'], 'card', dict(f='1103', ss=0.0, speed=0.25)),
    (C['s2b'], C['s3'], 'clip', dict(f='1102', ss=0.2)),
    (C['s3'], C['s4'], 'freeze_end', dict(f='1101', ss=7.0 - (S('l05') - C['s3']), until=7.0)),
    (C['s4'], C['s5'], 'clip', dict(f='1107', ss=0.0)),
    (C['s5'], C['s6'], 'clip', dict(f='1111', ss=0.0, speed=0.55, blur=True)),
    (C['s6'], C['s7'], 'clip', dict(f='1105', ss=0.4)),
    (C['s7'], C['s8'], 'still', dict(f='1106', ss=0.3, z=0.12, px=640, py=1100)),
    (C['s8'], C['s9'], 'ramp', dict(f='1108')),
    (C['s9'], C['s9b'], 'clip', dict(f='1112', ss=1.5)),
    (C['s9b'], C['s9c'], 'clip', dict(f='1109', ss=0.3)),
    (C['s9c'], C['s10'], 'clip', dict(f='1110', ss=0.6)),
    (C['s10'], C['s10b'], 'clip', dict(f='1110', ss=6.0)),
    (C['s10b'], C['s10c'], 'clip', dict(f='1097', ss=0.0)),
    (C['s10c'], END_T, 'clip', dict(f='1094', ss=0.6, speed=0.8, blur=True)),
]
GRADE = "eq=contrast=1.04:saturation=1.08:gamma=1.02,colorbalance=rs=0.03:bs=-0.02:rm=0.02,vignette=PI/6"
os.makedirs('seg', exist_ok=True)
files = []
for i, (a, b, kind, A) in enumerate(SEG):
    D = (b - a) + (F if i < len(SEG) - 1 else 0); n = round(D * FPS); out = f'seg/{i:02d}.mp4'; files.append((out, a))
    src = f"src/IMG_{A['f']}.MOV"; sp = A.get('speed', 1.0)
    fill = f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},setsar=1"
    drift = f"zoompan=z='1+0.035*on/{n}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s={W}x{H}:fps={FPS}"
    blur = ',gblur=sigma=14,eq=brightness=-0.05' if A.get('blur') else ''
    if kind == 'clip':
        vf = f"setpts=PTS/{sp},{fill},fps={FPS},tpad=stop_mode=clone:stop_duration=20,{drift},{GRADE}{blur}"
        cmd = ['-ss', str(A['ss']), '-i', src, '-vf', vf]
    elif kind == 'freeze_end':
        vf = f"{fill},fps={FPS},trim=end={A['until'] - A['ss']:.3f},tpad=stop_mode=clone:stop_duration=20,{GRADE}"
        cmd = ['-ss', str(A['ss']), '-i', src, '-vf', vf]
    elif kind == 'still':
        z, px, py = A['z'], A['px'], A['py']
        vf = (f"{fill},loop=loop=-1:size=1,fps={FPS},zoompan=z='1+{z}*min(1\\,on/{n})':x='{px}-{px}/zoom':y='{py}-{py}/zoom':d=1:s={W}x{H}:fps={FPS},{GRADE}")
        cmd = ['-ss', str(A['ss']), '-i', src, '-frames:v', '1', '-vf', vf]; cmd = ['-ss', str(A['ss']), '-i', src, '-vf', vf]
    elif kind == 'ramp':
        pieces = json.load(open('ramp.json')); parts = []; used = 0
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
subprocess.run(['ffmpeg', '-v', 'error', '-y'] + ins + ['-filter_complex', ';'.join(fc), '-map', f'[{prev}]', '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', 'base.mp4'], check=True)

# ---------------- overlays ----------------
# (png, t0, t1, cx, cy, anim) ; cx/cy may be ffmpeg expressions in t
POP = "if(lt(T\\,0.16)\\,0.3+0.95*T/0.16\\,if(lt(T\\,0.28)\\,1.25-0.25*(T-0.16)/0.12\\,1))"
OV = []
TOP = 230
OV += [('g/title.png', 0.1, C['s1'] + 0.1, 540, 820, 'pop'), ('g/subtitle_guide.png', 0.7, C['s1'] + 0.1, 540, 1130, 'pop'),
       ('g/sparkle.png', 0.5, C['s1'], 240, 640, 'twinkle'), ('g/sparkle_s.png', 0.8, C['s1'], 860, 700, 'twinkle'), ('g/sparkle_y.png', 1.0, C['s1'], 820, 1020, 'twinkle')]
ov_t = [C['s1'] + 0.3 + k * 0.55 for k in range(4)]
for k in range(4): OV.append((f'g/overview{k + 1}.png', ov_t[k], ov_t[k + 1] if k < 3 else C['s2'], 540, 1060, 'pop' if k == 0 else 'static'))
OV += [('g/step1.png', C['s2'] + 0.2, C['s3'], 540, TOP, 'pop'), ('g/parking.png', at('l03', 0.55), C['s2b'], 880, 700, 'pop'),
       ('g/chip_signs.png', at('l03', 0.6), C['s2b'], 540, 1420, 'pop')]
OV += [('g/step2.png', C['s3'] + 0.2, C['s5'], 540, TOP, 'pop'),
       ('g/ring.png', S('l05'), C['s4'], 555, 900, 'pulse'), ('g/arrow_left.png', S('l05') + 0.15, C['s4'], 790, 900, 'bobx'),
       ('g/chip_top.png', S('l05') + 0.3, C['s4'], 540, 640, 'pop'),
       ('g/chip_code.png', S('l06') + 0.3, S('l07'), 540, 640, 'pop'),
       ('g/chip_sides.png', S('l07') + 0.1, C['s5'], 540, 640, 'pop'),
       ('g/arrow_right.png', S('l07') + 0.2, C['s5'] - 0.4, 285, 1110, 'bobx'), ('g/arrow_left.png', S('l07') + 0.2, C['s5'] - 0.4, 945, 1110, 'bobx_r'),
       ('g/sparkle_y.png', E('l07') - 0.2, C['s5'], 640, 1000, 'twinkle')]
OV += [('g/step3.png', C['s5'] + 0.2, C['s9'], 540, TOP, 'pop'), ('g/options.png', C['s5'] + 0.5, C['s6'] + 0.05, 540, 1020, 'pop')]
zexpr = f"(1+0.12*min(1\\,(t-{C['s7']})/{C['s8'] - C['s7']}))"
yx, yy = f"640+59*{zexpr}", f"1100-110*{zexpr}"; gx, gy = f"640+20*{zexpr}", f"1100+115*{zexpr}"
t_yel = max(C['s7'] + 0.1, at('l09', 0.66)); t_grn = at('l10', 0.6)
OV += [('g/ring_y.png', t_yel, t_grn, yx, yy, 'pulse'), ('g/chip_yellow.png', t_yel + 0.15, t_grn, 330, 560, 'pop'),
       ('g/ring_g.png', t_grn, C['s8'], gx, gy, 'pulse'), ('g/chip_green.png', t_grn + 0.15, C['s8'], 330, 560, 'pop')]
from PIL import Image as _I
for nm in ('welcome', 'follow', 'moment', 'halfway', 'heading', 'made_it'):
    im = _I.open(f'g/signs/{nm}.png'); im.resize((int(im.width * 0.8), int(im.height * 0.8)), _I.LANCZOS).save(f'g/signs/{nm}_s.png')
SIDE = dict(follow=300, moment=300, halfway=300, heading=780, made_it=300)
tt = C['s8']; SIGN_T = []
for pa, pb, ps, nm in json.load(open('ramp.json')):
    d_ = round((pb - pa) / ps * FPS) / FPS
    if nm:
        OV.append((f'g/signs/{nm}_s.png', tt + 0.08, min(tt + d_ + 0.35, C['s9']), SIDE[nm], 840, 'float'))
        OV.append(('g/sparkle_s.png', tt + 0.2, tt + d_, SIDE[nm] + 190, 520, 'twinkle')); SIGN_T.append(tt + 0.08)
    tt += d_
OV.append(('g/signs/welcome_s.png', C['s6'] + 0.15, C['s7'], 300, 840, 'float')); SIGN_T.append(C['s6'] + 0.15)
OV += [('g/step4.png', C['s9'] + 0.2, C['s10'] + 0.1, 540, TOP, 'pop'),
       ('g/wifi.png', C['s9c'] + 0.1, C['s10'], 760, 980, 'pop'), ('g/chip_wifi.png', C['s9c'] + 0.25, C['s10'], 540, 640, 'pop')]
OV += [('g/heart.png', S('l14') + 0.6, C['s10c'], 820, 640, 'float'), ('g/sparkle_s.png', S('l13') + 0.2, C['s10b'], 270, 700, 'twinkle'),
       ('g/end.png', C['s10c'] + 0.25, END_T, 540, 860, 'pop'), ('g/heart.png', C['s10c'] + 0.6, END_T, 540, 470, 'float'),
       ('g/sparkle.png', C['s10c'] + 0.5, END_T, 230, 820, 'twinkle'), ('g/sparkle_y.png', C['s10c'] + 0.8, END_T, 860, 760, 'twinkle'),
       ('g/sparkle_s.png', C['s10c'] + 1.0, END_T, 820, 1180, 'twinkle')]
# subtitles for every line except the title line
import gfx
for l in tm['lines']:
    if l['id'] in ('l01',): continue
    p = f"g/sub_{l['id']}.png"; gfx.caption(p, l['text'].replace("Here's", "Here’s").replace("you'll", "you’ll").replace("you're", "you’re").replace("That's", "That’s").replace("It's", "It’s"))
    nxt = [m['s'] for m in tm['lines'] if m['s'] > l['s']]; t1 = min(l['e'] + 0.45, nxt[0] - 0.02) if nxt else min(l['e'] + 0.6, C['s10c'])
    if l['id'] == 'l14': t1 = C['s10c']
    OV.append((p, l['s'], t1, 540, 1610, 'fade'))
ins = ['-i', 'base.mp4']; fc = []; prev = '0:v'; k = 1
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
cues = [('sparkle', 0.3, -12), ('card_pop', C['s1'] + 0.3, -14), ('pop', ov_t[1], -16), ('pop', ov_t[2], -16), ('pop', ov_t[3], -16),
        ('pop', C['s2'] + 0.2, -15), ('pop', at('l03', 0.55), -14), ('pop', C['s3'] + 0.2, -15), ('pop', S('l05'), -13),
        ('pop', S('l06') + 0.3, -15), ('pop', S('l07') + 0.1, -15), ('lock_click', E('l07') - 0.3, -9), ('sparkle', E('l07') - 0.2, -15),
        ('card_pop', C['s5'] + 0.5, -14), ('pop', t_yel, -13), ('pop', t_grn, -13), 
        ('pop', C['s9'] + 0.2, -15), ('sparkle', C['s9c'] + 0.1, -14), ('sparkle', C['s10c'] + 0.3, -11)]
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
                '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', str(END_T), 'mountain_oasis_checkin.mp4'], check=True)
print('done', END_T)
