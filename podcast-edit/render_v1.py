import json,subprocess
shots=json.load(open('shots.json'))
# break long R monologues with a short wide shot at natural pauses
wides=[(45.80,48.50),(68.65,70.90),(83.90,86.20)]
ev=[]
for sh in shots:
    pts=[sh['s']]+[x for w in wides if sh['s']<w[0]<sh['e'] for x in w]+[sh['e']]
    for i in range(len(pts)-1):
        a,b=pts[i],pts[i+1]
        shot='W' if any(abs(a-w[0])<1e-6 for w in wides) else sh['shot']
        ev.append((a,b,shot))
keep=[(2.40,5.30),(6.30,97.00)]   # remove ~1s dead air
pieces=[]
for a,b,s in ev:
    for k0,k1 in keep:
        x,y=max(a,k0),min(b,k1)
        if y-x>0.05: pieces.append((x,y,s))
W,H=1280,720; cw,ch=752,423
crop={'L':(0,190),'R':(1280-cw,205)}
vf=[];af=[]
for i,(a,b,s) in enumerate(pieces):
    c='' if s=='W' else f",crop={cw}:{ch}:{crop[s][0]}:{crop[s][1]},scale={W}:{H}:flags=lanczos"
    vf.append(f"[0:v]trim={a:.3f}:{b:.3f},setpts=PTS-STARTPTS{c},setsar=1[v{i}]")
    af.append(f"[0:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS[a{i}]")
n=len(pieces)
fc=";".join(vf+af)+";"+"".join(f"[v{i}][a{i}]" for i in range(n))+f"concat=n={n}:v=1:a=1[v][a0];[a0]highpass=f=80,afftdn=nr=8:nf=-45,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=200,loudnorm=I=-16:TP=-1.5:LRA=9[a]"
open('pieces.json','w').write(json.dumps(pieces))
for p in pieces: print("%6.2f-%6.2f %s"%p)
subprocess.run(["ffmpeg","-v","error","-y","-i","joined.mov","-filter_complex",fc,"-map","[v]","-map","[a]","-c:v","libx264","-crf","16","-preset","slow","-pix_fmt","yuv420p","-r","30","-c:a","aac","-b:a","192k","-movflags","+faststart","draft_v1.mp4"],check=True)
