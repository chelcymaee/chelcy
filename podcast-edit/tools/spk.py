import json,numpy as np,sys
S=sys.argv[1]; d=json.load(open(S+'/track.json')); W=d['W']; F=d['frames']; N=len(F); fps=30
a=np.fromfile(S+'/a.raw',np.int16).astype(float); hop=16000//fps
rms=np.array([np.sqrt(np.mean(a[i*hop:(i+1)*hop]**2)+1) for i in range(N)]); db=20*np.log10(rms)
M={'L':np.full(N,np.nan),'R':np.full(N,np.nan)}; box={'L':[None]*N,'R':[None]*N}
for i,fs in enumerate(F):
    for f in fs:
        k='L' if f['cx']<W/2 else 'R'
        if box[k][i] is None or f['w']>box[k][i]['w']: M[k][i]=f['m']; box[k][i]=f
def act(x):
    x=np.copy(x); idx=np.arange(N); g=~np.isnan(x); x[~g]=np.interp(idx[~g],idx[g],x[g])
    v=np.abs(np.diff(x,prepend=x[0])); k=np.ones(15)/15
    return np.convolve(v,k,'same')
AL,AR=act(M['L']),act(M['R'])
voice=np.convolve(db>np.percentile(db,35),np.ones(9)/9,'same')>0.4
np.save(S+'/act.npy',np.vstack([AL,AR,voice,db]))
print("face coverage L %.0f%% R %.0f%%"%(100*np.mean(~np.isnan(M['L'])),100*np.mean(~np.isnan(M['R']))))
for t in range(0,N,fps):
    s=slice(t,t+fps); l,r=AL[s].mean(),AR[s].mean()
    print("%5.1fs L%5.3f R%5.3f voice%3.0f%% %s"%(t/fps,l*100,r*100,100*voice[s].mean(), 'L' if l>r*1.3 else ('R' if r>l*1.3 else '?')))
