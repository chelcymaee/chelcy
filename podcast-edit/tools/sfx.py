import numpy as np, soundfile as sf
SR=48000; rng=np.random.default_rng(7)
def t(d): return np.arange(int(SR*d))/SR
def env(n,a,r,shape=3):
    x=np.ones(n); A=int(a*SR); R=int(r*SR)
    if A: x[:A]=np.linspace(0,1,A)
    if R: x[-R:]*=np.linspace(1,0,R)**shape
    return x
def lp(x,c):  # one-pole lowpass, c in Hz (array or scalar)
    c=np.broadcast_to(c,x.shape); y=np.zeros_like(x); a=0
    k=1-np.exp(-2*np.pi*c/SR)
    for i in range(len(x)): a+=k[i]*(x[i]-a); y[i]=a
    return y
def norm(x,db=-3): return x/np.max(np.abs(x))*10**(db/20)
def save(n,x): sf.write(f'sfx/{n}.wav',norm(x).astype(np.float32),SR)
# whoosh: band-swept noise
d=0.45;n=int(SR*d);tt=t(d); sweep=300+3500*np.sin(np.pi*tt/d)**2
w=lp(rng.standard_normal(n),sweep)-lp(rng.standard_normal(n)*0.0+lp(rng.standard_normal(n),sweep),150)
save('whoosh',w*np.sin(np.pi*tt/d)**1.5)
# pop: short pitched blip
d=0.12;tt=t(d);f=900*np.exp(-tt*25)+300
save('pop',np.sin(2*np.pi*np.cumsum(f)/SR)*env(len(tt),0.002,0.1,2))
# impact: sub drop + noise crack
d=0.9;tt=t(d);f=120*np.exp(-tt*4)+38
boom=np.tanh(2.2*np.sin(2*np.pi*np.cumsum(f)/SR))*np.exp(-tt*4.5)
crack=lp(rng.standard_normal(len(tt)),2500)*np.exp(-tt*30)*0.8
save('impact',boom+crack)
# sparkle: bright bell arpeggio
d=1.0;tt=t(d);x=np.zeros(len(tt))
for i,fr in enumerate([1568,2093,2637,3136]):
    o=int(i*0.06*SR); s=tt[:len(tt)-o]
    x[o:]+=sum(np.sin(2*np.pi*fr*h*s)/h**1.5 for h in (1,2.76,5.4))*np.exp(-s*6)
save('sparkle',x)
# sad trombone: 4 descending notes, sawtooth+vibrato, lowpassed
notes=[(311,0.32),(293,0.32),(277,0.32),(261,0.95)];out=[]
for k,(fr,du) in enumerate(notes):
    tt=t(du); vib=1+ (0.012*np.sin(2*np.pi*6*tt)*(tt>0.25) if k==3 else 0)
    ph=np.cumsum(fr*vib*np.ones(len(tt)))/SR; saw=2*(ph%1)-1
    out.append(lp(saw,1400)*env(len(tt),0.03,0.08 if k<3 else 0.4,1.5))
save('sad_trombone',np.concatenate(out))
# cha-ching: metallic clank + bell
d=0.9;tt=t(d)
clank=lp(rng.standard_normal(len(tt)),6000)*np.exp(-tt*40)
bell=np.zeros(len(tt)); o=int(0.09*SR); s=tt[:len(tt)-o]
bell[o:]=sum(np.sin(2*np.pi*f*s)*a for f,a in [(2637,1),(3951,.6),(5274,.35),(7040,.2)])*np.exp(-s*5)
save('cha_ching',clank*0.7+bell)
# suspense sting: two low hits + string-ish drone
d=1.5;tt=t(d);x=np.zeros(len(tt))
for st in (0,0.38):
    o=int(st*SR); s=tt[:len(tt)-o]; f=70*np.exp(-s*1.5)+45
    x[o:]+=np.tanh(3*np.sin(2*np.pi*np.cumsum(f)/SR))*np.exp(-s*3.5)
dr=sum(np.sin(2*np.pi*f*tt+np.sin(2*np.pi*5*tt)*0.4) for f in (110,116.5,220))*env(len(tt),0.3,0.6)*0.25
save('suspense',x+dr)
# referee whistle: two close tones + pea flutter
d=0.75;tt=t(d);flut=1+0.5*(np.sin(2*np.pi*38*tt)>0)
w=(np.sin(2*np.pi*2950*tt)+0.8*np.sin(2*np.pi*3120*tt))*flut+0.15*lp(rng.standard_normal(len(tt)),5000)
save('whistle',w*env(len(tt),0.02,0.12,1))
print("ok")
