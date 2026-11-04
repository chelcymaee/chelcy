# Turn cutouts into stickers: fit to a box (downscale only), white border, soft shadow
import sys
from PIL import Image,ImageFilter,ImageDraw
def sticker(src,dst,box,border=14,card=False):
    im=Image.open(src).convert('RGBA')
    if card:  # rounded photo card
        im.thumbnail(box,Image.LANCZOS); m=Image.new('L',im.size,0)
        ImageDraw.Draw(m).rounded_rectangle((0,0,im.width-1,im.height-1),radius=28,fill=255); im.putalpha(m)
    else:
        s=min(box[0]/im.width,box[1]/im.height,1.0)
        if s<1: im=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
    p=border*2+16; W,H=im.width+2*p,im.height+2*p
    a=Image.new('L',(W,H),0); a.paste(im.split()[3],(p,p))
    out_a=a.filter(ImageFilter.MaxFilter(border*2+1)).filter(ImageFilter.GaussianBlur(1))
    base=Image.new('RGBA',(W,H),(0,0,0,0))
    base.paste(Image.new('RGBA',(W,H),(0,0,0,120)),(5,9),out_a.filter(ImageFilter.GaussianBlur(9)))
    base.paste(Image.new('RGBA',(W,H),(255,255,255,255)),(0,0),out_a)
    base.alpha_composite(im,(p,p)); base.save(dst); print(dst,base.size)
C='cut/'
for n,box in [('walker',(560,520)),('murray',(420,560)),('jefferson',(440,560)),('mason',(520,420)),('purdy',(400,560))]:
    sticker(C+n+'.png',C+'st_'+n+'.png',box)
for n in ['logo_chiefs','logo_vikings','logo_49ers','logo_rams']:
    sticker(C+n+'.png',C+'st_'+n+'.png',(400,330),border=10)
sticker(C+'broncos_team_src.png',C+'st_broncos.png',(640,420),border=12,card=True)
