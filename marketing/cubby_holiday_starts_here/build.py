# Cubby "The holiday starts here": 10 s cinematic reel. Slow, cool, letterboxed luggage shots -> "No." (bars snap open)
# -> the suitcase drop lands on the music drop -> fast warm cuts on the beat -> Cubby end card.
import os, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter
os.chdir(os.path.dirname(os.path.abspath(__file__)))
FPS = 30; W, H = 1080, 1920; SRC = '../src/'
SERIF = '../../fonts/instrument-serif-400-normal.ttf'; SERIF_I = '../../fonts/instrument-serif-400-italic.ttf'
CREAM = (250, 242, 222)
COOL = "eq=saturation=0.55:contrast=1.04:brightness=-0.02,colorbalance=rs=-0.03:bs=0.06:bm=0.03,vignette=PI/4.5,noise=alls=7:allf=t+u"
WARM = "eq=saturation=1.28:contrast=1.08,colorbalance=rs=0.05:gs=0.01:bs=-0.05:rh=0.03,vignette=PI/6,noise=alls=5:allf=t+u"
CLIP = {'127a': '127a72f5-1212-4d84-845b-1beb71301bfe.MP4', '85d9': '85d9bf5f-65da-4e71-b9ca-e27790bae003.MP4'}
src = lambda k: f'../views/IMG_{k[1:]}.MOV' if k.startswith('V') else SRC + CLIP.get(k, f'IMG_{k}.MOV')
# (start, end, clip, src start, speed, grade, extra)
SHOTS = [(0.0, 1.4, '9926', 0.8, 0.5, COOL, ''), (1.4, 2.8, '9273', 6.2, 0.5, COOL, ''), (2.8, 4.2, '127a', 2.0, 0.5, COOL, ''),
         (4.2, 5.0, '0314', 3.6, 1.0, WARM + ',eq=brightness=-0.16:contrast=0.92,gblur=sigma=2.5', ''), (5.0, 5.8, '9941', 0.7, 1.0, WARM, 'hold1.35'),
         (5.8, 6.3, 'V4151', 9.0, 1.3, WARM, ''), (6.3, 6.8, 'V8361', 2.0, 1.0, WARM, ''), (6.8, 7.3, 'V4943.2', 1.0, 1.0, WARM, ''),
         (7.3, 7.8, 'V6177', 1.2, 1.0, WARM, ''), (7.8, 8.3, 'V5897', 4.0, 1.0, WARM, ''), (8.3, 10.0, 'END', 0, 1, '', '')]
TOTAL = 10.0
os.makedirs('seg', exist_ok=True); os.makedirs('gfx', exist_ok=True)
fill = f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},setsar=1"
segs = []
for i, (a, b, k, ss, sp, grade, ex) in enumerate(SHOTS):
    n = round(b * FPS) - round(a * FPS); out = f'seg/{i:02d}.mp4'; segs.append(out)
    if k == 'END':
        # end card: red background, white pin logo (no ring), slogan, mycubby.co.za
        RED = (245, 51, 63); bg = Image.new('RGBA', (W, H), RED + (255,)); d = ImageDraw.Draw(bg)
        lg = Image.open('../cubby_logo_transparent.png').convert('RGBA')
        px = lg.load(); w_, h_ = lg.size
        pin = Image.new('RGBA', lg.size, (0, 0, 0, 0)); pp = pin.load()
        for yy in range(h_):
            for xx in range(w_):
                r_, g_, b_, a_ = px[xx, yy]
                if a_ and min(r_, g_, b_) > 200: pp[xx, yy] = (255, 255, 255, a_)   # keep only the white pin
                elif a_ and r_ > 200 and g_ > 150 and b_ < 120: pp[xx, yy] = (r_, g_, b_, a_)   # keep the yellow heart
        pin = pin.resize((640, 640), Image.LANCZOS); bg.alpha_composite(pin, ((W - 640) // 2, 330))
        F9 = '../../fonts/barlow-condensed-latin-900-normal.ttf'; f1 = ImageFont.truetype(F9, 150); f2 = ImageFont.truetype(F9, 64)
        for j, (t_, c_) in enumerate([('DOWNLOAD.', (255, 255, 255)), ('STORE.', (255, 255, 255)), ('EXPLORE.', (255, 214, 64))]):
            tw = d.textlength(t_, font=f1); d.text(((W - tw) / 2, 1000 + j * 150), t_, font=f1, fill=c_, stroke_width=6, stroke_fill=(120, 10, 20))
        t_ = 'mycubby.co.za'; tw = d.textlength(t_, font=f2); d.text(((W - tw) / 2, 1500), t_, font=f2, fill=(255, 255, 255))
        bg.convert('RGB').save('gfx/end_bg.png')
        cmd = ['-loop', '1', '-framerate', str(FPS), '-i', 'gfx/end_bg.png', '-vf', f"zoompan=z='1.06-0.06*min(1\\,on/{n})':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s={W}x{H}:fps={FPS}"]
    else:
        hold = f",trim=end={float(ex[4:]) - ss:.3f},tpad=stop_mode=clone:stop_duration=5" if ex.startswith('hold') else ',tpad=stop_mode=clone:stop_duration=5'
        z = "1+0.05*on/{n}".format(n=n) if sp < 1 else ("1.08-0.08*min(1\\,on/6)" if i >= 3 else "1")
        cmd = ['-ss', str(ss), '-i', src(k), '-vf', f"setpts=PTS/{sp},{fill},fps={FPS}{hold},zoompan=z='{z}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s={W}x{H}:fps={FPS},{grade}"]
    subprocess.run(['ffmpeg', '-v', 'error', '-y'] + cmd + ['-frames:v', str(n), '-an', '-r', str(FPS), '-c:v', 'libx264', '-crf', '15', '-preset', 'fast', '-pix_fmt', 'yuv420p', out], check=True)
open('seg/list.txt', 'w').write(''.join(f"file '{os.path.basename(p)}'\n" for p in segs))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'seg/list.txt', '-c', 'copy', 'base.mp4'], check=True)

def text_png(path, lines, size, italic_idx=(), gap=1.08, w=W, h=None):
    fN = ImageFont.truetype(SERIF, size); fI = ImageFont.truetype(SERIF_I, size); lh = int(size * gap)
    h = h or lh * len(lines) + 80
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for j, l in enumerate(lines):
        f = fI if j in italic_idx else fN; bb = d.textbbox((0, 0), l, font=f)
        d.text(((w - (bb[2] - bb[0])) / 2 - bb[0], 30 + j * lh), l, font=f, fill=CREAM)
    sh = im.split()[3].filter(ImageFilter.GaussianBlur(16)).point(lambda v: v * 0.6)
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.paste((10, 10, 20, 255), (0, 4), sh); out.alpha_composite(im); out.save(path)
text_png('gfx/t1a.png', ['You thought the holiday'], 100); text_png('gfx/t1b.png', ['started when you landed?'], 100, italic_idx=(0,))
text_png('gfx/no.png', ['No.'], 340)
text_png('gfx/t3a.png', ['It starts when you'], 100); text_png('gfx/t3b.png', ['drop the suitcase.'], 100, italic_idx=(0,))
text_png('gfx/welcome.png', ['Welcome to Cubby.'], 120)
bars = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(bars); BH = 170
d.rectangle((0, 0, W, BH), fill=(0, 0, 0, 255)); d.rectangle((0, H - BH, W, H), fill=(0, 0, 0, 255)); bars.save('gfx/bars.png')
# (png, t0, t1, y_top, fade-in, fade-out)
OV = [('gfx/t1a.png', 0.35, 4.05, 740, 0.5, 0.25), ('gfx/t1b.png', 1.55, 4.05, 848, 0.5, 0.25),
      ('gfx/no.png', 4.2, 4.98, 700, 0.0, 0.08),
      ('gfx/t3a.png', 5.0, 7.75, 700, 0.25, 0.2), ('gfx/t3b.png', 5.3, 7.75, 805, 0.0, 0.2),
      ('gfx/welcome.png', 8.45, TOTAL, 190, 0.35, 0.0)]
ins = ['-i', 'base.mp4', '-loop', '1', '-framerate', str(FPS), '-t', '4.3', '-i', 'gfx/bars.png']
fc = ["[1:v]format=rgba[bars];[0:v][bars]overlay=0:0:enable='lt(t,4.2)'[v1]"]; prev = 'v1'; k = 2
for png, t0, t1, y, fi, fo in OV:
    D = t1 - t0; ins += ['-loop', '1', '-framerate', str(FPS), '-t', f'{D:.2f}', '-i', png]
    fx = 'format=rgba' + (f',fade=in:st=0:d={fi}:alpha=1' if fi else '') + (f',fade=out:st={D - fo:.2f}:d={fo}:alpha=1' if fo else '')
    drift = f"{y}+18*max(0\\,1-(t-{t0})/0.6)" if fi >= 0.25 else (f"{y}-30*max(0\\,1-(t-{t0})/0.12)" if png.endswith('no.png') or png.endswith('t3b.png') else str(y))
    fc.append(f"[{k}:v]{fx},setpts=PTS+{t0}/TB[o{k}];[{prev}][o{k}]overlay=x=0:y='{drift}':eval=frame:enable='between(t,{t0},{t1 - 0.001})'[v{k}]"); prev = f'v{k}'; k += 1
# white flash on the drop
ins += ['-f', 'lavfi', '-t', '0.25', '-i', f'color=c=white:s={W}x{H}:r={FPS}']
fc.append(f"[{k}:v]format=rgba,colorchannelmixer=aa=0.55,fade=out:st=0:d=0.22:alpha=1,setpts=PTS+5.3/TB[fl];[{prev}][fl]overlay=0:0:enable='between(t,5.3,5.54)'[v]"); k += 1
subprocess.run(['python3', 'music.py', 'music.wav'], check=True)
SFX = '../../sfx/'
cues = [('impact', 4.2, -10), ('whoosh', 4.98, -9), ('impact', 5.3, -6), ('sparkle', 8.4, -10)]
ins += ['-i', 'music.wav']; labels = [f'[{k}:a]']; ai = k; k += 1
for j, (c, t0, g) in enumerate(cues):
    ins += ['-i', SFX + c + '.wav']; d_ = int(t0 * 1000)
    fc.append(f"[{k}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={g}dB,adelay={d_}|{d_}[s{j}]"); labels.append(f'[s{j}]'); k += 1
fc.append(f"[{ai}:a]aformat=sample_rates=48000:channel_layouts=stereo[mu]")
labels[0] = '[mu]'
fc.append(''.join(labels) + f"amix=inputs={len(labels)}:duration=longest:normalize=0,loudnorm=I=-14:TP=-1.2:LRA=11,aresample=48000,apad,atrim=0:{TOTAL}[a]")
subprocess.run(['ffmpeg', '-v', 'error', '-y'] + ins + ['-filter_complex', ';'.join(fc), '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow',
                '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', str(TOTAL), 'holiday_starts_here.mp4'], check=True)
print('done')
