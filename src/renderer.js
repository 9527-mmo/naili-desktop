/* Procedural animation prototype: all drawing is original canvas artwork. */
const canvas=document.getElementById('pet'),ctx=canvas.getContext('2d');
const status=document.getElementById('status');
let activeCharacter=null;
let gen1Motion=null;
let gen1RoofMotion=null;
window.NailiRoofMotion?.load().then(pack=>{gen1RoofMotion=pack;console.info('Gen1 roof PNG frames loaded');}).catch(e=>console.info('Gen1 roof Canvas fallback:',e.message));
window.NailiGen1Motion?.load().then(pack=>{gen1Motion=pack;console.info('Gen 1 motion frames ready:',Object.keys(pack.actions));}).catch(e=>console.info('Gen 1 motion fallback:',e.message));
window.CharacterPacks?.load('naili').then(pack=>{activeCharacter=pack;}).catch(()=>{console.info('Character PNGs pending; using Canvas prototype.');});
const state={mode:'idle',until:0,blink:0,feedCount:0,drag:null,mouse:{x:360,y:350},last:performance.now(),food:0,reduceMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches};
function say(s){status.textContent=s;status.classList.add('show');clearTimeout(say.timer);say.timer=setTimeout(()=>status.classList.remove('show'),1800);}
const timeline=window.NailiAnimation.create();
const foods=['hay','orchard','alfalfa','pellet','carrot','leaf','apple','herb'];
const foodLabels={hay:'提摩西草',orchard:'果园草',alfalfa:'苜蓿草',pellet:'兔粮',carrot:'胡萝卜',leaf:'叶菜',apple:'苹果',herb:'香草'};
const foodChoice=document.getElementById('food-choice');
const activeFeedToggle=document.getElementById('active-feed-toggle');
const feedMenu=document.getElementById('feed-menu');
const feedMenuChoice=document.getElementById('feed-menu-choice');
let feedPoint=null,feedEnd=0,feedStage='',feedStageStart=0;
activeFeedToggle.addEventListener('change',async()=>{
 try{const v=await window.naili.setSettings({activeFeed:activeFeedToggle.checked});activeFeedToggle.checked=v.activeFeed;}
 catch{activeFeedToggle.checked=!activeFeedToggle.checked;say('主动投喂设置失败');}
});
window.naili?.getSettings().then(v=>{activeFeedToggle.checked=v.activeFeed;}).catch(console.warn);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
let lastRightClick=0;
canvas.addEventListener('pointerdown',e=>{
 if(e.button!==2)return;
 const now=performance.now();
 if(activeFeedToggle.checked&&now-lastRightClick<420){
  feedPoint={x:e.screenX,y:e.screenY};
  feedMenuChoice.value=foodChoice.value;feedMenu.hidden=false;
  lastRightClick=0;
 }else lastRightClick=now;
});
document.getElementById('feed-cancel').addEventListener('click',()=>{feedMenu.hidden=true;});
document.getElementById('feed-confirm').addEventListener('click',async()=>{
 if(!feedPoint)return;
 const food=feedMenuChoice.value;
 try{
  const result=await window.naili.startActiveFeed(food,feedPoint);
  if(!result.ok){say('奶栗暂时忙着呢');return;}
  foodChoice.value=food;state.food=Math.max(0,foods.indexOf(food));feedMenu.hidden=true;
 }catch{say('投喂启动失败');}
});
window.naili?.onFeedStage((stage,food)=>{
 feedStage=stage;feedStageStart=performance.now();state.food=Math.max(0,foods.indexOf(food));
 const now=performance.now();
 if(stage==='chase'){timeline.enter('run',now,undefined,true);say('发现食物！');}
 else if(stage==='grab'){timeline.enter('grab',now,1000,true);say('叼到了！带回去吃');}
 else if(stage==='carry'){timeline.enter('carry',now,undefined,true);}
 else if(stage==='cancel'){feedEnd=0;feedStage='';timeline.enter('idle',now,undefined,true);say('下次再吃吧');}
 else if(stage==='eat'){timeline.enter('chew',now,4500,true);feedEnd=now+4500;say('咔嚓咔嚓～');}
});

const toiletToggle=document.getElementById('toilet-toggle');
const toiletStatus=document.getElementById('toilet-status');
const setToiletButton=document.getElementById('set-toilet');
function renderToiletSettings(v){
 toiletToggle.checked=v.toiletEnabled;
 toiletStatus.textContent=v.toiletPosition?'厕所位置已保存（可拖动奶栗后重新设置）':'尚未设置厕所位置';
}
toiletToggle.addEventListener('change',async()=>{
 if(toiletToggle.checked&&!toiletStatus.dataset.saved){
  const current=await window.naili.getSettings();
  if(!current.toiletPosition){toiletToggle.checked=false;say('请先设置厕所位置');return;}
 }
 try{renderToiletSettings(await window.naili.setSettings({toiletEnabled:toiletToggle.checked}));}
 catch{toiletToggle.checked=!toiletToggle.checked;say('设置失败');}
});
setToiletButton.addEventListener('click',async()=>{
 try{const v=await window.naili.setToiletHere();renderToiletSettings(v);say('厕所位置记住啦！');}
 catch{say('厕所位置保存失败');}
});
window.naili?.getSettings().then(renderToiletSettings).catch(console.warn);
let toiletEnd=0;
window.naili?.onToilet(duration=>{
 const now=performance.now();toiletEnd=now+duration;
 timeline.enter('toilet',now,duration,true);say('奶栗去上厕所啦');
});

const panelToggle=document.getElementById('panel-toggle');
panelToggle.addEventListener('change',async()=>{try{const v=await window.naili.setSettings({panelVisible:panelToggle.checked});panelToggle.checked=v.panelVisible;}catch{panelToggle.checked=!panelToggle.checked;}});
const settingsPanel=document.getElementById('settings');
const followToggle=document.getElementById('follow-toggle');
const followDescription=document.getElementById('follow-description');
document.getElementById('settings-toggle').addEventListener('click',()=>{
  settingsPanel.hidden=!settingsPanel.hidden;
  document.getElementById('settings-toggle').setAttribute('aria-expanded',String(!settingsPanel.hidden));
});
const fullScreenToggle=document.getElementById('fullscreen-toggle');
const scaleSlider=document.getElementById('scale-slider'),scaleValue=document.getElementById('scale-value');
const delaySlider=document.getElementById('delay-slider'),delayValue=document.getElementById('delay-value');
function applySettings(v){
  followToggle.checked=v.follow;fullScreenToggle.checked=v.fullScreen;panelToggle.checked=v.panelVisible;
  scaleSlider.value=v.scale;scaleValue.value=v.scale+'%';scaleValue.textContent=v.scale+'%';
  delaySlider.value=v.followDelay;delayValue.value=v.followDelay+' ms';delayValue.textContent=v.followDelay+' ms';
  followDescription.textContent=v.follow?'奶栗会保持距离跟随鼠标':'奶栗会在允许区域内随机探索';
}
window.naili?.getSettings().then(applySettings).catch(console.warn);
async function updateSetting(patch){
 try{applySettings(await window.naili.setSettings(patch));}
 catch(e){say('设置保存失败');const old=await window.naili.getSettings();applySettings(old);}
}
followToggle.addEventListener('change',()=>updateSetting({follow:followToggle.checked}));
fullScreenToggle.addEventListener('change',()=>updateSetting({fullScreen:fullScreenToggle.checked}));
scaleSlider.addEventListener('input',()=>{scaleValue.textContent=scaleSlider.value+'%';});
delaySlider.addEventListener('input',()=>{delayValue.textContent=delaySlider.value+' ms';});
scaleSlider.addEventListener('change',()=>updateSetting({scale:Number(scaleSlider.value)}));
delaySlider.addEventListener('change',()=>updateSetting({followDelay:Number(delaySlider.value)}));
let walking=false,motionChanged=performance.now(),lastWalkStart=0;
let roofState='away',roofRestStart=0,roofLastNap=0,roofPose='none',roofPoseUntil=0;
window.naili?.onHomeState(value=>{
 if(!['away','returning','resting'].includes(value))return;
 if(roofState!==value){
  const previous=roofState;roofState=value;
  if(value==='resting'){roofRestStart=performance.now();roofPose='sit';roofPoseUntil=roofRestStart+3300;}
  else {roofPose='none';roofPoseUntil=0;if(previous==='resting'&&timeline.name!=='roofWake'&&timeline.name!=='walk')timeline.enter('roofWake',performance.now(),850,true);}
 }
});
window.naili?.onMotion(value=>{if(walking!==value){walking=value;motionChanged=performance.now();}});
const behavior=window.NailiBehavior.create();
let lastManual=0;
function ambient(now){
 behavior.setMoving(walking||Boolean(state.drag),now);
 if(now-lastManual<5000||state.drag||walking||feedStage||toiletEnd||timeline.name==='toilet')return;
 const decision=behavior.tick(now);
 if(decision.changed&&decision.mode!=='idle')timeline.enter(decision.mode,now);
}
function action(mode,duration=2400){roofPose='none';roofPoseUntil=performance.now()+duration+1800;lastManual=performance.now();behavior.request(mode,lastManual,duration);if(mode==='feed'||mode==='chew'){state.food=Math.max(0,foods.indexOf(foodChoice.value));state.feedCount++;}state.mode=mode;state.until=performance.now()+duration;timeline.enter(mode,performance.now(),duration);say(({feed:'咔嚓！今天吃'+foodLabels[foods[state.food]]+'！',pet:'呼噜～好舒服',sleep:'Zzz…',play:'蹦蹦跳跳！'})[mode]);}
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.action;if(a==='quit')window.naili?.quit();else action(a,a==='sleep'?6500:3000);}));
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;if(roofState==='resting'&&['roofSit','roofLie','sleep'].includes(timeline.name)){roofPose='none';roofPoseUntil=performance.now()+4500;timeline.enter('roofWake',performance.now(),950,true);}state.drag={x:e.screenX,y:e.screenY,moved:false};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{const d=state.drag;if(d){const x=e.screenX-d.x,y=e.screenY-d.y;if(Math.abs(x)+Math.abs(y)>2){window.naili?.drag(x,y);d.moved=true;}d.x=e.screenX;d.y=e.screenY;}const r=canvas.getBoundingClientRect();state.mouse={x:(e.clientX-r.left)*2,y:(e.clientY-r.top)*2};});
canvas.addEventListener('pointerup',()=>{if(state.drag&&!state.drag.moved)action('pet',1800);state.drag=null;});
canvas.addEventListener('dblclick',()=>action('feed',3200));
// Manual visual QA: settings > motion test buttons (no system movement).
document.querySelectorAll('[data-motion-test]').forEach(button=>button.addEventListener('click',()=>{
 const name=button.dataset.motionTest;
 timeline.enter(name,performance.now(),undefined,true);
 say(({walk:'测试行走帧',run:'测试奔跑帧',turn:'测试转身帧'})[name]);
}));
function ellipse(x,y,rx,ry,fill,rot=0){ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
function path(points,fill){ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
function gradient(x,y,r,inner,outer){const g=ctx.createRadialGradient(x-r*.3,y-r*.3,r*.05,x,y,r);g.addColorStop(0,inner);g.addColorStop(1,outer);return g;}
function ear(x,y,angle,wiggle){ctx.save();ctx.translate(x,y);ctx.rotate(angle+wiggle);ellipse(0,-112,42,132,gradient(0,-110,130,'#e9bb87','#a56b43'));ellipse(0,-116,22,99,'#e6a6a2');ellipse(0,-126,12,77,'#f4c8bb');ctx.restore();}
function draw(t){
  const motion=timeline.sample(t);
  state.mode=motion.name;
  if(state.reportedMode!==motion.name){state.reportedMode=motion.name;window.naili?.activity(motion.name);}
  ctx.clearRect(0,0,720,780);
  const gen1Action=gen1RoofMotion?.actions[state.mode]||gen1Motion?.actions[state.mode];
  if(gen1Action){
    const index=Math.floor((motion.elapsed%gen1Action.duration)/gen1Action.duration*gen1Action.images.length)%gen1Action.images.length;
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(gen1Action.images[index],56,72,608,608);
    return;
  }
  if(activeCharacter&&activeCharacter.actions[state.mode]){
    const action=activeCharacter.actions[state.mode];
    const index=Math.min(action.images.length-1,Math.floor(motion.phase*action.images.length));
    ctx.drawImage(action.images[index],0,0,720,780);
    return;
  }
  const mode=state.mode;
  const gait=(mode==='walk'||mode==='run'||mode==='carry')?Math.sin(motion.phase*Math.PI*(mode==='run'?6:4)):0;
  const bounce=state.reduceMotion?0:(mode==='play'?Math.abs(Math.sin(t*.009))*40:mode==='run'?Math.abs(gait)*18:mode==='walk'||mode==='carry'?Math.abs(gait)*7:Math.sin(t*.0028)*5);
  const eating=mode==='feed'||mode==='chew';
  const eatPhase=eating?motion.phase:0;
  const biteActive=eating&&eatPhase>.20&&eatPhase<.88;
  const chew=state.reduceMotion?0:(biteActive?Math.sin(t*.025)*7:0);
  const sleepy=mode==='sleep'||mode==='roofLie';
  const sniffing=mode==='sniff'||mode==='grab';
  const carrying=mode==='carry'||(feedStage==='grab'&&mode!=='grab');
  const wag=state.reduceMotion?0:Math.sin(t*.004)*.045;
  const bow=mode==='grab'?Math.sin(Math.min(1,motion.phase)*Math.PI)*24:eating&&eatPhase<.22?Math.sin(eatPhase/.22*Math.PI)*13:0;
  const bodySquash=mode==='toilet'?1-.075*Math.sin(Math.PI*Math.min(1,motion.phase)):1;
  ctx.save();ctx.translate(0,-bounce);
  // Transitional Canvas poses until approved transparent Gen1 PNG frames are exported.
  if(['roofSit','roofLie','roofStretch','roofWake'].includes(mode)){
   const p=motion.ease;
   const lower=mode==='roofLie'?0.24:mode==='roofSit'?0.10:mode==='roofStretch'?0.08*Math.sin(p*Math.PI):0.14*(1-p);
   ctx.translate(360,690);ctx.scale(1+lower*.35,1-lower);ctx.translate(-360,-690);
  }
  ctx.translate(360,610);ctx.scale(1,bodySquash);ctx.translate(-360,-610);
  ellipse(358,688+bounce,175,23,'#735a4530');
  // warm caramel body, matching-color tail, cream ruff and fluffy cheeks
  ellipse(360,520,174,160,gradient(365,505,205,'#e5b887','#b78052'));
  ellipse(507,550,52,57,gradient(507,540,62,'#d8a371','#b78052'));
  ellipse(276,635+(state.reduceMotion?0:gait*9),75,42,'#d8a576');ellipse(452,635-(state.reduceMotion?0:gait*9),75,42,'#d8a576');
  ellipse(362,496,154,132,gradient(362,455,175,'#fff4df','#e7c8a5'));
  ear(288,291,-.14,wag+(mode==='grab'?.12:0));ear(438,292,.16,-wag-(mode==='grab'?.12:0));
  ellipse(360,371+bow,181,159,gradient(350,330,195,'#efc596','#b67c50'));
  // subtle forehead white blaze
  ellipse(360,304+bow,32,83,gradient(360,310,90,'#fffaf0','#f5e5cd'));
  ellipse(238,434+bow,84,87,gradient(238,415,100,'#f6dfbc','#d5a477'));
  ellipse(481,434+bow,84,87,gradient(481,415,100,'#f6dfbc','#d5a477'));
  const eyeY=391+bow;
  if(sleepy||(mode==='toilet'&&motion.phase>.25&&motion.phase<.8)||Math.sin(t*.0015)> .995){ctx.strokeStyle='#563c32';ctx.lineWidth=8;ctx.lineCap='round';for(const x of [295,426]){ctx.beginPath();ctx.moveTo(x-16,eyeY);ctx.quadraticCurveTo(x,eyeY+11,x+16,eyeY);ctx.stroke();}}
  else {for(const x of [295,426]){ellipse(x,eyeY,13,19,'#352b29');ellipse(x-4,eyeY-6,4,6,'#fffaf2');}}
  ellipse(360,445+bow,65,49,'#fff4e7');ellipse(339,455+bow,36,27,'#fff8ef');ellipse(382,455+bow,36,27,'#fff8ef');
  ellipse(360,433+bow+(sniffing?Math.sin(t*.026)*5:0),13,9,'#ba7f7a');
  ctx.strokeStyle='#845b4e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(360,441+bow);ctx.lineTo(360,451+bow);ctx.quadraticCurveTo(348,466+bow,339,452+bow);ctx.moveTo(360,451+bow);ctx.quadraticCurveTo(372,466+bow,382,452+bow);ctx.stroke();
  if(mode==='toilet'){
    const p=motion.phase;
    // Settle -> focused posture -> effort -> relieved expression -> cleanup.
    ellipse(360,660,148,26,'#c6b9a65c');
    if(p>.20&&p<.78){ctx.font='bold 34px sans-serif';ctx.fillStyle='#8a6d59';ctx.fillText(p<.55?'···':'!',500,310);}
    if(p>.78){ctx.font='bold 27px sans-serif';ctx.fillStyle='#d38e95';ctx.fillText('♡',494,320);}
  }
  if(mode==='feed'||mode==='chew'||carrying){
    ctx.save();ctx.translate(carrying?360:405,carrying?470:505+chew);ctx.rotate(carrying?0:-.4);if(carrying)ctx.scale(.55,.55);else if(eating)ctx.scale(1-Math.max(0,eatPhase-.18)*.33,1-Math.max(0,eatPhase-.18)*.33);
    const food=foods[state.food];
    if(food==='carrot'){path([[0,0],[29,-15],[24,70],[12,93],[-2,68]],'#f68b32');path([[8,-4],[-10,-32],[15,-19],[23,-45],[29,-12]],'#6ba75c');}
    else if(food==='leaf'){ellipse(12,22,29,57,'#78b96b',-.35);ctx.strokeStyle='#438a43';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(6,70);ctx.lineTo(17,-19);ctx.stroke();}
    else if(food==='apple'){ellipse(13,35,37,36,'#db5551');ellipse(23,28,15,20,'#ef7770');path([[10,0],[16,-27],[22,0]],'#6c8345');ellipse(28,-10,17,8,'#78a85b',-.4);}
    else if(food==='pellet'){ellipse(14,55,55,21,'#aa7654');ellipse(14,47,45,15,'#f5e4c9');for(let i=0;i<11;i++)ellipse(-20+(i%5)*17,38+Math.floor(i/5)*10,7,5,'#977447');}
    else {for(let i=0;i<7;i++){ctx.strokeStyle=food==='alfalfa'?'#75a55d':food==='herb'?'#5f9950':i%2?'#bca35d':'#d5ba70';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-20+i*9,65);ctx.quadraticCurveTo(12+i*2,17,-10+i*8,-35);ctx.stroke();}}
    ctx.restore();
  }
  if(eating&&eatPhase>.89){ctx.save();ellipse(372,466,11,7,'#df9398');ctx.restore();}
  if(mode==='grab'){ctx.save();ctx.globalAlpha=.75;ctx.font='bold 36px sans-serif';ctx.fillStyle='#b17c54';ctx.fillText('!',495,305);ctx.restore();}
  if(mode==='groom'){ctx.save();ctx.globalAlpha=.85;ellipse(315+Math.sin(t*.014)*10,465,26,18,'#d8a576');ctx.restore();}
  if(mode==='pet'){for(let i=0;i<3;i++){ctx.globalAlpha=.65;ellipse(475+i*22,267-i*20,7,12,'#f4a4ad',-.3);}ctx.globalAlpha=1;}
  if(sleepy){ctx.font='bold 28px sans-serif';ctx.fillStyle='#aa8fbd';ctx.fillText('Z z z',500,255);}
  ctx.restore();
}
function frame(now){
 if(feedEnd&&now>=feedEnd){feedEnd=0;feedStage='';window.naili?.finishActiveFeed();}
 if(toiletEnd&&now>=toiletEnd){toiletEnd=0;window.naili?.toiletFinished();}
 if(feedStage==='grab'&&now-feedStageStart>1050&&timeline.name==='grab')timeline.enter('carry',now,undefined,true);
 if(!timeline.locked&&!state.drag&&!feedStage){
  if(walking&&now-motionChanged>180&&timeline.name!=='walk'){if(timeline.enter('walk',now))lastWalkStart=now;}
  else if(!walking&&timeline.name==='walk'&&now-motionChanged>500&&now-lastWalkStart>850){
   timeline.enter('idle',now,undefined,true);lastManual=Math.max(lastManual,now-2800);
  }
 }
 const roofCanRest=roofState==='resting'&&!walking&&!feedStage&&!state.drag&&!toiletEnd&&now-lastManual>4500;
 if(roofCanRest){
  if(roofPose==='none'&&now>=roofPoseUntil){roofPose='sit';roofPoseUntil=now+3000;timeline.enter('roofSit',now,undefined,true);}
  else if(now>=roofPoseUntil&&roofPose==='sit'){
   roofPose='lie';roofPoseUntil=now+6500;
   timeline.enter('roofLie',now,undefined,true);
  }else if(now>=roofPoseUntil&&roofPose==='lie'){
   roofPose='nap';roofPoseUntil=now+6500;
   if(now-roofLastNap>24000){roofLastNap=now;timeline.enter('sleep',now,5000,true);}
  }else if(now>=roofPoseUntil&&roofPose==='nap'){
   roofPose='stretch';roofPoseUntil=now+1250;
   timeline.enter('roofStretch',now,1250,true);
  }else if(now>=roofPoseUntil&&roofPose==='stretch'){
   roofPose='sit';roofPoseUntil=now+9000;
   timeline.enter('roofSit',now,undefined,true);
  }else if(roofPose==='sit'&&timeline.name==='idle'){
   timeline.enter('roofSit',now,undefined,true);
  }
 }else if(roofState!=='resting'&&['roofSit','roofLie'].includes(timeline.name)){
  timeline.enter('roofWake',now,950,true);
 }
 ambient(now);draw(now);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
