#!/bin/bash
# re-transform with heavier smoothing using the existing motion analysis
f=$1; n=$(basename $f .MOV); [ -s stab2/$n.mp4 ] && exit 0
ffmpeg -v error -y -i $f -vf "vidstabtransform=input=stab/$n.trf:smoothing=70:optzoom=1:zoomspeed=0.1:interpol=bicubic,unsharp=5:5:0.4" -an -c:v libx264 -crf 16 -preset fast -pix_fmt yuv420p stab2/$n.mp4
