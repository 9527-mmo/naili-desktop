/* Time-based behavior controller. Independent of art packs and refresh rate. */
(function(){
 const definitions={
 idle:{duration:4400,loop:true,priority:0},
 walk:{duration:720,loop:true,priority:1},
 run:{duration:600,loop:true,priority:1},
 turn:{duration:960,loop:false,priority:2},
 feed:{duration:4200,loop:false,priority:3},
 sleep:{duration:9000,loop:false,priority:2},
 roofSit:{duration:1800,loop:true,priority:1},
 roofLie:{duration:2600,loop:true,priority:1},
 roofStretch:{duration:1250,loop:false,priority:3},
 roofWake:{duration:950,loop:false,priority:3},
 play:{duration:1800,loop:false,priority:3},
 pet:{duration:2000,loop:false,priority:3},
 curious:{duration:2300,loop:false,priority:2},
 toilet:{duration:8500,loop:false,priority:4},
 sniff:{duration:850,loop:false,priority:4},
 grab:{duration:1000,loop:false,priority:4},
 carry:{duration:750,loop:true,priority:4},
 chew:{duration:4500,loop:false,priority:4},
 groom:{duration:2600,loop:false,priority:2}
 };
 const clamp=x=>Math.min(1,Math.max(0,x));
 const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
 function create(){
   let current='idle',start=performance.now(),duration=definitions.idle.duration;
   let transition={from:'idle',start,ms:0}, lastEnd=start;
   function enter(name,now=performance.now(),override,force=false){
     if(!definitions[name])return false;
     if(name===current)return false;
     const currentDef=definitions[current];
     if(!force&&!currentDef.loop&&now-start<duration&&definitions[name].priority<=currentDef.priority)return false;
     if(!force&&name==='idle'&&now-start<Math.min(duration,650))return false;
     const from=current;current=name;start=now;duration=override||definitions[name].duration;
     transition={from,start:now,ms:from==='idle'||name==='idle'?340:240};
     return true;
   }
   return {
     enter,
     sample(now=performance.now()){
       if(!definitions[current].loop&&now-start>=duration){
         lastEnd=now;enter('idle',now,undefined,true);
       }
       const elapsed=Math.max(0,now-start),def=definitions[current];
       const phase=def.loop?(elapsed/duration)%1:clamp(elapsed/duration);
       const blend=transition.ms?smooth((now-transition.start)/transition.ms):1;
       return {name:current,phase,ease:smooth(phase),elapsed,duration,
         from:transition.from,blend,transitioning:blend<1};
     },
     get name(){return current;},
     get locked(){return !definitions[current].loop;}
   };
 }
 window.NailiAnimation={create,definitions};
})();
