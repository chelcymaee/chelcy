import subprocess,numpy as np,sys
f=sys.argv[1]; W,H=54,96
raw=subprocess.run(['ffmpeg','-v','error','-i',f,'-vf',f'scale={W}:{H},format=gray','-f','rawvideo','-'],capture_output=True).stdout
fr=np.frombuffer(raw,np.uint8).reshape(-1,H,W).astype(float); n=len(fr); fps=30000/1001
d=np.array([0]+[np.abs(fr[i]-fr[i-1]).mean() for i in range(1,n)])
skip=np.array([0,0]+[np.abs(fr[i]-fr[i-2]).mean() for i in range(2,n)])
cuts=[i for i in range(1,n) if d[i]>18]
print("frames",n,"cuts at:",[round(i/fps,2) for i in cuts])
# one/two-frame flashes: big change in and out, but frame i-1 ~ frame i+1 (or i+2)
for i in range(1,n-2):
    if d[i]>12 and d[i+1]>12 and np.abs(fr[i+1]-fr[i-1]).mean()<d[i]*0.6: print("FLASH 1f at %.3f (d %.0f/%.0f)"%(i/fps,d[i],d[i+1]))
    if d[i]>12 and d[i+2]>12 and np.abs(fr[i+2]-fr[i-1]).mean()<d[i]*0.6 and d[i+1]<8: print("FLASH 2f at %.3f"%(i/fps))
for a,b in zip(cuts,cuts[1:]):
    if (b-a)/fps<0.4: print("SHORT SHOT %.2f-%.2f (%.2fs)"%(a/fps,b/fps,(b-a)/fps))
