# Cubby "day in my life (as a cape town suitcase)" - aesthetic vlog-style reel: half-second cuts on a 120 BPM grid,
# warm film grade, butter-yellow serif title with typed subtitle, soft serif time labels. No voiceover.
import os, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter
os.chdir(os.path.dirname(os.path.abspath(__file__)))
FPS = 30; W, H = 1080, 1920; BEAT = 0.5
SRC = '../src/'; SERIF = '../../fonts/instrument-serif-400-normal.ttf'; SANS = '../../fonts/inter-700.ttf'
BUTTER = (246, 228, 160); CREAM = (250, 240, 214)
CLIP = {'127a': '127a72f5-1212-4d84-845b-1beb71301bfe.MP4', '5a6e': '5a6e859e-d744-4540-aa6a-58cb623466fc.MP4',
        '85d9': '85d9bf5f-65da-4e71-b9ca-e27790bae003.MP4', 'APP': 'ScreenRecording_10-13-2026.1-42-58.PM_1.MP4'}
src = lambda k: '../new/clip.mp4' if k == 'CAFE' else SRC + CLIP.get(k, f'IMG_{k}.MOV')
TITLE = [('9926', 1.0), ('9927.2', 0.7), ('9273', 6.5), ('127a', 2.0), ('9930', 0.3), ('9941', 1.0), ('9274', 7.0)]
SECTIONS = [
    ('10:00am', 'checked out', [('9930', 0.0, 2), ('9930', 2.6, 2)]),
    ('10:30am', 'a walk on the prom', [('127a', 1.5, 2), ('5a6e', 3.5, 2)]),
    ('11:15am', 'lion’s head, apparently', [('0691', 0.0, 2)]),
    ('12:30pm', 'a quick wine tasting', [('9273', 5.8, 2), ('9274', 6.0, 2)]),
    ('3:45pm', 'still tasting', [('9274', 13.2, 2)]),
    ('4:00pm', 'the bo-kaap steps', [('9926', 0.6, 2), ('9927.2', 0.2, 2)]),
    ('4:20pm', 'i’m a hat now', [('9928', 1.6, 3)]),
    ('4:40pm', 'people watching', [('CAFE', 0.0, 3)]),
    ('5:00pm', 'found cubby', [('9934', 5.0, 2), ('85d9', 0.8, 2)]),
    ('5:01pm', 'booked a local spot', [('APP', 1.2, 3)]),
    ('5:15pm', 'checked in, safe & sound', [('9941', 0.3, 3)]),
    ('5:16pm', 'hands-free, finally', [('9943', 1.8, 3)]),
]
END = ('85d9', 6.8, 5)
GRADE = ("eq=contrast=1.05:saturation=0.9:gamma=0.98,colorbalance=rs=0.05:gs=0.02:bs=-0.04:rh=0.03:bh=-0.05,"
         "vignette=PI/5,noise=alls=5:allf=t+u")
os.makedirs('seg', exist_ok=True); os.makedirs('gfx/title', exist_ok=True)
shots = [(k, ss, 1) for k, ss in TITLE] + [s for _, _, sh in SECTIONS for s in sh] + [END]
segs = []; t = 0.0; times = []
for i, (k, ss, beats) in enumerate(shots):
    a, b = t, t + beats * BEAT; n = round(b * FPS) - round(a * FPS); t = b; times.append((a, b))
    out = f'seg/{i:02d}.mp4'; segs.append(out)
    speed = 'setpts=0.5*PTS,' if k == 'APP' else ('setpts=PTS/0.85,' if k == 'CAFE' else '')
    sharp = ',unsharp=5:5:0.5' if k == 'CAFE' else ''
    blur = ',gblur=sigma=6,eq=brightness=-0.06' if (k, ss) == END[:2] else ''
    vf = (f"{speed}scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},setsar=1,fps={FPS},"
          f"tpad=stop_mode=clone:stop_duration=10{sharp},zoompan=z='1+0.04*on/{n}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s={W}x{H}:fps={FPS},"
          f"{GRADE if k != 'APP' else 'noise=alls=3:allf=t'}{blur}")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(ss), '-i', src(k), '-vf', vf, '-frames:v', str(n), '-an', '-c:v', 'libx264',
                    '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-r', str(FPS), out], check=True)
TOTAL = round(t * FPS) / FPS
open('seg/list.txt', 'w').write(''.join(f"file '{os.path.basename(p)}'\n" for p in segs))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'seg/list.txt', '-c', 'copy', 'base.mp4'], check=True)

def shadowed(im, r=8, a=0.45):
    sh = im.split()[3].filter(ImageFilter.GaussianBlur(r)).point(lambda v: v * a)
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.paste((0, 0, 0, 255), (0, 3), sh); out.alpha_composite(im); return out
# title: big serif stacked + sans time range + typed line, as a frame sequence over the opening montage
TT = len(TITLE) * BEAT; nt = round(TT * FPS)
fT = ImageFont.truetype(SERIF, 270); fS = ImageFont.truetype(SANS, 56)
line2 = 'as a cape town suitcase'
for f in range(nt):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for j, w_ in enumerate(['day', 'in my', 'life']): d.text((64, 470 + j * 222), w_, font=fS if False else fT, fill=BUTTER)
    d.text((72, 1222), '10:00am-5:16pm', font=fS, fill='white')
    nch = max(0, min(len(line2), int((f / FPS - 0.5) / 1.3 * len(line2))))
    d.text((72, 1294), line2[:nch], font=fS, fill='white')
    shadowed(im).save(f'gfx/title/{f:03d}.png')
# section labels: small serif time + label, centred
fA = ImageFont.truetype(SERIF, 70); fB = ImageFont.truetype(SERIF, 96)
def label(tm, txt, path, glow=False):
    im = Image.new('RGBA', (W, 420), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    if glow:   # soft dark halo so cream text reads on the white app screen
        g = Image.new('L', (W, 420), 0); ImageDraw.Draw(g).ellipse((170, 95, W - 170, 330), fill=165)
        im.paste((20, 14, 8, 255), (0, 0), g.filter(ImageFilter.GaussianBlur(40))); d = ImageDraw.Draw(im)
    for s, f_, y in ((tm, fA, 80), (txt, fB, 160)):
        bb = d.textbbox((0, 0), s, font=f_); d.text(((W - (bb[2] - bb[0])) / 2 - bb[0], y), s, font=f_, fill=CREAM)
    shadowed(im, 9, 0.75).save(path)
ins = ['-i', 'base.mp4', '-framerate', str(FPS), '-i', 'gfx/title/%03d.png']
fc = [f"[1:v]format=rgba[tt];[0:v][tt]overlay=0:0:enable='lt(t,{TT})'[v1]"]; prev = 'v1'; k = 2; si = len(TITLE)
for j, (tm, txt, sh) in enumerate(SECTIONS):
    a = times[si][0]; b = times[si + len(sh) - 1][1]; si += len(sh)
    p = f'gfx/l{j:02d}.png'; label(tm, txt, p, glow=sh[0][0] == 'APP')
    ins += ['-loop', '1', '-framerate', str(FPS), '-t', f'{b - a + 0.1:.2f}', '-i', p]
    fc.append(f"[{k}:v]format=rgba,fade=in:st=0:d=0.3:alpha=1,setpts=PTS+{a}/TB[o{k}];[{prev}][o{k}]overlay=x=0:y='740+14*max(0\\,1-(t-{a})/0.3)':enable='between(t,{a},{b - 0.001})'[v{k}]")
    prev = f'v{k}'; k += 1
# end card: serif slogan, small url, logo
a = times[-1][0]
im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
logo = Image.open('../cubby_logo_transparent.png').convert('RGBA') if os.path.exists('../cubby_logo_transparent.png') else None
fE = ImageFont.truetype(SERIF, 150); fU = ImageFont.truetype(SANS, 46)
for j, w_ in enumerate(['download.', 'store.', 'explore.']):
    bb = d.textbbox((0, 0), w_, font=fE); d.text(((W - (bb[2] - bb[0])) / 2 - bb[0], 640 + j * 165), w_, font=fE, fill=BUTTER)
bb = d.textbbox((0, 0), 'cubby.co.za', font=fU); d.text(((W - (bb[2] - bb[0])) / 2 - bb[0], 1200), 'cubby.co.za', font=fU, fill='white')
if logo:
    logo.thumbnail((240, 240)); im.alpha_composite(logo, ((W - logo.width) // 2, 360))
shadowed(im, 10, 0.5).save('gfx/end.png')
ins += ['-loop', '1', '-framerate', str(FPS), '-t', f'{TOTAL - a + 0.1:.2f}', '-i', 'gfx/end.png']
fc.append(f"[{k}:v]format=rgba,fade=in:st=0:d=0.4:alpha=1,setpts=PTS+{a}/TB[o{k}];[{prev}][o{k}]overlay=0:0:enable='gte(t,{a})'[v]")
subprocess.run(['python3', 'music.py', str(TOTAL), 'music.wav'], check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y'] + ins + ['-i', 'music.wav', '-filter_complex', ';'.join(fc), '-map', '[v]', '-map', f'{k + 1}:a',
                '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-t', str(TOTAL),
                '-af', f'loudnorm=I=-14:TP=-1.5,aresample=48000,afade=t=out:st={TOTAL - 1}:d=1', '-c:a', 'aac', '-b:a', '192k', 'day_in_my_life.mp4'], check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'day_in_my_life.mp4', '-map', '0:v', '-c', 'copy', 'day_in_my_life_no_music.mp4'], check=True)
print('done', TOTAL)
