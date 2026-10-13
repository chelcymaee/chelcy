# Cubby "Planet Cape Town" reel - two-pass build (base clips, then overlays/captions/audio)
import json, os, re, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter
os.chdir(os.path.dirname(os.path.abspath(__file__)))
FPS = 30; W, H = 1080, 1920
F9 = '../fonts/barlow-condensed-latin-900-normal.ttf'
SRC = 'src/'
REC = SRC + 'ScreenRecording_10-13-2026.1-42-58.PM_1.MP4'
vo = json.load(open('vo5/vo_timing.json')); TOTAL = round(vo['total'] + 0.5, 2)
def T(line, word, n=1):
    c = 0
    for w in vo['words']:
        if w['line'] == line and w['cap'] == word:
            c += 1
            if c == n: return round(w['s'], 3)
    raise KeyError((line, word, n))
def SP(line, i=0): return vo['spans'][line][i]
B = [0, T('l02', 'FORD') - 0.3, T('l02', 'STANDARD'), T('l02', 'WITH'), T('l02', 'WE'), SP('l03'), T('l03', 'WITH'), SP('l04'), T('l04', 'DAILY'),
     SP('l05'), T('l05', 'LOCALS'), SP('l06'), T('l06', 'SO'), SP('l07'), SP('l08'), SP('l09'), SP('l10'), T('l10', 'THE'), T('l10', 'DROP'),
     SP('l11'), T('l11', 'AND'), SP('l12'), TOTAL]
B = [round(x * 30) / 30 for x in B]

# ---------------- pass 1: base timeline (edit start, edit end, source, src start, mode) ----------------
SEG = [(B[0], B[1], 'IMG_0314.MOV', 0.5, ''), (B[1], B[2], 'IMG_0317.MOV', 0.0, ''), (B[2], B[3], 'IMG_0315.MOV', 0.0, ''),
       (B[3], B[4], 'IMG_0316.MOV', 0.0, ''), (B[4], B[5], 'IMG_0318.MOV', 0.2, 'freeze%.3f' % T('l02', 'SUITCASE')),
       (B[5], B[6], '127a72f5-1212-4d84-845b-1beb71301bfe.MP4', 0.0, ''), (B[6], B[7], '5a6e859e-d744-4540-aa6a-58cb623466fc.MP4', 0.0, ''),
       (B[7], round((B[7] + 2.1) * 30) / 30, 'IMG_0691.MOV', 0.0, ''), (round((B[7] + 2.1) * 30) / 30, B[8], 'IMG_0318.MOV', 4.2, ''), (B[8], B[9], 'IMG_9877.MOV', 0.5, ''),
       (B[9], B[10], 'IMG_9273.MOV', 5.0, ''), (B[10], B[11], 'IMG_9274.MOV', 4.0, ''),
       (B[11], B[12], 'IMG_9926.MOV', 0.0, ''), (B[12], B[13], 'IMG_9927.2.MOV', 0.5, ''), (B[13], B[14], 'IMG_9928.MOV', 0.0, ''),
       (B[14], B[15], 'IMG_9930.MOV', 0.4, ''), (B[15], B[16], 'IMG_9934.MOV', 0.0, ''), (B[16], B[17], '85d9bf5f-65da-4e71-b9ca-e27790bae003.MP4', 0.5, ''),
       (B[17], B[18], 'RED', 0, ''), (B[18], B[19], 'IMG_9943.MOV', 0.3, ''), (B[19], B[20], 'IMG_9941.MOV', 0.0, ''),
       (B[20], B[21], '127a72f5-1212-4d84-845b-1beb71301bfe.MP4', 6.0, ''), (B[21], B[22], 'RED', 0, '')]
GREY = [(30.95, 30.95)]  # none needed; grey moment lives on 25.1 stamp instead
os.makedirs('seg', exist_ok=True)
lst = []
for i, (a, b, f, s, mode) in enumerate(SEG):
    n = round(b * FPS) - round(a * FPS); out = f'seg/{i:02d}.mp4'; lst.append(out)
    if f == 'RED':
        cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', f'color=c=0xF5333F:s={W}x{H}:r={FPS}', '-frames:v', str(n)]
    else:
        vf = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},setsar=1"
        if not mode: vf += ",tpad=stop_mode=clone:stop_duration=30"   # never run short: hold last frame if a line outlasts the clip
        if mode.startswith('freeze'):
            tf = float(mode[6:]) - a; play = round(tf * FPS)
            vf += f",trim=end_frame={play},tpad=stop_mode=clone:stop_duration=5,zoompan=z='if(lt(on,{play}),1,1+0.18*min(1,(on-{play})/{n - play}))':x='iw/2-iw/zoom/2':y='ih*0.45-ih/zoom*0.45':d=1:s={W}x{H}:fps={FPS}"
        cmd = ['ffmpeg', '-v', 'error', '-y', '-ss', str(s), '-i', SRC + f, '-vf', vf, '-frames:v', str(n)]
    subprocess.run(cmd + ['-an', '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-r', str(FPS), out], check=True)
open('seg/list.txt', 'w').write("".join(f"file '{os.path.basename(p)}'\n" for p in lst))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'seg/list.txt', '-c', 'copy', 'base.mp4'], check=True)

# ---------------- app section assets ----------------
def rounded(im, r):
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), radius=r, fill=255); im.putalpha(m); return im
def card_from(path, w, crop=None, r=30, border=10):
    im = Image.open(path).convert('RGB')
    if crop: im = im.crop(crop)
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS); im = rounded(im.convert('RGBA'), r)
    b = Image.new('RGBA', (im.width + 2 * border, im.height + 2 * border), (0, 0, 0, 0))
    ImageDraw.Draw(b).rounded_rectangle((0, 0, b.width - 1, b.height - 1), radius=r + border, fill=(255, 255, 255, 255)); b.alpha_composite(im, (border, border))
    s = Image.new('RGBA', (b.width + 60, b.height + 60), (0, 0, 0, 0)); m = Image.new('L', s.size, 0); m.paste(b.split()[3], (36, 40))
    s.paste(Image.new('RGBA', s.size, (0, 0, 0, 120)), (0, 0), m.filter(ImageFilter.GaussianBlur(14))); s.alpha_composite(b, (30, 30)); return s
def ig_crop(p):
    im = Image.open(p); return (0, int(im.height * 0.07), im.width, int(im.height * 0.52))
card_from(SRC + 'IMG_0797.PNG', 450, ig_crop(SRC + 'IMG_0797.PNG')).save('g/host_stellski.png')
card_from(SRC + 'IMG_0798.2.PNG', 450, ig_crop(SRC + 'IMG_0798.2.PNG')).save('g/host_albatross.png')
card_from(SRC + 'IMG_0799.2.PNG', 450, ig_crop(SRC + 'IMG_0799.2.PNG')).save('g/host_3at1.png')
card_from(SRC + 'IMG_0800.jpg', 400).save('g/host_shopfront.png')
card_from(SRC + 'IMG_0802.2.PNG', 520, (0, 0, 1179, 2400), r=44).save('g/app_listing.png')
card_from(SRC + 'IMG_0803.2.PNG', 520, (0, 0, 1179, 2400), r=44).save('g/app_bookings.png')
# phone frame for the screen recording (600x1300 screen)
PW, PH = 600, 1300
ph = Image.new('RGBA', (PW + 40, PH + 40), (0, 0, 0, 0)); d = ImageDraw.Draw(ph)
d.rounded_rectangle((0, 0, PW + 39, PH + 39), radius=80, fill=(15, 15, 15, 255)); d.rounded_rectangle((20, 20, PW + 19, PH + 19), radius=62, fill=(0, 0, 0, 0))
ph.save('g/phone_frame.png')
m = Image.new('L', (PW, PH), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, PW - 1, PH - 1), radius=62, fill=255); m.save('g/phone_mask.png')
# logo pop + end card
logo = Image.open('cubby_logo.png')
lg = logo.resize((420, 420), Image.LANCZOS); bord = Image.new('RGBA', (460, 460), (0, 0, 0, 0)); ImageDraw.Draw(bord).ellipse((0, 0, 459, 459), fill=(255, 255, 255, 255)); bord.alpha_composite(lg, (20, 20)); bord.save('g/logo_pop.png')
end = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(end)
ImageDraw.Draw(end).ellipse(((W - 580) // 2, 390, (W + 580) // 2, 970), fill=(255, 255, 255, 255)); end.alpha_composite(logo.resize((520, 520), Image.LANCZOS), ((W - 520) // 2, 420))
f1 = ImageFont.truetype(F9, 150); f2 = ImageFont.truetype(F9, 64)
for i, (t, c) in enumerate([('DOWNLOAD.', (255, 255, 255)), ('STORE.', (255, 255, 255)), ('EXPLORE.', (255, 214, 64))]):
    tw = d.textlength(t, font=f1); d.text(((W - tw) / 2, 1000 + i * 150), t, font=f1, fill=c, stroke_width=6, stroke_fill=(120, 10, 20))
t = 'cubby.co.za'; tw = d.textlength(t, font=f2); d.text(((W - tw) / 2, 1500), t, font=f2, fill=(255, 255, 255))
end.save('g/endcard.png')

# ---------------- pass 2: overlays ----------------
# (file, t0, t1, cx, cy, anim) anim: pop (bounce) | stamp (slam) | slide (from top)
OV = [('g/lab_location.png', 0.35, SP('l01', 1), 540, 260, 'slide'),
      ('g/lab_vehicle.png', T('l02', 'FORD'), T('l02', 'STANDARD') - 0.05, 540, 260, 'slide'), ('g/lab_nomad.png', T('l02', 'STANDARD'), T('l02', 'WE'), 540, 260, 'slide'),
      ('g/lab_specimen.png', T('l02', 'SUITCASE'), B[5], 540, 300, 'stamp'),
      ('g/pack1.png', T('l03', 'RESCUE'), T('l03', 'ICED'), 540, 520, 'pop'), ('g/pack2.png', T('l03', 'ICED'), T('l03', 'MATCHING'), 540, 520, 'cut'),
      ('g/pack3.png', T('l03', 'MATCHING'), T('l03', 'NEVER'), 540, 520, 'cut'), ('g/pack4.png', T('l03', 'NEVER'), SP('l04'), 540, 520, 'cut'),
      ('g/lab_lionshead.png', T('l04', "LION'S"), T('l04', 'THE'), 540, 260, 'slide'), ('g/bubble.png', T('l04', 'THE'), T('l04', 'DAILY'), 540, 560, 'pop'),
      ('g/st_daily.png', T('l04', 'DAILY'), SP('l05'), 540, 760, 'stamp'),
      ('g/lab_tasting.png', T('l05', 'QUICK') - 0.2, T('l05', 'IT', 2), 540, 260, 'slide'), ('g/st_6hrs.png', T('l05', 'NEVER'), SP('l06'), 540, 560, 'stamp'),
      ('g/steps1.png', T('l06', 'STEPS'), T('l06', 'SO'), 540, 600, 'pop'), ('g/steps2.png', T('l06', 'SO'), SP('l07'), 540, 600, 'stamp'),
      ('g/lab_wind.png', T('l07', 'THE'), SP('l08'), 540, 260, 'slide'),
      ('g/boarding.png', SP('l08'), T('l08', 'NOW'), 540, 560, 'pop'), ('g/st_nownow.png', T('l08', 'NOW'), SP('l09'), 540, 1180, 'stamp'),
      ('g/logo_pop.png', T('l10', 'CUBBY'), B[17], 540, 760, 'pop'),
      ('g/host_stellski.png', T('l10', 'CAFE'), T('l10', 'TAP'), 290, 700, 'pop'), ('g/host_albatross.png', T('l10', 'GUEST'), T('l10', 'TAP'), 790, 700, 'pop'),
      ('g/host_3at1.png', T('l10', 'SHOP'), T('l10', 'TAP'), 290, 1130, 'pop'), ('g/host_shopfront.png', T('l10', 'SHOP') + 0.4, T('l10', 'TAP'), 790, 1170, 'pop'),
      ('g/app_listing.png', T('l10', 'TAP'), B[18], 340, 900, 'pop'), ('g/app_bookings.png', T('l10', 'BOOK'), B[18], 740, 980, 'pop'),
      ('g/st_secure.png', T('l11', 'SECURE'), B[20], 540, 640, 'stamp'),
      ('g/matcha.png', T('l11', 'MATCHA'), B[21], 820, 700, 'pop'), ('g/st_local.png', T('l11', 'PRACTICALLY'), B[21], 540, 420, 'stamp'),
      ('g/endcard.png', B[21], TOTAL, 540, 960, 'pop')]
SHAKE = [(T('l07', 'THE'), T('l07', 'OPINIONS')), (T('l03', 'NEVER'), T('l03', 'NEVER') + 0.45)]
GLOW = (SP('l09'), B[16])
APP = (B[17], T('l10', 'CAFE') - 0.05)   # phone with screen recording
inputs = ['-i', 'base.mp4']; fc = []; k = 1; prev = '0:v'
# phone + screen recording
inputs += ['-ss', '0', '-t', f'{APP[1] - APP[0] + 0.5}', '-i', REC, '-i', 'g/phone_mask.png', '-loop', '1', '-t', '8', '-i', 'g/phone_frame.png']
fc.append(f"[{k}:v]fps={FPS},scale={PW}:{PH},setsar=1,format=rgba[rec0];[{k + 1}:v]format=gray[pm];[rec0][pm]alphamerge,setpts=PTS+{APP[0]}/TB[rec]")
fc.append(f"[{prev}][rec]overlay=x={(W - PW) // 2}:y=160:enable='between(t,{APP[0]},{APP[1]})'[a0];[{k + 2}:v]format=rgba,setpts=PTS+{APP[0]}/TB[pf];[a0][pf]overlay=x={(W - PW) // 2 - 20}:y=140:enable='between(t,{APP[0]},{APP[1]})'[a1]")
prev = 'a1'; k += 3
# sign glow (radial light) on the flyer drop
glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
for r in range(900, 0, -30): gd.ellipse((W / 2 - r, H * 0.62 - r, W / 2 + r, H * 0.62 + r), fill=(255, 245, 200, int(70 * (1 - r / 900))))
glow.save('g/glow.png'); inputs += ['-loop', '1', '-t', '3', '-i', 'g/glow.png']
fc.append(f"[{k}:v]format=rgba,fade=in:st=0:d=0.4:alpha=1,setpts=PTS+{GLOW[0]}/TB[gl];[{prev}][gl]overlay=0:0:enable='between(t,{GLOW[0]},{GLOW[1]})'[a2]"); prev = 'a2'; k += 1
for f_, t0, t1, cx, cy, an in OV:
    D = t1 - t0; inputs += ['-loop', '1', '-framerate', str(FPS), '-t', f'{D + 0.1:.2f}', '-i', f_]
    if an == 'pop': S = f"if(lt(t\\,0.18)\\,0.25+0.95*t/0.18\\,if(lt(t\\,0.30)\\,1.2-0.2*(t-0.18)/0.12\\,1))"
    elif an == 'stamp': S = f"if(lt(t\\,0.12)\\,1.8-0.8*t/0.12\\,1)"
    else: S = '1'
    yexpr = f"{cy}-h/2-if(lt(t-{t0}\\,0.2)\\,260*(1-(t-{t0})/0.2)\\,0)" if an == 'slide' else f"{cy}-h/2"
    rot = "rotate=a='0.22*sin(t*24)*exp(-t*5)':c=none:ow='hypot(iw,ih)':oh=ow," if an == 'pop' and f_ != 'g/endcard.png' else ''
    fc.append(f"[{k}:v]format=rgba,{rot}scale=w='trunc(iw*{S}/2)*2':h='trunc(ih*{S}/2)*2':eval=frame,setpts=PTS+{t0}/TB[o{k}];[{prev}][o{k}]overlay=x='{cx}-w/2':y='{yexpr}':eval=frame:enable='between(t,{t0},{t1 - 0.001})'[v{k}]")
    prev = f'v{k}'; k += 1
    if an in ('pop', 'stamp') and f_ != 'g/endcard.png':
        inputs += ['-framerate', str(FPS), '-i', 'g/burst/%02d.png']
        fc.append(f"[{k}:v]format=rgba,setpts=PTS+{t0}/TB[bu{k}];[{prev}][bu{k}]overlay=x={cx}-260:y={cy}-260:eof_action=pass:enable='between(t,{t0},{t0 + 0.4})'[v{k}]")
        prev = f'v{k}'; k += 1
sh = "+".join(f"between(t,{a},{b})" for a, b in SHAKE)
fc.append(f"[{prev}]split[sa][sb];[sb]scale=1130:-2,crop={W}:{H}:x='25+16*sin(t*90)':y='44+16*cos(t*77)'[sk];[sa][sk]overlay=0:0:enable='{sh}'[vs]"); prev = 'vs'

# ---------------- captions (VO karaoke, house style) ----------------
words = [w for w in vo['words']]
groups = []; g = []
for w in words:
    if g and g[-1]['line'] != w['line']: groups.append(g); g = []
    g.append(w); txt = " ".join(x['cap'] for x in g)
    if len(g) == 3 or re.search(r'[.,?!]$', w['w']) or len(txt) > 14: groups.append(g); g = []
if g: groups.append(g)
def ts(t): return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"
hdr = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Barlow Condensed ExtraBold,112,&H00FFFFFF,&H00FFFFFF,&H00000000,&H99000000,0,0,0,0,100,100,1,0,1,6,3,2,70,70,300,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
CYA = r"{\c&H0AD6FF&}"; WHT = r"{\c&HFFFFFF&}"; ev = []; srt = []
for gi, g in enumerate(groups):
    if g[0]['s'] >= B[21]: continue   # end card speaks for itself
    gend = groups[gi + 1][0]['s'] if gi + 1 < len(groups) and groups[gi + 1][0]['line'] == g[0]['line'] else vo['spans'][g[0]['line']][1] + 0.15
    for i, w in enumerate(g):
        a = w['s']; b = g[i + 1]['s'] if i + 1 < len(g) else gend
        ev.append(f"Dialogue: 0,{ts(a)},{ts(b)},Cap,,0,0,0,,{' '.join((CYA if j == i else WHT) + x['cap'] for j, x in enumerate(g))}")
    def sr(t): return f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(round((t % 1) * 1000)):03d}"
    srt.append(f"{len(srt) + 1}\n{sr(g[0]['s'])} --> {sr(gend)}\n{' '.join(x['cap'] for x in g)}\n")
open('captions.ass', 'w').write(hdr + "\n".join(ev) + "\n"); open('captions.srt', 'w').write("\n".join(srt))
fc.append(f"[{prev}]subtitles=captions.ass:fontsdir=../fonts[v]")

# ---------------- audio: VO + music bed (ducked) + SFX ----------------
inputs += ['-i', 'vo5/vo_full.wav', '-i', '../sfx/doc_strings.wav']; vi, mi = k, k + 1; k += 2
fc.append(f"[{vi}:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=70,acompressor=threshold=-18dB:ratio=2:attack=10:release=150,loudnorm=I=-15:TP=-2:LRA=7,aresample=48000,asplit[vo1][vo2]")
fc.append(f"[{mi}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=-20dB,atrim=0:{TOTAL}[bed0];[bed0][vo2]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[bed]")
CUES = [('card_pop', 0.35, -10), ('card_pop', T('l02', 'FORD'), -10), ('card_pop', T('l02', 'STANDARD'), -10),
        ('impact', T('l02', 'SUITCASE'), -8), ('whoosh', T('l02', 'SUITCASE') - 0.1, -10),
        ('pop', T('l03', 'RESCUE'), -9), ('pop', T('l03', 'ICED'), -9), ('pop', T('l03', 'MATCHING'), -9), ('record_scratch', T('l03', 'NEVER'), -7),
        ('card_pop', T('l04', "LION'S"), -10), ('pop', T('l04', 'THE'), -9), ('impact', T('l04', 'DAILY'), -8),
        ('card_pop', T('l05', 'QUICK') - 0.2, -10), ('impact', T('l05', 'NEVER'), -8), ('pop', T('l06', 'STEPS'), -8), ('impact', T('l06', 'SO'), -8), ('record_scratch', T('l06', 'UPHILL'), -12),
        ('wind_gust', T('l07', 'THE') - 0.1, -8), ('card_pop', T('l07', 'THE'), -11), ('pop', SP('l08'), -9), ('impact', T('l08', 'NOW'), -8), ('sad_trombone', T('l08', 'THURSDAY'), -11),
        ('angel_choir', SP('l09'), -8), ('sparkle', T('l10', 'CUBBY'), -8), ('whoosh', B[17] - 0.1, -10),
        ('pop', T('l10', 'CAFE'), -7), ('pop', T('l10', 'GUEST'), -7), ('pop', T('l10', 'SHOP'), -7), ('pop', T('l10', 'SHOP') + 0.4, -8),
        ('pop', T('l10', 'TAP'), -7), ('pop', T('l10', 'BOOK'), -7),
        ('lock_click', T('l11', 'SECURE'), -6), ('impact', T('l11', 'SECURE') + 0.05, -10), ('pop', T('l11', 'MATCHA'), -8), ('impact', T('l11', 'PRACTICALLY'), -9),
        ('whoosh', B[21] - 0.1, -9), ('sparkle', T('l12', 'DOWNLOAD'), -9), ('whistle', TOTAL - 0.9, -14)]
for j, (c, t0, gdb) in enumerate(CUES):
    inputs += ['-i', f'../sfx/{c}.wav']
    fc.append(f"[{k + j}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={gdb}dB,adelay={int(t0 * 1000)}|{int(t0 * 1000)}[x{j}]")
fc.append("[vo1][bed]" + "".join(f"[x{j}]" for j in range(len(CUES))) + f"amix=inputs={len(CUES) + 2}:duration=longest:normalize=0,alimiter=limit=0.7:level=false,apad,atrim=0:{TOTAL}[a]")
subprocess.run(['ffmpeg', '-v', 'error', '-y'] + inputs + ['-filter_complex', ";".join(fc), '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium',
                '-pix_fmt', 'yuv420p', '-r', str(FPS), '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', str(TOTAL), 'cubby_reel_v6.mp4'], check=True)
print('done', TOTAL)
