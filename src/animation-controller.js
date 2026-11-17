/* Animation state machine, independent of character artwork. */
(function(){
 const definitions={
  idle:{duration:4000,loop:true},
  walk:{duration:600,loop:true},
  run:{duration:400,loop:true},
  feed:{duration:3600,loop:false},
  sleep:{duration:6500,loop:false},
  play:{duration:850,loop:false},
  pet:{duration:1600,loop:false},
  curious:{duration:1800,loop:false}
 };
 const clamp=x=>Math.min(1,Math.max(0,x));
 const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
 function create(){
   let current='idle',start=performance.now(),duration=definitions.idle.duration;
   return {
     enter(name,now=performance.now(),override){
       if(!definitions[name])name='idle';
       current=name;start=now;duration=override||definitions[name].duration;
       return duration;
     },
     sample(now=performance.now()){
       const def=definitions[current];
       const elapsed=Math.max(0,now-start);
       if(!def.loop&&elapsed>=duration){current='idle';start=now;duration=definitions.idle.duration;}
       const progress=(now-start)/duration;
       const phase=definitions[current].loop?progress%1:clamp(progress);
       const ease=smooth(phase);
       return {name:current,phase,ease,elapsed:now-start,duration};
     },
     get name(){return current;}
   };
 }
 window.NailiAnimation={create,definitions};
})();
