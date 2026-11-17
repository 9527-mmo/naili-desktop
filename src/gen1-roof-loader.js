/* Optional Gen1 roof sprite pack generated with scripts/generate_gen1_roof.py */
(function(){
 const allowed=new Set(['roofSit','roofLie','roofStretch','roofWake']);
 const root='../characters/naili/gen1-roof/';
 async function load(){
  const res=await fetch(root+'manifest.json');
  if(!res.ok)throw Error('Gen1 roof PNG frames not generated');
  const manifest=await res.json();
  if(manifest.canvas?.[0]!==128||manifest.canvas?.[1]!==128)throw Error('Invalid roof canvas');
  const actions={};
  for(const [name,entry] of Object.entries(manifest.animations||{})){
   if(!allowed.has(name))continue;
   if(!Array.isArray(entry.frame_files)||entry.frame_files.length<2||entry.frame_files.length>32||!Number.isFinite(entry.duration_ms)||entry.duration_ms<=0)continue;
   if(!entry.frame_files.every(p=>typeof p==='string'&&p.startsWith(name+'/')&&/^roof(?:Sit|Lie|Stretch|Wake)\/roof(?:Sit|Lie|Stretch|Wake)_\d{3}\.png$/.test(p)))continue;
   const images=await Promise.all(entry.frame_files.map(async p=>{const img=new Image();img.src=root+p;await img.decode();return img;}));
   if(images.some(img=>img.naturalWidth!==128||img.naturalHeight!==128))throw Error('Unexpected sprite size');
   actions[name]={images,duration:entry.duration_ms,loop:entry.loop===true};
  }
  if([...allowed].some(name=>!actions[name]))throw Error('Incomplete roof pack');
  return {actions,version:manifest.version};
 }
 window.NailiRoofMotion={load};
})();
