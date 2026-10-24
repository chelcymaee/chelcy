#!/usr/bin/env bash
# One-time setup for the podcast reel pipeline (about 3 minutes). Usage: WORK=/path/to/workdir bash setup.sh
set -euo pipefail
WORK="${WORK:-$PWD/podwork}"; mkdir -p "$WORK"/{models,fonts,sfx,cut,frames}; cd "$WORK"
command -v uv >/dev/null || pip install -q uv
uv venv -q -p 3.11 venv311
uv pip install -q -p venv311 "mediapipe==0.10.14" "numpy<2" opencv-python-headless==4.10.0.84 \
  sherpa-onnx soundfile scipy pillow fonttools brotli "rembg[cpu]"
# Speech models (GitHub releases are reachable; Hugging Face is blocked)
R=https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models
for m in sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8 sherpa-onnx-whisper-small.en; do
  [ -d models/$m ] || curl -sSL "$R/$m.tar.bz2" | tar xj -C models
done
# Background-removal model
mkdir -p ~/.u2net
[ -f ~/.u2net/birefnet-general.onnx ] || curl -sSL -o ~/.u2net/birefnet-general.onnx \
  https://github.com/danielgatis/rembg/releases/download/v0.0.0/BiRefNet-general-epoch_244.onnx
# Caption font (npm registry is reachable)
for w in 800 900; do
  url=$(curl -s https://registry.npmjs.org/@fontsource/barlow-condensed/latest | python3 -c "import sys,json;print(json.load(sys.stdin)['dist']['tarball'])")
  curl -sSL "$url" | tar xz -C fonts --wildcards "*latin-$w-normal.woff2"
done
venv311/bin/python - <<'PY'
from fontTools.ttLib import TTFont; import glob
for f in glob.glob('fonts/package/files/*.woff2'):
    t=TTFont(f); t.flavor=None; t.save('fonts/'+f.split('/')[-1].replace('.woff2','.ttf'))
PY
echo "Ready in $WORK"
