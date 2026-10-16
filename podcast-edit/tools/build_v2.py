import json,re
fps=30
words=json.load(open('words.json'))
shots=json.load(open('shots.json'))
START,END=1.40,97.45
sil=[(5.06,6.52),(23.63,24.15),(29.49,30.01),(31.61,32.19),(45.76,46.38),(47.89,48.53),(68.63,69.29),(73.34,73.87),(83.86,84.54)]
# keep intervals: tighten each pause to ~0.22s
keep=[];cur=START
for s,e in sil:
    keep.append((cur,s+0.12)); cur=e-0.10
keep.append((cur,END))
def to_edit(t):
    acc=0
    for a,b in keep:
        if t<a: return acc
        if t<=b: return acc+t-a
        acc+=b-a
    return acc
# shot list in source time (extend first shot to START, last to END)
shots[0]['s']=START; shots[-1]['e']=END
pieces=[]
for sh in shots:
    for a,b in keep:
        x,y=max(a,sh['s']),min(b,sh['e'])
        if y-x>0.04: pieces.append((round(x,3),round(y,3),sh['shot']))
json.dump(pieces,open('pieces_v2.json','w'))
# captions: groups of up to 3 words, break on punctuation
fix={'plus':'+'}
ws=[w for w in words if START<=w['s']<END]
groups=[];g=[]
for w in ws:
    g.append(w)
    txt=" ".join(x['w'] for x in g)
    if len(g)==3 or re.search(r'[.,?!]$',w['w']) or len(txt)>14:
        groups.append(g);g=[]
if g: groups.append(g)
def clean(s): return re.sub(r'[.,?!]','',s).upper()
def ts(t):
    t=max(t,0); h=int(t//3600); m=int(t%3600//60); s=t%60
    return f"{h}:{m:02d}:{s:05.2f}"
hdr="""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Barlow Condensed ExtraBold,122,&H00FFFFFF,&H00FFFFFF,&H00000000,&H99000000,0,0,0,0,100,100,1,0,1,6,3,2,80,80,300,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
CY=r"{\c&HE8C631&}"; WH=r"{\c&HFFFFFF&}"
ev=[]
for gi,g in enumerate(groups):
    gend=groups[gi+1][0]['s'] if gi+1<len(groups) else END
    for i,w in enumerate(g):
        s=w['s']; e=g[i+1]['s'] if i+1<len(g) else min(gend,w['s']+1.2)
        a,b=to_edit(s),to_edit(e)
        if b-a<0.02: continue
        txt=" ".join((CY if j==i else WH)+clean(x['w']) for j,x in enumerate(g))
        ev.append(f"Dialogue: 0,{ts(a)},{ts(b)},Cap,,0,0,0,,{txt}")
open('captions_v2.ass','w').write(hdr+"\n".join(ev)+"\n")
# plain srt for editors
def srt(t): h=int(t//3600);m=int(t%3600//60);s=t%60;return f"{h:02d}:{m:02d}:{int(s):02d},{int(round((s%1)*1000)):03d}"
out=[]
for gi,g in enumerate(groups):
    gend=groups[gi+1][0]['s'] if gi+1<len(groups) else END
    out.append(f"{gi+1}\n{srt(to_edit(g[0]['s']))} --> {srt(to_edit(min(gend,g[-1]['s']+1.2)))}\n{clean(' '.join(x['w'] for x in g))}\n")
open('captions_v2.srt','w').write("\n".join(out))
json.dump(dict(keep=keep),open('keep_v2.json','w'))
print(len(pieces),"pieces",len(groups),"caption groups; edit length %.2f"%to_edit(END))
for w in ['undefeated','MVP,','Kenneth','Kyler','Jefferson\'s','Purdy,','Broncos.','Rams.','Chiefs','Vikings,','Niners,','dog.','phenomenal.']:
    print(w,[round(to_edit(x['s']),2) for x in ws if x['w']==w])
