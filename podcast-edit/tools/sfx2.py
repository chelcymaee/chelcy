import numpy as np, soundfile as sf
from scipy.signal import butter,sosfilt
SR=48000; rng=np.random.default_rng(11)
def t(d): return np.arange(int(SR*d))/SR
def bp(x,lo,hi): return sosfilt(butter(2,[lo,hi],btype='band',fs=SR,output='sos'),x)
def lp(x,c): return sosfilt(butter(2,c,btype='low',fs=SR,output='sos'),x)
def place(buf,x,at): o=int(at*SR); buf[o:o+len(x)]+=x[:len(buf)-o]; return buf
def norm(x,db=-3): return x/np.max(np.abs(x))*10**(db/20)
def save(n,x): sf.write(f'sfx/{n}.wav',norm(x).astype(np.float32),SR)
def thud(f0=70,d=0.35,crack=0.3):
    tt=t(d); f=f0*2.2*np.exp(-tt*18)+f0
    return np.tanh(2*np.sin(2*np.pi*np.cumsum(f)/SR))*np.exp(-tt*9)+crack*lp(rng.standard_normal(len(tt)),3000)*np.exp(-tt*45)
def whoosh(d=0.35,lo=300,hi=4000):
    tt=t(d); n=rng.standard_normal(len(tt)); env=np.sin(np.pi*tt/d)**2
    return bp(n,lo,hi)*env
# running back: two heavy steps + tackle hit
b=np.zeros(int(SR*0.9)); place(b,thud(60,0.25,0.15)*0.5,0); place(b,thud(60,0.25,0.15)*0.6,0.18); place(b,thud(55,0.5,0.8),0.38); save('rb_tackle',b)
# QB: throw whoosh + leather thwack
b=np.zeros(int(SR*0.7)); place(b,whoosh(0.3,500,5000),0); tw=t(0.12); place(b,bp(rng.standard_normal(len(tw)),800,3500)*np.exp(-tw*60)*2.5,0.33); save('qb_throw_catch',b)
# WR: fast swish + crowd "ooh"
d=1.3; tt=t(d); ooh=np.zeros(len(tt))
for k in range(18):
    f=rng.uniform(180,320); ph=rng.uniform(0,6)
    ooh+=np.sin(2*np.pi*f*tt*(1-0.08*tt)+ph+0.3*np.sin(2*np.pi*rng.uniform(4,7)*tt))
ooh=lp(ooh+0.4*bp(rng.standard_normal(len(tt)),300,900),900)*np.sin(np.pi*np.clip(tt/1.1,0,1))**1.2
b=np.zeros(int(SR*1.5)); place(b,whoosh(0.18,1500,8000)*1.2,0); place(b,ooh*0.5/np.max(np.abs(ooh)),0.12); save('wr_swish_ooh',b)
# Vikings war horn: low brassy saw, slow swell
d=1.4; tt=t(d); f=110*(1+0.004*np.sin(2*np.pi*5*tt)); ph=np.cumsum(f)/SR
saw=sum(np.sin(2*np.pi*h*ph)/h for h in range(1,14)); env=np.clip(tt/0.25,0,1)*np.clip((d-tt)/0.35,0,1)
save('war_horn',lp(saw,1600)*env)
# Chiefs drums: three tom hits
b=np.zeros(int(SR*0.9))
for i,(at,f0) in enumerate([(0,95),(0.16,95),(0.32,70)]): place(b,thud(f0,0.45,0.25),at)
save('drums',b)
# 49ers gold-coin chime
b=np.zeros(int(SR*0.9))
for i,f0 in enumerate([2093,2637,3136,4186]):
    tt=t(0.6); place(b,sum(np.sin(2*np.pi*f0*h*tt)/h**2 for h in (1,2.4,3.9))*np.exp(-tt*9),i*0.05)
save('coin_chime',b)
# Rams deep horn: lower, shorter
d=1.0; tt=t(d); ph=np.cumsum(73.4*np.ones(len(tt)))/SR
saw=sum(np.sin(2*np.pi*h*ph)/h for h in range(1,12)); save('deep_horn',lp(saw,1100)*np.clip(tt/0.12,0,1)*np.clip((d-tt)/0.3,0,1))
# Broncos gallop: hoof clops in triplets
b=np.zeros(int(SR*1.0)); tc=t(0.06)
clop=bp(rng.standard_normal(len(tc)),500,2500)*np.exp(-tc*70)+0.6*np.sin(2*np.pi*180*tc)*np.exp(-tc*50)
for at in [0,0.09,0.18,0.36,0.45,0.54,0.72,0.81]: place(b,clop*(0.7+0.3*rng.random()),at)
save('gallop',b)
# thunder crack for VS
d=1.6; tt=t(d); n=rng.standard_normal(len(tt))
crack=bp(n,1500,7000)*np.exp(-tt*25); rumble=lp(n,180)*np.exp(-tt*2.2)*np.clip(tt/0.05,0,1)*3
save('thunder',crack+rumble)
# notification pop for article cards
tt=t(0.25); f=600+900*np.exp(-tt*30); save('card_pop',np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*18)+0.3*np.sin(2*np.pi*1760*tt)*np.exp(-tt*12))
print('ok')
