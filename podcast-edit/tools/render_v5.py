import json,subprocess
pieces=json.load(open('pieces_v2.json'))
cw,ch=340,604
single={'L':(318-cw//2,24),'R':(928-cw//2,54)}
half={'L':(318-270,116),'R':(928-270,146)}
vf=[];af=[]
for i,(a,b,s) in enumerate(pieces):
    src=f"[0:v]trim={a:.3f}:{b:.3f},setpts=PTS-STARTPTS"
    if s=='W':
        vf+= [f"{src},split[t{i}][u{i}]",
              f"[t{i}]crop=540:480:{half['L'][0]}:{half['L'][1]},scale=1080:960:flags=lanczos[top{i}]",
              f"[u{i}]crop=540:480:{half['R'][0]}:{half['R'][1]},scale=1080:960:flags=lanczos[bot{i}]",
              f"[top{i}][bot{i}]vstack,setsar=1[v{i}]"]
    else:
        x,y=single[s]
        if i==0 and s=='R': x=800
        vf.append(f"{src},crop={cw}:{ch}:{x}:{y},scale=1080:1920:flags=lanczos,setsar=1[v{i}]")
    af.append(f"[0:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS[a{i}]")
n=len(pieces); dur=sum(b-a for a,b,_ in pieces)
fc=";".join(vf+af)+";"+"".join(f"[v{i}][a{i}]" for i in range(n))+f"concat=n={n}:v=1:a=1[pre][a0];[pre]split[pn][pz];[pz]crop=940:1672:70:136,scale=1080:1920:flags=lanczos[zz];[pn][zz]overlay=0:0:enable='between(t,7.4,9.6)+between(t,57.8,60.3)+between(t,86.0,87.9)',hue=s=0:enable='between(t,30.95,32.6)'[base]"
st=[('st_football.png',2.55,4.65,540,430),('cut/st_logo_chiefs.png',4.75,6.60,540,400),('cut/st_walker.png',7.30,9.60,540,350),
    ('cut/st_logo_vikings.png',25.25,27.20,540,400),('cut/st_murray.png',35.20,37.40,540,380),('cut/st_jefferson.png',48.60,49.85,540,380),
    ('cut/st_mason.png',51.45,53.40,540,400),('cut/st_logo_49ers.png',56.40,57.65,540,400),('cut/st_purdy.png',57.70,60.65,300,380),
    ('st_mvp.png',58.55,60.65,790,380),('cut/st_logo_rams.png',78.30,80.00,540,400),('cut/st_broncos.png',81.90,83.90,540,420),
    ('cut/st_logo_vikings.png',88.10,90.60,215,400),('cut/st_logo_49ers.png',88.10,90.60,840,400),('fx_vs_s.png',88.20,90.60,540,400),
    ('fx_banner.png',0.0,2.35,540,330)]
import json as _j,os as _o
ARTICLES=_j.load(open('articles.json')) if _o.path.exists('articles.json') else []
st+=[(a['file'],a['t0'],a['t1'],540,a.get('cy',470)) for a in ARTICLES]
prev='base'
for k,(f,t0,t1,cx,cy) in enumerate(st):
    D=t1-t0
    S=f"if(lt(t\\,0.18)\\,0.25+0.95*t/0.18\\,if(lt(t\\,0.30)\\,1.2-0.2*(t-0.18)/0.12\\,if(gt(t\\,{D-0.15:.2f})\\,max(0.02\\,({D:.2f}-t)/0.15)\\,1)))"
    fc+=f";[{k+1}:v]format=rgba,scale=w='trunc(iw*{S}/2)*2':h='trunc(ih*{S}/2)*2':eval=frame,setpts=PTS+{t0}/TB[s{k}]"
    fc+=f";[{prev}][s{k}]overlay=x='{cx}-w/2':y='{cy}-h/2+7*sin(2*PI*0.7*(t-{t0}))':eval=frame:enable='between(t,{t0},{t1})'[o{k}]"; prev=f"o{k}"
VIG=len(st)+1
fc+=f";[{prev}]split[ka][kb];[kb]scale=1120:-2,crop=1080:1920:x='20+14*sin(t*95)':y='35+14*cos(t*83)'[sh];[ka][sh]overlay=0:0:enable='between(t,86.3,86.9)+between(t,88.15,88.75)'[shk]"
fc+=f";[{VIG}:v]format=rgba[vg];[shk][vg]overlay=0:0:enable='between(t,86.0,87.9)'[vgo]"
fc+=f";[vgo]subtitles=captions_v2.ass:fontsdir=fonts[v]"
fc+=";[a0]highpass=f=80,afftdn=nr=8:nf=-45,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=200,loudnorm=I=-14:TP=-1.5:LRA=9,aresample=48000[a]"
cues=[('card_pop',0.05,-9),('whoosh',2.40,-7),('pop',2.62,-9),('drums',4.70,-8),('rb_tackle',7.25,-7),('impact',8.15,-6),('sparkle',11.20,-6),
 ('war_horn',25.20,-11),('sad_trombone',30.95,-9),('qb_throw_catch',35.15,-8),('wr_swish_ooh',48.55,-8),('pop',51.45,-8),('coin_chime',56.35,-8),
 ('qb_throw_catch',57.65,-8),('impact',58.75,-6),('cha_ching',75.90,-6),('deep_horn',78.25,-11),('gallop',81.85,-8),('suspense',86.30,-8),
 ('thunder',88.10,-8),('impact',88.15,-8),('whistle',90.95,-10)]+[('card_pop',a['t0'],-7) for a in ARTICLES]
cmd=["ffmpeg","-v","error","-y","-i","joined.mov"]
for f,t0,t1,*_ in st: cmd+=["-loop","1","-t",f"{t1-t0+0.05:.2f}","-framerate","30","-i",f]
cmd+=["-loop","1","-t",f"{dur:.2f}","-framerate","30","-i","fx_vignette.png"]
base_in=2+len(st)
for c,_,_ in cues: cmd+=["-i",f"sfx/{c}.wav"]
mix=""
for j,(c,t0,g) in enumerate(cues):
    mix+=f";[{base_in+j}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={g}dB,adelay={int(t0*1000)}|{int(t0*1000)}[x{j}]"
fc2=fc.replace("[a]","[voice]")+mix+";[voice]"+"".join(f"[x{j}]" for j in range(len(cues)))+f"amix=inputs={len(cues)+1}:duration=longest:normalize=0,alimiter=limit=0.7:level=false,apad,atrim=0:{dur:.3f}[a]"
cmd+=["-filter_complex",fc2,"-map","[v]","-map","[a]","-c:v","libx264","-crf","20","-preset","slow","-pix_fmt","yuv420p","-r","30","-c:a","aac","-b:a","192k","-movflags","+faststart","-t",f"{dur:.2f}","reel_v5.mp4"]
subprocess.run(cmd,check=True)
