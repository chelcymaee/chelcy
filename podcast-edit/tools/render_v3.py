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
fc=";".join(vf+af)+";"+"".join(f"[v{i}][a{i}]" for i in range(n))+f"concat=n={n}:v=1:a=1[pre][a0];[pre]split[pn][pz];[pz]crop=940:1672:70:136,scale=1080:1920:flags=lanczos[zz];[pn][zz]overlay=0:0:enable='between(t,7.4,9.6)+between(t,57.8,60.3)+between(t,86.0,87.9)'[base]"
st=[('st_football.png',2.55,4.65,250),('st_mvp.png',58.55,60.65,120)]
prev='base'
for k,(f,t0,t1,y) in enumerate(st):
    fc+=f";[{k+1}:v]format=rgba,fade=in:st={t0}:d=0.12:alpha=1,fade=out:st={t1-0.12}:d=0.12:alpha=1[s{k}]"
    fc+=f";[{prev}][s{k}]overlay=x=(W-w)/2:y={y}+70*max(0\\,1-(t-{t0})/0.18):enable='between(t,{t0},{t1})'[o{k}]"; prev=f"o{k}"
fc+=f";[{prev}]subtitles=captions_v2.ass:fontsdir=fonts[v]"
fc+=";[a0]highpass=f=80,afftdn=nr=8:nf=-45,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=200,loudnorm=I=-14:TP=-1.5:LRA=9[a]"
cues=[('whoosh',2.40,-7),('pop',2.62,-9),('impact',8.15,-6),('sparkle',11.20,-6),('sad_trombone',30.95,-9),('whoosh',58.40,-7),('impact',58.75,-6),('cha_ching',75.90,-6),('suspense',86.75,-8),('whistle',90.95,-10)]
cmd=["ffmpeg","-v","error","-y","-i","joined.mov"]
for f,*_ in st: cmd+=["-loop","1","-t",f"{dur:.2f}","-framerate","30","-i",f]
base_in=1+len(st)
for c,_,_ in cues: cmd+=["-i",f"sfx/{c}.wav"]
mix=""
for j,(c,t0,g) in enumerate(cues):
    mix+=f";[{base_in+j}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={g}dB,adelay={int(t0*1000)}|{int(t0*1000)}[x{j}]"
fc2=fc.replace("[a]","[voice]")+mix+";[voice]"+"".join(f"[x{j}]" for j in range(len(cues)))+f"amix=inputs={len(cues)+1}:duration=first:normalize=0,alimiter=limit=0.7:level=false[a]"
cmd+=["-filter_complex",fc2,"-map","[v]","-map","[a]","-c:v","libx264","-crf","20","-preset","slow","-pix_fmt","yuv420p","-r","30","-c:a","aac","-b:a","192k","-movflags","+faststart","-t",f"{dur:.2f}","reel_v3.mp4"]
subprocess.run(cmd,check=True)
