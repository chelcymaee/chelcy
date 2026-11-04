from PIL import Image,ImageDraw,ImageFont,ImageFilter
F='fonts/barlow-condensed-latin-900-normal.ttf'
def finish(img,name):
    a=img.split()[3]
    out=a.filter(ImageFilter.MaxFilter(23))           # white sticker border
    sh=out.filter(ImageFilter.GaussianBlur(10))
    W,H=img.size; base=Image.new('RGBA',(W,H),(0,0,0,0))
    shadow=Image.new('RGBA',(W,H),(0,0,0,110)); base.paste(shadow,(6,10),sh)
    white=Image.new('RGBA',(W,H),(255,255,255,255)); base.paste(white,(0,0),out)
    base.alpha_composite(img); base.save(name)
# football + banner
W,H=560,520; im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
fb=Image.new('RGBA',(W,H),(0,0,0,0)); g=ImageDraw.Draw(fb)
g.ellipse((70,60,490,300),fill=(140,74,38),outline=(40,20,10),width=10)
g.line((280,95,280,265),fill=(255,255,255),width=0)
for x in (150,410): g.arc((x-40,95,x+40,265),90 if x<280 else 270,270 if x<280 else 90,fill=(255,255,255),width=12)
g.line((205,180,355,180),fill=(255,255,255),width=12)
for x in range(225,345,30): g.line((x,158,x,202),fill=(255,255,255),width=10)
fb=fb.rotate(-18,resample=Image.BICUBIC,center=(280,180)); im.alpha_composite(fb)
d.rounded_rectangle((40,340,520,460),radius=26,fill=(49,198,232),outline=(20,20,20),width=8)
f=ImageFont.truetype(F,84); t="3 UNDEFEATED"; w=d.textlength(t,font=f)
d.text(((W-w)/2,345),t,font=f,fill=(255,255,255),stroke_width=5,stroke_fill=(20,20,20))
finish(im,'st_football.png')
# MVP trophy
W,H=460,560; im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
gold=(247,193,46); dk=(30,20,5)
d.arc((40,80,170,250),90,270,fill=dk,width=30); d.arc((40,80,170,250),90,270,fill=gold,width=18)
d.arc((290,80,420,250),270,90,fill=dk,width=30); d.arc((290,80,420,250),270,90,fill=gold,width=18)
d.pieslice((95,-120,365,330),0,180,fill=gold,outline=dk,width=8)
d.rectangle((95,60,365,105),fill=gold,outline=dk,width=8)
d.rectangle((205,325,255,400),fill=gold,outline=dk,width=8)
d.rounded_rectangle((120,395,340,450),radius=10,fill=gold,outline=dk,width=8)
d.rounded_rectangle((90,445,370,530),radius=14,fill=(25,25,25),outline=dk,width=6)
f=ImageFont.truetype(F,128); t="MVP"; w=d.textlength(t,font=f)
d.text(((W-w)/2,110),t,font=f,fill=(255,255,255),stroke_width=7,stroke_fill=dk)
finish(im,'st_mvp.png')
