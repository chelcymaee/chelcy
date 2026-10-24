import numpy as np, soundfile as sf
from scipy.signal import butter,sosfilt
SR=48000; rng=np.random.default_rng(9)
t=lambda d: np.arange(int(SR*d))/SR
bp=lambda x,lo,hi: sosfilt(butter(2,[lo,hi],btype='band',fs=SR,output='sos'),x)
lp=lambda x,c: sosfilt(butter(2,c,btype='low',fs=SR,output='sos'),x)
norm=lambda x,db=-3: x/np.max(np.abs(x))*10**(db/20)
def save(n,x): sf.write(f'sfx/{n}.wav',norm(x).astype(np.float32),SR)
# record scratch: noise through fast up/down sweeping bandpass
d=0.55; tt=t(d); n=rng.standard_normal(len(tt)); out=np.zeros(len(tt)); seg=int(0.01*SR)
for i in range(0,len(tt)-seg,seg):
    ph=tt[i]/d; f=600+2600*abs(np.sin(np.pi*ph*2.2)); out[i:i+seg]=bp(n[i:i+seg+0],f*0.7,f*1.3)[:seg]
save('record_scratch',out*np.clip((d-tt)/0.1,0,1))
# wind gust
d=1.8; tt=t(d); n=rng.standard_normal(len(tt)); env=np.sin(np.pi*tt/d)**1.5*(1+0.3*np.sin(2*np.pi*3*tt))
w=sum(bp(n,f,f*1.6)*a for f,a in [(250,1),(500,0.6),(900,0.35)]); save('wind_gust',w*env)
# angelic choir: soft major chord with vibrato + shimmer
d=2.2; tt=t(d); x=np.zeros(len(tt))
for f in [523.25,659.25,783.99,1046.5]:
    for det in (-0.004,0,0.004): x+=np.sin(2*np.pi*f*(1+det)*tt+0.6*np.sin(2*np.pi*5.2*tt))*(1/ (1+f/600))
x=lp(x,3500)*np.clip(tt/0.35,0,1)*np.clip((d-tt)/0.8,0,1)
sh=sum(np.sin(2*np.pi*f*tt)*np.exp(-((tt-0.2-k*0.08)%1.2)*6) for k,f in enumerate([2093,2637,3136,4186]))*0.08
save('angel_choir',x+sh)
# lock click: two short clicks
d=0.25; tt=t(d); c=lambda at: (bp(rng.standard_normal(len(tt)),2000,7000)*np.exp(-np.clip(tt-at,0,None)*400)*(tt>=at))
save('lock_click',c(0.0)+0.8*c(0.09))
# documentary strings bed (Dm - Bb - F - C), 82 s, 5 s per chord, slow attack
d=82; tt=t(d); x=np.zeros(len(tt))
chords=[[146.83,220.0,293.66,349.23],[116.54,233.08,293.66,349.23],[174.61,220.0,261.63,349.23],[130.81,196.0,261.63,329.63]]
L=5.0
for k in range(int(d/L)+1):
    i0=int(k*L*SR); i1=min(len(tt),int((k+1)*L*SR)+int(1.0*SR)); seg=tt[:i1-i0]
    env=np.clip(seg/1.2,0,1)*np.clip((len(seg)/SR-seg)/1.2,0,1)
    for f in chords[k%4]:
        ph=2*np.pi*f*seg; v=sum(np.sin(h*ph+0.4*np.sin(2*np.pi*5*seg+h))/h for h in range(1,7))
        x[i0:i1]+=v*env*0.25
x=lp(x,1800); save('doc_strings',x)
print('ok')
