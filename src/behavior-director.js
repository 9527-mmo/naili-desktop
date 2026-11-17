/* Natural behavior scheduler: pure timing decisions, no artwork dependency. */
(function(){
 const ranges={
  idle:[4500,10500],curious:[1400,2600],pet:[1500,2200],
  play:[1800,3100],sleep:[9000,18000],feed:[3200,5000]
 };
 const minDwell={idle:3200,curious:1300,pet:1400,play:1700,sleep:7000,feed:3000};
 const rand=(a,b)=>a+Math.random()*(b-a);
 const pick=items=>{let r=Math.random()*items.reduce((s,v)=>s+v[1],0);for(const [name,weight] of items){r-=weight;if(r<=0)return name;}return items[items.length-1][0];};
 function create(){
  let mode='idle',since=performance.now(),until=since+rand(...ranges.idle),last='idle',manualUntil=0;
  let moving=false,stableSince=since;
  return {
   request(name,now=performance.now(),duration){
    if(!ranges[name])return false;
    if(now-since<minDwell[mode]&&now<manualUntil)return false;
    last=mode;mode=name;since=now;until=now+(duration||rand(...ranges[name]));
    manualUntil=until+2500;
    return true;
   },
   setMoving(value,now=performance.now()){
    if(moving!==value){moving=value;stableSince=now;}
   },
   tick(now=performance.now()){
    if(moving)return {mode:'walk',changed:false,progress:0};
    if(now<until||now<manualUntil||now-stableSince<1000)return {mode,changed:false,progress:Math.min(1,(now-since)/Math.max(1,until-since))};
    const options=[['idle',6],['curious',3],['pet',1],['play',1],['sleep',.65]];
    let next=pick(options);
    if(next===last&&next!=='idle')next='idle';
    last=mode;mode=next;since=now;until=now+rand(...ranges[mode]);
    return {mode,changed:true,progress:0};
   },
   get mode(){return mode;}
  };
 }
 window.NailiBehavior={create,ranges,minDwell};
})();
