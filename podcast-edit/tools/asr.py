import sherpa_onnx,soundfile as sf,numpy as np,json,sys
d='models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8/'
rec=sherpa_onnx.OfflineRecognizer.from_transducer(encoder=d+'encoder.int8.onnx',decoder=d+'decoder.int8.onnx',joiner=d+'joiner.int8.onnx',tokens=d+'tokens.txt',model_type='nemo_transducer',num_threads=4)
a,sr=sf.read(sys.argv[1],dtype='float32')
# chunk at silences, max ~20s
cuts=[float(x) for x in sys.argv[3].split(',')] if len(sys.argv)>3 else []
bounds=[0]+[c for c in cuts]+[len(a)/sr]
words=[]
for s,e in zip(bounds[:-1],bounds[1:]):
    st=rec.create_stream(); st.accept_waveform(sr,a[int(s*sr):int(e*sr)]); rec.decode_stream(st); r=st.result
    toks,ts=r.tokens,r.timestamps
    cur=None
    for t,tm in zip(toks,ts):
        if t.startswith(' ') or cur is None:
            if cur: words.append(cur)
            cur=dict(w=t.strip(),s=round(s+tm,3))
        else: cur['w']+=t
    if cur: words.append(cur)
for i,w in enumerate(words):
    w['e']=round(min(words[i+1]['s'] if i+1<len(words) else w['s']+0.4, w['s']+0.9),3)
json.dump(words,open(sys.argv[2],'w'),indent=0)
print(" ".join(w['w'] for w in words))
