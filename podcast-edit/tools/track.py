import cv2, mediapipe as mp, numpy as np, json, sys
cap=cv2.VideoCapture(sys.argv[1]); fm=mp.solutions.face_mesh.FaceMesh(max_num_faces=2,refine_landmarks=False,min_detection_confidence=0.4,min_tracking_confidence=0.4)
W=int(cap.get(3));H=int(cap.get(4));out=[];n=0
while True:
    ok,f=cap.read()
    if not ok: break
    r=fm.process(cv2.cvtColor(f,cv2.COLOR_BGR2RGB)); faces=[]
    for lm in (r.multi_face_landmarks or []):
        p=np.array([[l.x*W,l.y*H] for l in lm.landmark])
        x0,y0=p.min(0);x1,y1=p.max(0); fh=np.linalg.norm(p[10]-p[152])
        mouth=np.linalg.norm(p[13]-p[14])/fh; mw=np.linalg.norm(p[78]-p[308])/fh
        faces.append(dict(cx=float((x0+x1)/2),cy=float((y0+y1)/2),w=float(x1-x0),h=float(y1-y0),m=float(mouth),mw=float(mw)))
    out.append(faces); n+=1
json.dump(dict(W=W,H=H,frames=out),open(sys.argv[2],'w'))
print(n,"frames")
