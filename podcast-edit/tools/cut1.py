import sys
from rembg import remove,new_session
from PIL import Image
f,n,out_dir=sys.argv[1:4]
im=Image.open(f).convert('RGB')
if n=='logo_49ers': im=im.crop((30,40,im.width-40,im.height-60))
o=remove(im,session=new_session('birefnet-general'),post_process_mask=True)
o=o.crop(o.getbbox()); o.save(f'{out_dir}/{n}.png'); print(n,o.size)
