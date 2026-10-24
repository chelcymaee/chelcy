#!/bin/bash
# two-pass vidstab on one source clip -> stab/<name>.mp4 (portrait, original fps)
f=$1; n=$(basename $f .MOV); [ -s stab/$n.mp4 ] && exit 0
ffmpeg -v error -y -i $f -vf "vidstabdetect=shakiness=6:accuracy=12:result=stab/$n.trf" -f null - && \
ffmpeg -v error -y -i $f -vf "vidstabtransform=input=stab/$n.trf:smoothing=24:optzoom=1:zoomspeed=0.2:interpol=bicubic,unsharp=5:5:0.4" -an -c:v libx264 -crf 16 -preset fast -pix_fmt yuv420p stab/$n.mp4
