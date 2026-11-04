# Cubby "Day in the life of a Cape Town suitcase" - text-only trend reel, cut on a 105 BPM bar grid.
import os, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter
os.chdir(os.path.dirname(os.path.abspath(__file__)))
FPS = 30; W, H = 1080, 1920; BAR = 4 * 60 / 105
SRC = '../src/'; G = '../g/'; SFX = '../../sfx/'
F8 = '../../fonts/inter-800.ttf'; F7 = '../../fonts/inter-700.ttf'
RED, YEL = (245, 51, 63), (255, 214, 10)
os.makedirs('gfx', exist_ok=True); os.makedirs('seg', exist_ok=True)
# (bars, source, src start, timestamp, caption, extra)
SEGS = [
    (1, 'IMG_9928.MOV', 1.5, None, None, 'hook'),
    (1, 'IMG_9930.MOV', 0.0, '10:00', 'my human checked out.\nour flight is at 21:00.', ''),
    (1, '127a72f5-1212-4d84-845b-1beb71301bfe.MP4', 1.0, '10:30', 'the prom.\napparently i’m\nthe rescue dog now.', ''),
    (1, 'IMG_0691.MOV', 0.0, '11:15', '“quick” lion’s head hike.\ni have wheels, not legs.', ''),
    (1, 'IMG_9273.MOV', 5.6, '12:30', 'wine farm.\n“just a quick tasting.”', ''),
    (1, 'IMG_9274.MOV', 13.0, '15:45', 'it was not quick.', 'scratch'),
    (1, 'IMG_9926.MOV', 0.6, '16:00', 'bo-kaap cobblestones.\nmy wheels are filing\na complaint.', ''),
    (1, 'IMG_9927.2.MOV', 0.0, '16:20', 'i’ve done more steps\nthan you this year.', ''),
    (2, 'CAFE', 0.0, '16:40', 'spotted my cousins\nthrough a café window.', 'cafe'),
    (1, 'IMG_9934.MOV', 4.9, '17:00', 'then my human found this.', 'sparkle'),
    (1, 'APP', 0.0, '17:01', 'cubby: a trusted local\nspot to store me.\ntap, book, done.', 'app'),
    (1, 'IMG_9941.MOV', 0.3, '17:15', 'dropped at a local\nguest house.\nfinally, some peace.', 'lock'),
    (1, 'IMG_9943.MOV', 1.6, '17:16', 'my human: hands-free.\nfirst time all day.', ''),
    (1.5, 'END', 0.0, None, '10/10 day.\nwould get stored again.', 'end'),
]
REVEAL_BAR = sum(s[0] for s in SEGS[:10])   # music riser lands on the app reveal

def lines_box(text, font, size, fg=(0, 0, 0), bg=(255, 255, 255), pad=(26, 12), radius=18, maxw=1060):
    f = ImageFont.truetype(font, size); lines = []
    for para in text.split('\n'):   # wrap anything wider than the safe width
        cur = ''
        for w_ in para.split(' '):
            trial = (cur + ' ' + w_).strip()
            if cur and f.getlength(trial) > maxw - 2 * pad[0] - 40: lines.append(cur); cur = w_
            else: cur = trial
        lines.append(cur)
    sizes = [f.getbbox(l) for l in lines]; lh = int(size * 1.32)
    bw = max(b[2] - b[0] for b in sizes) + 2 * pad[0] + 20; bh = lh * len(lines) + 2 * pad[1] + 20
    im = Image.new('RGBA', (bw, bh), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for i, (l, b) in enumerate(zip(lines, sizes)):
        w = b[2] - b[0]; x0 = (bw - w) / 2 - pad[0]; y0 = 10 + i * lh
        d.rounded_rectangle((x0, y0, x0 + w + 2 * pad[0], y0 + lh + 2 * pad[1] - 4), radius=radius, fill=bg + (255,))
    for i, (l, b) in enumerate(zip(lines, sizes)):
        w = b[2] - b[0]; d.text(((bw - w) / 2 - b[0], 10 + i * lh + pad[1] + (lh - size) / 2 - b[1] * 0.35), l, font=f, fill=fg)
    sh = im.split()[3].filter(ImageFilter.GaussianBlur(10)).point(lambda a: a * 0.35)
    out = Image.new('RGBA', (bw + 30, bh + 30), (0, 0, 0, 0)); out.paste((0, 0, 0, 255), (6, 12), sh.resize(im.size)); out.alpha_composite(im, (0, 0))
    return out
def chip(t, inv=False):
    f = ImageFont.truetype(F8, 74); b = f.getbbox(t); w, h = b[2] - b[0] + 72, 116
    im = Image.new('RGBA', (w + 20, h + 24), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((4, 10, w + 4, h + 10), radius=52, fill=(0, 0, 0, 70))
    d.rounded_rectangle((0, 4, w, h + 4), radius=52, fill=(255, 255, 255, 255) if inv else RED + (255,))
    d.text(((w - (b[2] - b[0])) / 2 - b[0], 4 + (h - (b[3] - b[1])) / 2 - b[1]), t, font=f, fill=RED if inv else 'white'); return im
def sticker(text):
    im = lines_box(text, F7, 50, fg=(0, 0, 0), bg=YEL, pad=(22, 10), radius=14)
    return im.rotate(-4, resample=Image.BICUBIC, expand=True)

POP = "if(lt(T\\,0.16)\\,0.3+0.95*T/0.16\\,if(lt(T\\,0.28)\\,1.25-0.25*(T-0.16)/0.12\\,1))"
def popov(prev, k, t0, cx, cy, wob=True):
    if t0 < 0:   # static, visible from the first frame
        return f"[{k}:v]format=rgba[o{k}];[{prev}][o{k}]overlay=x={cx}-w/2:y={cy}-h/2[v{k}]"
    S = POP.replace('T', 't'); rot = ''
    return (f"[{k}:v]format=rgba,{rot}scale=w='trunc(iw*{S}/2)*2':h='trunc(ih*{S}/2)*2':eval=frame,setpts=PTS+{t0}/TB[o{k}];"
            f"[{prev}][o{k}]overlay=x='{cx}-w/2':y='{cy}-h/2':eval=frame:enable='gte(t,{t0})'[v{k}]")

t = 0.0; sfx = []; segfiles = []
for i, (bars, src, ss, ts, cap, ex) in enumerate(SEGS):
    a, b = t, t + bars * BAR; n = round(b * FPS) - round(a * FPS); D = n / FPS; t = b
    out = f'seg/{i:02d}.mp4'; segfiles.append(out)
    zp = f"zoompan=z='1+0.07*max(0\\,1-on/8)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s={W}x{H}:fps={FPS}"   # punch-in on the cut
    if src == 'APP':
        PW, PH = 520, 1127
        Image.new('L', (PW, PH), 0).save('gfx/_m.png'); ImageDraw.Draw(m := Image.new('L', (PW, PH), 0)).rounded_rectangle((0, 0, PW - 1, PH - 1), radius=54, fill=255); m.save('gfx/pmask.png')
        Image.open(G + 'phone_frame.png').resize((PW + 34, PH + 34), Image.LANCZOS).save('gfx/pframe.png')
        inputs = ['-f', 'lavfi', '-i', f'color=c=0xF5333F:s={W}x{H}:r={FPS}:d={D + 0.2}', '-ss', '0', '-i', SRC + 'ScreenRecording_10-13-2026.1-42-58.PM_1.MP4',
                  '-i', 'gfx/pmask.png', '-i', 'gfx/pframe.png']
        fc = [f"[1:v]setpts=0.5*PTS,fps={FPS},scale={PW}:{PH},setsar=1,format=rgba[r];[2:v]format=gray[m];[r][m]alphamerge[rm]",
              f"[0:v][rm]overlay=x={(W - PW) // 2}:y=640[p0];[p0][3:v]overlay=x={(W - PW) // 2 - 17}:y=623[base]"]
        cy_chip, cy_cap = 250, 390
    elif src == 'END':
        inputs = ['-f', 'lavfi', '-i', f'color=c=0xF5333F:s={W}x{H}:r={FPS}:d={D + 0.2}', '-loop', '1', '-framerate', str(FPS), '-t', f'{D + 0.2}', '-i', G + 'endcard.png']
        fc = [f"[0:v][1:v]overlay=0:0,setsar=1,{zp}[base]"]; cy_cap = 300
    else:
        inp = SRC + src if src != 'CAFE' else '../new/clip.mp4'
        vf = f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},setsar=1,fps={FPS},tpad=stop_mode=clone:stop_duration=10"
        if src == 'CAFE':   # slow-mo, gentle push-in, a touch of sharpening for the low-res phone clip
            vf = f"setpts=PTS/0.75,{vf},unsharp=5:5:0.6,zoompan=z='1+0.10*on/{n}':x='iw/2-iw/zoom/2':y='ih*0.55-ih/zoom*0.55':d=1:s={W}x{H}:fps={FPS}"
        else: vf += ',' + zp
        inputs = ['-ss', str(ss), '-i', inp]; fc = [f"[0:v]{vf}[base]"]; cy_chip, cy_cap = 560, 700
    prev = 'base'; k = len([x for x in inputs if x == '-i'])
    ov = []
    if ex == 'hook':
        lines_box('a day in the life of\na cape town suitcase', F8, 84, pad=(30, 14), radius=22).save(f'gfx/{i:02d}_a.png')
        sticker('spoiler: at some point\ni become a hat').save(f'gfx/{i:02d}_b.png')
        ov = [(f'gfx/{i:02d}_a.png', -1, 540, 520, False), (f'gfx/{i:02d}_b.png', 0.45, 560, 790, True)]
    elif ex == 'end':
        lines_box(cap, F8, 70, pad=(30, 14), radius=22).save(f'gfx/{i:02d}_a.png'); ov = [(f'gfx/{i:02d}_a.png', 0.15, 540, cy_cap, True)]
    else:
        chip(ts, inv=(src == 'APP')).save(f'gfx/{i:02d}_t.png'); lines_box(cap, F7, 62).save(f'gfx/{i:02d}_c.png')
        h_cap = Image.open(f'gfx/{i:02d}_c.png').size[1]
        ov = [(f'gfx/{i:02d}_t.png', 0.04, 540, cy_chip, False), (f'gfx/{i:02d}_c.png', 0.16, 540, cy_chip + 66 + h_cap // 2, True)]
        if ex == 'cafe':
            sticker('they’re not okay.').save(f'gfx/{i:02d}_s.png'); ov.append((f'gfx/{i:02d}_s.png', BAR + 0.05, 600, cy_chip + 130 + h_cap, True))
        if ex == 'lock':
            ov.append(('../g/st_secure.png', BAR * 0.5, 540, 1400, False))
    for f_, t0, cx, cy, wob in ov:
        inputs += ['-loop', '1', '-framerate', str(FPS), '-t', f'{D + 0.2}', '-i', f_]
        fc.append(popov(prev, k, t0, cx, cy, wob)); prev = f'v{k}'; k += 1
        sfx.append(('pop', a + max(0, t0), -8 if wob else -11)) if t0 >= 0 else None
    if ex == 'scratch': sfx.append(('record_scratch', a, -6))
    if ex == 'sparkle': sfx.append(('sparkle', a + 0.1, -7))
    if ex == 'app': sfx += [('whoosh', a - 0.12, -8), ('card_pop', a + 0.05, -8)]
    if ex == 'lock': sfx.append(('lock_click', a + BAR * 0.5, -5))
    if ex == 'end': sfx.append(('sparkle', a + 0.1, -8))
    subprocess.run(['ffmpeg', '-v', 'error', '-y'] + inputs + ['-filter_complex', ';'.join(fc), '-map', f'[{prev}]', '-frames:v', str(n), '-an',
                    '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-r', str(FPS), out], check=True)
    print(i, src, f'{a:.2f}-{b:.2f}')
TOTAL = round(t * FPS) / FPS
open('seg/list.txt', 'w').write(''.join(f"file '{os.path.basename(p)}'\n" for p in segfiles))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'seg/list.txt', '-c', 'copy', 'base.mp4'], check=True)
# audio: original beat + SFX (and an SFX-only version for adding a trending sound in-app)
bars_total = sum(s[0] for s in SEGS)
subprocess.run(['python3', 'music.py', str(bars_total), 'music.wav', str(int(REVEAL_BAR))], check=True)
def mix(with_music, outname):
    ins = ['-i', 'base.mp4']; fc = []; labels = []; k = 1
    if with_music:
        ins += ['-i', 'music.wav']; fc.append(f"[1:a]aformat=sample_rates=48000:channel_layouts=stereo,lowpass=f=11000,volume=-3dB[m]"); labels.append('[m]'); k = 2
    for j, (c, t0, g) in enumerate(sfx):
        ins += ['-i', SFX + c + '.wav']; d = max(0, int(t0 * 1000))
        fc.append(f"[{k}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={g}dB,adelay={d}|{d}[x{j}]"); labels.append(f'[x{j}]'); k += 1
    fc.append(''.join(labels) + f"amix=inputs={len(labels)}:duration=longest:normalize=0,{'loudnorm=I=-14:TP=-1.5:LRA=9,aresample=48000,' if with_music else 'volume=4dB,'}alimiter=limit=0.8:level=false,apad,atrim=0:{TOTAL},afade=t=out:st={TOTAL - 0.8}:d=0.8[a]")
    subprocess.run(['ffmpeg', '-v', 'error', '-y'] + ins + ['-filter_complex', ';'.join(fc), '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-crf', '20',
                    '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', str(TOTAL), outname], check=True)
mix(True, 'suitcase_diary.mp4'); mix(False, 'suitcase_diary_no_music.mp4')
print('done', TOTAL, 'reveal bar', REVEAL_BAR)
