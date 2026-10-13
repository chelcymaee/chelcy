# Align ElevenLabs ASR word times to the script; write vo_timing.json in the build's format.
import json, re, difflib, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
script = json.load(open('../vo5/script.json')); asr = json.load(open('asr.json'))
sw = [(ln, w) for ln, txt in script for w in txt.replace('|', ' ').split()]
norm = lambda w: re.sub(r"[^a-z]", '', w.lower())
a = [norm(w['w']) for w in asr]; s = [norm(w) for _, w in sw]
st = [None] * len(sw)
for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, s, a, autojunk=False).get_opcodes():
    if op in ('equal', 'replace'):
        for k in range(i1, i2):
            j = j1 + (k - i1) * max(1, j2 - j1) // max(1, i2 - i1); st[k] = asr[min(j, j2 - 1 if j2 > j1 else j1)]['s']
    if op != 'equal': print(op, [w for _, w in sw[i1:i2]], [w['w'] for w in asr[j1:j2]])
for k in range(len(st)):   # interpolate anything unmatched
    if st[k] is None: st[k] = st[k - 1] + 0.2
words = [dict(w=w, s=st[k], line=ln, cap=re.sub(r"[^\w'-]", '', w).upper().replace('BOO-KAAP', 'BO-KAAP')) for k, (ln, w) in enumerate(sw)]
end = {w['s']: w['e'] for w in asr}
spans = {}
for k, w in enumerate(words):
    e = end.get(w['s'], w['s'] + 0.4)
    spans.setdefault(w['line'], [w['s'], e]); spans[w['line']][1] = max(spans[w['line']][1], e)
total = max(v[1] for v in spans.values()) + 0.5
json.dump(dict(words=words, spans=spans, total=round(total, 3)), open('vo_timing.json', 'w'), indent=0)
print(spans, total)
