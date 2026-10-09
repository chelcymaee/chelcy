import numpy as np, soundfile as sf
from scipy.signal import butter,sosfilt
SR=48000; rng=np.random.default_rng(5)
def t(d): return np.arange(int(SR*d))/SR
def bp(x,lo,hi): return sosfilt(butter(2,[lo,hi],btype='band',fs=SR,output='sos'),x)
def norm(x,db=-3): return x/np.max(np.abs(x))*10**(db/20)
# hawk cry: descending raspy FM screech with noise breath
d=1.1; tt=t(d); f=3200*np.exp(-tt*1.4)+1300
car=np.sin(2*np.pi*np.cumsum(f)/SR+2.5*np.sin(2*np.pi*f*0.5*tt))
rasp=bp(rng.standard_normal(len(tt)),1800,6000)*0.35
env=np.clip(tt/0.04,0,1)*np.exp(-tt*1.6)*(1+0.25*np.sin(2*np.pi*28*tt))
sf.write('sfx/hawk_cry.wav',norm((car+rasp)*env).astype(np.float32),SR)
# crowd cheer: many band-noise voices swelling
d=2.4; tt=t(d); x=np.zeros(len(tt))
for k in range(30):
    lo=rng.uniform(250,900); x+=bp(rng.standard_normal(len(tt)),lo,lo*rng.uniform(1.6,3))*(1+0.5*np.sin(2*np.pi*rng.uniform(2,7)*tt+rng.uniform(0,6)))
env=np.clip(tt/0.25,0,1)*np.clip((d-tt)/0.9,0,1)
sf.write('sfx/crowd_cheer.wav',norm(x*env).astype(np.float32),SR)
print('ok')
