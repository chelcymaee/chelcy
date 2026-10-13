from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math
F9='../fonts/barlow-condensed-latin-900-normal.ttf'; F8='../fonts/barlow-condensed-latin-800-normal.ttf'
CY=(49,198,232); RED=(245,51,63); INK=(18,18,18); WH=(255,255,255); GRN=(43,190,90)
def font(s,b=True): return ImageFont.truetype(F9 if b else F8,s)
def shadow(im,blur=14,off=(6,10),a=120):
    W,H=im.size; p=30; out=Image.new('RGBA',(W+2*p,H+2*p),(0,0,0,0))
    sh=Image.new('RGBA',out.size,(0,0,0,a)); m=Image.new('L',out.size,0); m.paste(im.split()[3],(p+off[0],p+off[1]))
    out.paste(sh,(0,0),m.filter(ImageFilter.GaussianBlur(blur))); out.alpha_composite(im,(p,p)); return out
def label(top,main,name,accent=CY):   # bright sticker label: yellow (or accent) fill, black text, slight tilt
    YEL=(255,214,10); fill=YEL if accent==CY else accent; txtc=INK if fill==YEL or fill==(255,196,40) else WH
    f1,f2=font(46,False),font(80); d0=ImageDraw.Draw(Image.new('RGBA',(1,1)))
    w=int(max(d0.textlength(top,font=f1),d0.textlength(main,font=f2)))+70; H=176
    im=Image.new('RGBA',(w,H),(0,0,0,0)); d=ImageDraw.Draw(im)
    d.rounded_rectangle((0,0,w-1,H-1),radius=30,fill=fill,outline=INK,width=7)
    d.text((36,14),top,font=f1,fill=txtc); d.text((34,66),main,font=f2,fill=txtc)
    im=im.rotate(-2.5,expand=True,resample=Image.BICUBIC)
    a=im.split()[3].filter(ImageFilter.MaxFilter(17)); b=Image.new('RGBA',im.size,(0,0,0,0)); b.paste(Image.new('RGBA',im.size,WH),(0,0),a); b.alpha_composite(im)
    shadow(b).save(f'g/{name}.png')
def stamp(text,name,col=RED,rot=-8,size=120):
    f=font(size); d0=ImageDraw.Draw(Image.new('RGBA',(1,1))); w=int(d0.textlength(text,font=f))+80+(130 if text=='SECURE' else 0); h=size+70
    im=Image.new('RGBA',(w,h),(0,0,0,0)); d=ImageDraw.Draw(im)
    d.rounded_rectangle((6,6,w-6,h-6),radius=18,outline=col,width=12); d.text((40,22),text,font=f,fill=col)
    im=im.rotate(rot,expand=True,resample=Image.BICUBIC); shadow(im,8,(3,5),90).save(f'g/{name}.png')
def card(lines,name,w=880,title=None,checks=None):
    rows=len(lines); H=(140 if title else 50)+rows*104+30
    im=Image.new('RGBA',(w,H),(0,0,0,0)); d=ImageDraw.Draw(im)
    d.rounded_rectangle((0,0,w-1,H-1),radius=34,fill=WH,outline=INK,width=6); y=30
    if title: d.text((40,24),title,font=font(80),fill=INK); y=130
    for i,t in enumerate(lines):
        mark=checks[i] if checks else None
        d.text((40,y),t,font=font(72,False),fill=INK if mark!='x' else RED)
        if mark=='v': d.line([(w-120,y+48),(w-95,y+75),(w-45,y+15)],fill=GRN,width=16,joint='curve')
        if mark=='x': d.line([(w-115,y+15),(w-55,y+75)],fill=RED,width=16); d.line([(w-55,y+15),(w-115,y+75)],fill=RED,width=16)
        y+=104
    shadow(im).save(f'g/{name}.png')
label('FIELD NOTES · LOCATION','CAPE TOWN','lab_location')
label('VEHICLE OF OBSERVATION','FORD RAPTOR (THE RAPPY TAPPY)','lab_vehicle')
label('STANDARD ISSUE','DIGITAL NOMAD + PODCAST','lab_nomad')
label('SPECIMEN #1','THE SUITCASE DRAGGER','lab_specimen',accent=RED)
items=['RESCUE DOG','ICED MATCHA','MATCHING ACTIVEWEAR','SUITCASE']
for n in range(1,5): card(items,f'pack{n}',title='LOCAL PROM STARTER PACK',checks=(['v','v','v','x'][:n]+[None]*(4-n)))
# speech bubble
f=font(70); txt=['"DID YOU DO LION\'S HEAD','THIS MORNING?"']; w=860; H=230
im=Image.new('RGBA',(w,H+60),(0,0,0,0)); d=ImageDraw.Draw(im)
d.rounded_rectangle((0,0,w-1,H),radius=60,fill=WH,outline=INK,width=6); d.polygon([(140,H-4),(110,H+56),(220,H-4)],fill=WH,outline=INK)
d.line([(143,H-3),(217,H-3)],fill=WH,width=10)
for i,t in enumerate(txt): tw=d.textlength(t,font=f); d.text(((w-tw)/2,28+i*88),t,font=f,fill=INK)
shadow(im).save('g/bubble.png')
label('LOCAL CUSTOM','LION\'S HEAD AT SUNRISE','lab_lionshead')
stamp('DAILY.','st_daily',RED,-6,150)
label('LOCAL TERMINOLOGY','"A QUICK TASTING"','lab_tasting')
stamp('EST. DURATION: 6 HRS','st_6hrs',RED,-5,100)
stamp('NOT INVITED','st_notinvited',RED,-7,130)
label('WEATHER ALERT','SOUTHEASTER: OPINIONATED','lab_wind',accent=(255,196,40))
card(['CHECKOUT   10:00','FLIGHT       21:00'],'boarding',w=760,title='TODAY\'S ITINERARY')
stamp('NOW NOW = THURSDAY?','st_nownow',RED,-5,96)
stamp('SECURE','st_secure',GRN,-6,130)
stamp('PRACTICALLY A LOCAL','st_local',CY,-5,100)
# matcha cup sticker
im=Image.new('RGBA',(300,380),(0,0,0,0)); d=ImageDraw.Draw(im)
d.polygon([(50,90),(250,90),(225,350),(75,350)],fill=(150,200,110),outline=INK); d.line([(50,90),(250,90),(225,350),(75,350),(50,90)],fill=INK,width=8)
d.rounded_rectangle((35,60,265,100),radius=14,fill=WH,outline=INK,width=8); d.line([(170,10),(150,70)],fill=INK,width=14)
d.rectangle((78,178,222,236),fill=WH); d.text((88,180),'MATCHA',font=font(46),fill=INK)
a=im.split()[3].filter(ImageFilter.MaxFilter(21)); b=Image.new('RGBA',im.size,(0,0,0,0)); b.paste(Image.new('RGBA',im.size,WH),(0,0),a); b.alpha_composite(im); shadow(b).save('g/matcha.png')
im=Image.open('g/st_secure.png'); d=ImageDraw.Draw(im); W,H=im.size
d.line([(W-175,H//2+5),(W-140,H//2+40),(W-75,H//2-45)],fill=GRN,width=22,joint='curve'); im.save('g/st_secure.png')
print('ok')
