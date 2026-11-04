# Cubby "POV: you're going on holiday to Cape Town but the saxophones keep getting louder"
# Suitcase chaos cut faster and faster over a looped sax that gets louder each pass -> record scratch -> Cubby app -> end card.
import os, subprocess, numpy as np
from scipy.io import wavfile
from PIL import Image, ImageDraw, ImageFont, ImageFilter
os.chdir(os.path.dirname(os.path.abspath(__file__)))
FPS = 30; W, H = 1080, 1920
CS = '../cubby/src/'; NEW = 'src/'
r30 = lambda x: round(x * FPS) / FPS
# (source, start) - ordered so neighbouring shots never share a location
# (source, start, seconds on screen) - close-ups + people dragging suitcases, new airport clips used most
# airport hall / airbridge / Cape Town alternate so neighbouring shots never look alike; every clip used once
CLIPS = [(NEW + 'IMG_1571.mov', 0.0, 2.2), (CS + 'IMG_9926.MOV', 0.6, 1.9), (NEW + 'IMG_1551.mov', 0.3, 2.0), (NEW + 'IMG_1573.mov', 0.3, 2.0),
         (CS + 'IMG_0318.MOV', 0.2, 1.8), (NEW + 'IMG_1548.mov', 0.0, 1.38), (CS + 'IMG_9273.MOV', 5.6, 1.7), (NEW + 'IMG_1550.mov', 0.6, 1.8),
         (NEW + 'IMG_1572.mov', 0.0, 1.26), (CS + 'IMG_9928.MOV', 1.5, 1.6), (NEW + 'IMG_1549.mov', 0.3, 1.6), (CS + '127a72f5-1212-4d84-845b-1beb71301bfe.MP4', 1.0, 1.5),
         (NEW + 'IMG_1552.mov', 0.4, 1.5), (CS + 'IMG_9927.2.MOV', 0.0, 1.4)]
if os.path.exists(NEW + 'IMG_1546.mov'): CLIPS.insert(11, (NEW + 'IMG_1546.mov', 0.0, 1.5))
tot = sum(c[2] for c in CLIPS); CHAOS = 24.0
cuts = [0.0]
for c in CLIPS: cuts.append(r30(cuts[-1] + c[2] * CHAOS / tot))
cuts[-1] = CHAOS
CLIPS = [(c[0], c[1]) for c in CLIPS]
APP0, APP1 = CHAOS, r30(CHAOS + 7.6); DROP1 = r30(APP1 + 1.8); TOTAL = r30(DROP1 + 3.0)
os.makedirs('seg', exist_ok=True); os.makedirs('g', exist_ok=True)
fill = f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},setsar=1"
GRADE = "eq=contrast=1.05:saturation=1.12,vignette=PI/6"
def run(cmd): subprocess.run(['ffmpeg', '-v', 'error', '-y'] + cmd, check=True)
segs = []
for i, ((src, ss), a, b) in enumerate(zip(CLIPS, cuts[:-1], cuts[1:])):
    nfr = round(b * FPS) - round(a * FPS); out = f'seg/{i:02d}.mp4'; segs.append(out)
    z = f"zoompan=z='1.10-0.10*min(1\\,on/5)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s={W}x{H}:fps={FPS}"   # little punch-in on every cut
    run(['-ss', str(ss), '-i', src, '-vf', f"{fill},fps={FPS},tpad=stop_mode=clone:stop_duration=5,{z},{GRADE}", '-frames:v', str(nfr), '-an',
         '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-r', str(FPS), out])
    if 'IMG_0318' in src:   # the two walkers keep their emoji faces
        subprocess.run(['python3', 'emoji2p.py', os.path.abspath(out), os.path.abspath(out) + '.e.mp4'], cwd='../cubby', check=True); os.replace(out + '.e.mp4', out)
# Cubby app: screen recording in a phone on red
RED = (245, 51, 63); PW, PH = 560, 1214
m = Image.new('L', (PW, PH), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, PW - 1, PH - 1), radius=58, fill=255); m.save('g/pmask.png')
Image.open('../cubby/g/phone_frame.png').resize((PW + 36, PH + 36), Image.LANCZOS).save('g/pframe.png')
na = round(APP1 * FPS) - round(APP0 * FPS)
run(['-f', 'lavfi', '-i', f'color=c=0xF5333F:s={W}x{H}:r={FPS}:d={na / FPS + 0.5}', '-i', CS + 'ScreenRecording_10-13-2026.1-42-58.PM_1.MP4', '-i', 'g/pmask.png', '-i', 'g/pframe.png',
     '-filter_complex', f"[1:v]setpts=PTS/2.1,fps={FPS},scale={PW}:{PH},setsar=1,format=rgba[r];[2:v]format=gray[mk];[r][mk]alphamerge[rm];"
                        f"[0:v][rm]overlay=x={(W - PW) // 2}:y=520[p0];[p0][3:v]overlay=x={(W - PW) // 2 - 18}:y=502[v]",
     '-map', '[v]', '-frames:v', str(na), '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', 'seg/app.mp4']); segs.append('seg/app.mp4')
nd = round(DROP1 * FPS) - round(APP1 * FPS)
run(['-ss', '0.7', '-i', CS + 'IMG_9941.MOV', '-vf', f"{fill},fps={FPS},tpad=stop_mode=clone:stop_duration=5,{GRADE}", '-frames:v', str(nd), '-an',
     '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', 'seg/drop.mp4']); segs.append('seg/drop.mp4')
# end card: red, white pin logo (no ring), slogan, mycubby.co.za
bg = Image.new('RGBA', (W, H), RED + (255,)); d = ImageDraw.Draw(bg)
lg = Image.open('../cubby/cubby_logo_transparent.png').convert('RGBA'); px = lg.load(); pin = Image.new('RGBA', lg.size, (0, 0, 0, 0)); pp = pin.load()
for yy in range(lg.height):
    for xx in range(lg.width):
        r_, g_, b_, a_ = px[xx, yy]
        if a_ and min(r_, g_, b_) > 200: pp[xx, yy] = (255, 255, 255, a_)
        elif a_ and r_ > 200 and g_ > 150 and b_ < 120: pp[xx, yy] = (r_, g_, b_, a_)
pin = pin.resize((600, 600), Image.LANCZOS); bg.alpha_composite(pin, ((W - 600) // 2, 330))
F9 = '../fonts/barlow-condensed-latin-900-normal.ttf'; f1 = ImageFont.truetype(F9, 150); f2 = ImageFont.truetype(F9, 64)
for j, (t_, c_) in enumerate([('DOWNLOAD.', (255, 255, 255)), ('STORE.', (255, 255, 255)), ('EXPLORE.', (255, 214, 64))]):
    tw = d.textlength(t_, font=f1); d.text(((W - tw) / 2, 980 + j * 150), t_, font=f1, fill=c_, stroke_width=6, stroke_fill=(120, 10, 20))
t_ = 'mycubby.co.za'; tw = d.textlength(t_, font=f2); d.text(((W - tw) / 2, 1480), t_, font=f2, fill=(255, 255, 255))
bg.convert('RGB').save('g/end.png')
ne = round(TOTAL * FPS) - round(DROP1 * FPS)
run(['-loop', '1', '-framerate', str(FPS), '-i', 'g/end.png', '-vf', f"zoompan=z='1.06-0.06*min(1\\,on/{ne})':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s={W}x{H}:fps={FPS}",
     '-frames:v', str(ne), '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', 'seg/end.mp4']); segs.append('seg/end.mp4')
open('seg/list.txt', 'w').write(''.join(f"file '{os.path.basename(p)}'\n" for p in segs))
run(['-f', 'concat', '-safe', '0', '-i', 'seg/list.txt', '-c', 'copy', 'base.mp4'])
# TikTok-style captions
FB = '../fonts/inter-800.ttf'
def cap(path, text, size=58, maxw=900, box=False):
    f = ImageFont.truetype(FB, size); tmp = ImageDraw.Draw(Image.new('RGB', (1, 1))); lines, cur = [], ''
    for wd in text.split():
        t = (cur + ' ' + wd).strip()
        if cur and tmp.textlength(t, font=f) > maxw: lines.append(cur); cur = wd
        else: cur = t
    lines.append(cur); lh = int(size * 1.25); hh = lh * len(lines) + 40
    im = Image.new('RGBA', (W, hh), (0, 0, 0, 0)); dd = ImageDraw.Draw(im)
    for j, l in enumerate(lines):
        tw = dd.textlength(l, font=f); x = (W - tw) / 2; y = 20 + j * lh
        if box: dd.rounded_rectangle((x - 22, y - 6, x + tw + 22, y + lh + 2), radius=16, fill=(255, 255, 255, 255)); dd.text((x, y), l, font=f, fill=(20, 20, 20))
        else: dd.text((x, y), l, font=f, fill=(255, 255, 255), stroke_width=4, stroke_fill=(0, 0, 0))
    im.save(path)
cap('g/pov.png', "POV: you're going on holiday to Cape Town but the saxophones keep getting louder", 58)
cap('g/fix.png', '…until you find Cubby', 64, box=True)
cap('g/fix2.png', 'book a trusted local spot to store your bags', 48)
cap('g/stored.png', 'suitcase: stored. holiday: started.', 58, box=True)
ins = ['-i', 'base.mp4']; fc = []; prev = '0:v'; k = 1
for png, t0, t1, y in [('g/pov.png', 0.0, CHAOS, 270), ('g/fix.png', APP0 + 0.1, APP1, 230), ('g/fix2.png', APP0 + 1.2, APP1, 380), ('g/stored.png', APP1 + 0.2, DROP1, 330)]:
    ins += ['-loop', '1', '-framerate', str(FPS), '-t', f'{t1 - t0 + 0.1:.2f}', '-i', png]
    fc.append(f"[{k}:v]format=rgba,setpts=PTS+{t0}/TB[o{k}];[{prev}][o{k}]overlay=x=0:y={y}:enable='between(t,{t0},{t1 - 0.001})'[v{k}]"); prev = f'v{k}'; k += 1
# audio: sax loop that gets louder each pass, record scratch, then a calm bed under the app + end card
SR = 48000
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'src/v14044g50000d91tbd7og65njhq2fkng.mp4', '-t', '4.85', '-af', 'highpass=f=160:poles=2,highpass=f=160:poles=2,equalizer=f=700:t=q:w=1:g=4,equalizer=f=1600:t=q:w=1:g=7,equalizer=f=3200:t=q:w=1:g=5,acompressor=threshold=-24dB:ratio=3:attack=5:release=80,loudnorm=I=-16:TP=-2', '-ac', '2', '-ar', str(SR), 'g/sax.wav'], check=True)
_, sx = wavfile.read('g/sax.wav'); sx = sx.astype(np.float32) / 32768
L_ = len(sx); xf = int(0.25 * SR); out = np.zeros((int((CHAOS + 0.4) * SR), 2), np.float32); pos = 0; p = 0
while pos < len(out):
    g = 10 ** ((-9 + 15 * min(1, pos / (CHAOS * SR))) / 20)   # -9 dB -> +6 dB across the chaos
    seg_ = sx.copy(); seg_[:xf] *= np.linspace(0, 1, xf)[:, None] if p else 1; seg_[-xf:] *= np.linspace(1, 0, xf)[:, None]
    e = min(len(out), pos + L_); out[pos:e] += seg_[:e - pos] * g; pos += L_ - xf; p += 1
fo = int(0.06 * SR); cut = int(CHAOS * SR); out[cut - fo:cut] *= np.linspace(1, 0, fo)[:, None]; out[cut:] = 0
wavfile.write('g/saxloop.wav', SR, (np.clip(out, -1, 1) * 32767).astype(np.int16))
subprocess.run(['python3', '../cubby/aes/music.py', str(TOTAL - CHAOS + 0.5), 'g/bed.wav'], check=True)
ins += ['-i', 'g/saxloop.wav', '-i', 'g/bed.wav', '-i', '../sfx/record_scratch.wav', '-i', '../sfx/pop.wav', '-i', '../sfx/sparkle.wav', '-i', '../sfx/lock_click.wav']
a0 = k
fc.append(f"[{a0}:a]aformat=sample_rates=48000:channel_layouts=stereo,alimiter=limit=0.95:level=false[sx]")
fc.append(f"[{a0 + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=-4dB,adelay={int(CHAOS * 1000) + 350}|{int(CHAOS * 1000) + 350}[bd]")
fc.append(f"[{a0 + 2}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=-2dB,adelay={int(CHAOS * 1000) - 150}|{int(CHAOS * 1000) - 150}[sc]")
fc.append(f"[{a0 + 3}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=-8dB,adelay={int((APP0 + 0.1) * 1000)}|{int((APP0 + 0.1) * 1000)}[pp]")
fc.append(f"[{a0 + 5}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=-6dB,adelay={int((APP1 + 0.3) * 1000)}|{int((APP1 + 0.3) * 1000)}[lk]")
fc.append(f"[{a0 + 4}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=-8dB,adelay={int((DROP1 + 0.1) * 1000)}|{int((DROP1 + 0.1) * 1000)}[sp]")
fc.append(f"[sx][bd][sc][pp][lk][sp]amix=inputs=6:duration=longest:normalize=0,loudnorm=I=-12:TP=-1.0:LRA=9,aresample=48000,apad,atrim=0:{TOTAL},afade=t=out:st={TOTAL - 0.8}:d=0.8[a]")
MIXES = [('sax_reel.mp4', True), ('sax_reel_no_sax.mp4', False)]
fc_base = list(fc)
for OUTF, WITH_SAX in MIXES:
  fc = list(fc_base)
  if not WITH_SAX:
    fc[-1] = fc[-1].replace('[sx][bd][sc][pp][lk][sp]amix=inputs=6', '[bd][sc][pp][lk][sp]amix=inputs=5')
    fc = [f + ';[sx]anullsink' if f.endswith('[sx]') else f for f in fc]
  run(ins + ['-filter_complex', ';'.join(fc), '-map', f'[{prev}]', '-map', '[a]', '-c:v', 'libx264', '-crf', '19', '-preset', 'slow', '-pix_fmt', 'yuv420p',
           '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', str(TOTAL), OUTF])
print('done', TOTAL, len(CLIPS), 'clips')
