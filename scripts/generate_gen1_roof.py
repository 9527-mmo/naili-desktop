#!/usr/bin/env python3
"""Generate original transparent 128x128 Gen1 roof sprites. Requires Pillow."""
from pathlib import Path
import json, math
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]/"characters"/"naili"/"gen1-roof"
COUNT={"roofSit":6,"roofLie":8,"roofStretch":8,"roofWake":6}
DURATION={"roofSit":1800,"roofLie":2600,"roofStretch":1250,"roofWake":950}
def draw_sprite(action,index,total):
    # Draw at 64px native resolution then upscale nearest-neighbor to 128px.
    im=Image.new("RGBA",(64,64))
    d=ImageDraw.Draw(im)
    t=index/max(1,total-1)
    breath=round(math.sin(t*math.pi*2)*1)
    lower=action=="roofLie" or action=="roofWake" and t<.55 or action=="roofStretch" and t<.25
    stretch=action=="roofStretch" and .2<t<.8
    y=34+(5 if lower else 0)+breath
    caramel="#c88b5c";light="#e5b587";dark="#9b603f";cream="#f5e3c6"
    # Tail same caramel as body, no white tip.
    d.ellipse((43,y+14,54,y+25),fill=caramel,outline=dark,width=1)
    d.ellipse((15,y+9,51,y+28 if lower else y+31),fill=caramel,outline=dark,width=1)
    d.ellipse((18,y+9,44,y+24),fill=light)
    d.ellipse((19,y+14,45,y+29),fill=cream)
    head_y=y-7 if stretch else y
    d.ellipse((15,head_y-12,42,head_y+15),fill=caramel,outline=dark,width=1)
    for x,tilt in ((21,-1),(34,1)):
        ear_top=head_y-31+(8 if lower else 0)
        d.ellipse((x-5+tilt,ear_top,x+5+tilt,head_y-8),fill=caramel,outline=dark,width=1)
        d.ellipse((x-2+tilt,ear_top+4,x+2+tilt,head_y-11),fill="#e7a4a2")
    # thin white forehead stripe, cream cheeks and thin ruff
    d.polygon([(28,head_y-11),(31,head_y-11),(32,head_y+2),(28,head_y+4)],fill="#fff0df")
    d.ellipse((14,head_y+1,25,head_y+12),fill=cream)
    d.ellipse((31,head_y+1,42,head_y+12),fill=cream)
    d.ellipse((23,head_y+6,35,head_y+14),fill="#fff2df")
    eyes_closed=action=="roofLie" or action=="roofWake" and t<.55
    if eyes_closed:
        d.line((21,head_y+3,25,head_y+4),fill="#4d3433",width=1)
        d.line((34,head_y+4,38,head_y+3),fill="#4d3433",width=1)
    else:
        d.rectangle((23,head_y+2,24,head_y+4),fill="#3a292b")
        d.rectangle((35,head_y+2,36,head_y+4),fill="#3a292b")
    d.rectangle((29,head_y+8,31,head_y+9),fill="#d58f96")
    d.ellipse((17,y+24,25,y+29),fill=light)
    d.ellipse((38,y+24,47,y+29),fill=light)
    return im.resize((128,128),Image.Resampling.NEAREST)

def main():
    animations={}
    for action,count in COUNT.items():
        directory=ROOT/action
        directory.mkdir(parents=True,exist_ok=True)
        names=[]
        for i in range(count):
            name=f"{action}_{i:03d}.png"
            draw_sprite(action,i,count).save(directory/name,optimize=True)
            names.append(f"{action}/{name}")
        animations[action]={"frame_files":names,"duration_ms":DURATION[action],"loop":action in ("roofSit","roofLie")}
    manifest={"version":"gen1-roof-1.2.0","canvas":[128,128],"animations":animations,
      "note":"Original generated placeholder pixel sprites; not derived by cropping the concept sheet."}
    (ROOT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Created",sum(COUNT.values()),"transparent PNG frames at",ROOT)
if __name__=="__main__":main()
