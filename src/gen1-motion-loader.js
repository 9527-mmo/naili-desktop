/* Gen 1 motion pack. Optional: missing assets fall back to procedural Canvas. */
(function(){
 const allowed=new Set(['walk','run','turn']);
 const root='../characters/naili/gen1-motion/';
 async function load(){
  const res=await fetch(root+'manifest.json');
  if(!res.ok)throw Error('Gen 1 motion assets not installed');
  const manifest=await res.json();
  if(!Array.isArray(manifest.canvas)||manifest.canvas[0]!==128||manifest.canvas[1]!==128)throw Error('Unexpected Gen 1 canvas');
  const actions={};
  for(const [name,entry] of Object.entries(manifest.animations||{})){
   if(!allowed.has(name))continue;
   if(!Array.isArray(entry.frame_files)||entry.frame_files.length<2||entry.frame_files.length>32||!Number.isFinite(entry.duration_ms)||entry.duration_ms<=0)continue;
   if(!entry.frame_files.every(p=>typeof p==='string'&&/^(walk|run|turn)\/(walk|run|turn)_\d{3}\.png$/.test(p)&&p.startsWith(name+'/')))continue;
   const images=await Promise.all(entry.frame_files.map(async filename=>{
    const img=new Image();img.src=root+filename;await img.decode();return img;
   }));
   actions[name]={images,duration:entry.duration_ms,loop:entry.loop!==false};
  }
  if(!actions.walk||!actions.run||!actions.turn)throw Error('Incomplete Gen 1 motion pack');
  return {actions,version:manifest.version};
 }
 window.NailiGen1Motion={load};
})();