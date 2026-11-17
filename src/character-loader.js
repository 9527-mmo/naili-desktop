/* Character packs use data-only manifests; no executable code from packs. */
(function () {
  const required=['idle','walk','eat','sleep','play','pet'];
  const safePath=/^[a-zA-Z0-9_./-]+$/;
  function validate(manifest) {
    if(!manifest||typeof manifest!=='object'||!Array.isArray(manifest.characters))throw Error('Invalid character catalog');
    return manifest.characters.filter(c=>c&&typeof c.id==='string'&&/^[a-z0-9_-]+$/.test(c.id)&&typeof c.name==='string');
  }
  function validatePack(pack){
    if(!pack||!pack.actions||typeof pack.actions!=='object')throw Error('Invalid character pack');
    for(const name of required){
      const a=pack.actions[name];
      if(!a||!Array.isArray(a.frames)||a.frames.length===0||!Number.isFinite(a.fps)||a.fps<1||a.fps>60)throw Error('Missing/invalid action: '+name);
      if(!a.frames.every(p=>typeof p==='string'&&safePath.test(p)&&!p.startsWith('/')&&!p.includes('..')))throw Error('Unsafe frame path');
    }
    return pack;
  }
  async function load(id){
    if(!/^[a-z0-9_-]+$/.test(id))throw Error('Invalid character ID');
    const response=await fetch('../characters/'+id+'/manifest.json');
    if(!response.ok)throw Error('Pack not found: '+id);
    const pack=validatePack(await response.json());
    const actions={};
    for(const [name,a] of Object.entries(pack.actions)){
      if(!required.includes(name))continue;
      const images=await Promise.all(a.frames.map(async frame=>{
        const img=new Image();
        img.src='../characters/'+id+'/'+frame;
        await img.decode();
        return img;
      }));
      actions[name]={fps:a.fps,images};
    }
    return {id,name:pack.name||id,actions};
  }
  window.CharacterPacks={validate,validatePack,load};
})();
