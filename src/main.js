const {app,BrowserWindow,screen,ipcMain}=require('electron');
const fs=require('fs'),path=require('path');
const {spawn,spawnSync}=require('child_process');
const os=require('os');
const BASE={width:360,height:390};
const defaults={panelVisible:true,workStart:'09:00',workEnd:'18:00',monthlySalary:8000,salaryMode:'work',follow:false,fullScreen:false,scale:100,followDelay:350,toiletEnabled:false,toiletPosition:null,activeFeed:false};
let panel=null;let settings={...defaults},win,timer,activity='idle',roamTarget=null,nextRoam=0,roamPause=0,lastTick=0,manualPause=0;
let toiletDue=Date.now()+240000,toiletTrip=false,toiletUntil=0;
let feeding=null,feedStart=0,feedPicker=null,feedPoint=null,mouseMonitor=null,mouseBuffer='',lastRight=null;
let cursorHistory=[],filteredTarget=null,moving=false,lastMovementReport=0;
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const rand=(a,b)=>a+Math.random()*(b-a);
const settingsFile=()=>path.join(app.getPath('userData'),'settings.json');
function normalize(raw){
 return {panelVisible:raw?.panelVisible!==false,workStart:/^([01]\d|2[0-3]):[0-5]\d$/.test(raw?.workStart)?raw.workStart:'09:00',workEnd:/^([01]\d|2[0-3]):[0-5]\d$/.test(raw?.workEnd)?raw.workEnd:'18:00',monthlySalary:Number.isFinite(raw?.monthlySalary)?clamp(raw.monthlySalary,0,100000000):8000,salaryMode:raw?.salaryMode==='calendar'?'calendar':'work',follow:raw?.follow===true,fullScreen:raw?.fullScreen===true,
 scale:clamp(Number.isFinite(raw?.scale)?Math.round(raw.scale):100,50,200),
 followDelay:clamp(Number.isFinite(raw?.followDelay)?Math.round(raw.followDelay):350,0,1500),
 activeFeed:raw?.activeFeed===true,
 toiletEnabled:raw?.toiletEnabled===true,toiletPosition:raw?.toiletPosition&&Number.isFinite(raw.toiletPosition.x)&&Number.isFinite(raw.toiletPosition.y)?{x:raw.toiletPosition.x,y:raw.toiletPosition.y}:null};
}
function save(){try{fs.writeFileSync(settingsFile(),JSON.stringify(settings,null,2));}catch(e){console.warn('Cannot save pet settings',e);}}
function allowedDisplays(){return settings.fullScreen?screen.getAllDisplays():[screen.getPrimaryDisplay()];}
function rectFor(display){return settings.fullScreen?display.bounds:display.workArea;}
function size(){return [Math.round(BASE.width*settings.scale/100),Math.round(BASE.height*settings.scale/100)];}
function clampTo(rect,x,y){
 const [w,h]=win.getSize();
 return {x:clamp(Math.round(x),rect.x,Math.max(rect.x,rect.x+rect.width-w)),
 y:clamp(Math.round(y),rect.y,Math.max(rect.y,rect.y+rect.height-h))};
}
function nearestAllowed(point){
 const ds=allowedDisplays();
 return ds.find(d=>{const b=d.bounds;return point.x>=b.x&&point.x<b.x+b.width&&point.y>=b.y&&point.y<b.y+b.height;})
 ||ds.reduce((best,d)=>{
 const b=d.bounds,cx=clamp(point.x,b.x,b.x+b.width),cy=clamp(point.y,b.y,b.y+b.height);
 const score=(point.x-cx)**2+(point.y-cy)**2;
 return !best||score<best.score?{display:d,score}:best;
 },null).display;
}
function clampPosition(x,y){
 const display=nearestAllowed({x:x+win.getSize()[0]/2,y:y+win.getSize()[1]/2});
 return clampTo(rectFor(display),x,y);
}
function reportMotion(isMoving){
 if(moving===isMoving)return;
 moving=isMoving;
 if(win&&!win.isDestroyed())win.webContents.send('pet:motion',isMoving);
}
function resetMovement(){roamTarget=null;nextRoam=0;cursorHistory=[];filteredTarget=null;reportMotion(false);}
function resize(){
 if(!win)return;
 const [w,h]=size(),[x,y]=win.getPosition();
 win.setSize(w,h);
 const pos=clampPosition(x,y);win.setPosition(pos.x,pos.y);
 resetMovement();
}
function pickRoam(now){
 const ds=allowedDisplays();
 // Full-screen roaming may choose any attached monitor.
 const display=ds[Math.floor(Math.random()*ds.length)],rect=rectFor(display),[w,h]=win.getSize();
 const margin=12;
 roamTarget={x:Math.round(rand(rect.x+margin,Math.max(rect.x+margin,rect.x+rect.width-w-margin))),
 y:Math.round(rand(rect.y+margin,Math.max(rect.y+margin,rect.y+rect.height-h-margin)))};
 nextRoam=now+rand(12000,23000);roamPause=now+rand(2500,5500);
}
function tick(){
 if(!win||win.isDestroyed())return;
 const now=Date.now(),dt=clamp((now-(lastTick||now-16))/1000,.001,.06);lastTick=now;
 if(feeding){
  if(now-feedStart>45000){const home=feeding.home;feeding=null;const p=clampPosition(home.x,home.y);win.setPosition(p.x,p.y);win.webContents.send('pet:feed:stage','cancel','');reportMotion(false);return;}
  if(feeding.stage==='grab'){if(now<feeding.grabUntil){reportMotion(false);return;}feeding.stage='return';win.webContents.send('pet:feed:stage','carry',feeding.food);}
  const [fx,fy]=win.getPosition(),goal=feeding.stage==='return'?feeding.home:feeding.target;
  if(feeding.stage==='eat'){reportMotion(false);return;}
  const dx=goal.x-fx,dy=goal.y-fy,dist=Math.hypot(dx,dy);
  if(dist<12){
    win.setPosition(Math.round(goal.x),Math.round(goal.y));reportMotion(false);
    if(feeding.stage==='chase'){feeding.stage='grab';feeding.grabUntil=now+1100;win.webContents.send('pet:feed:stage','grab',feeding.food);}
    else {feeding.stage='eat';win.webContents.send('pet:feed:stage','eat',feeding.food);}
    return;
  }
  const speed=feeding.stage==='chase'?440:190,step=Math.min(speed*dt,dist);
  win.setPosition(Math.round(fx+dx/dist*step),Math.round(fy+dy/dist*step));reportMotion(true);return;
 }
 if(activity==='toilet'){if(toiletUntil&&now>toiletUntil){toiletUntil=0;toiletTrip=false;toiletDue=now+rand(300000,720000);}reportMotion(false);return;}
 if(toiletUntil&&now<toiletUntil){reportMotion(false);return;}
 if(['feed','chew','grab','sleep','pet','play'].includes(activity)||now<manualPause){reportMotion(false);return;}
 const [x,y]=win.getPosition();
 let goal,speed;
 if(settings.toiletEnabled&&settings.toiletPosition&&now>=toiletDue&&!toiletTrip){toiletTrip=true;roamTarget=null;}
 if(toiletTrip&&settings.toiletEnabled&&settings.toiletPosition){
  goal=clampPosition(settings.toiletPosition.x,settings.toiletPosition.y);speed=110;
  if(Math.hypot(goal.x-x,goal.y-y)<18){if(!toiletUntil){toiletUntil=now+rand(6500,10000);win.webContents.send('pet:toilet:start',toiletUntil-now);}reportMotion(false);return;}
 }else if(settings.follow){
   const p=screen.getCursorScreenPoint();
   cursorHistory.push({x:p.x,y:p.y,t:now});
   cursorHistory=cursorHistory.filter(v=>now-v.t<=settings.followDelay+180);
   const delayed=cursorHistory.find(v=>v.t>=now-settings.followDelay)||cursorHistory[0]||{...p};
   const display=nearestAllowed(delayed),rect=rectFor(display);
   goal=clampTo(rect,delayed.x+40,delayed.y+25);
   // Follow delay controls response smoothing as well as cursor sampling.
   const smoothing=1-Math.exp(-dt/(.08+settings.followDelay/1000*.45));
   filteredTarget=filteredTarget?{x:filteredTarget.x+(goal.x-filteredTarget.x)*smoothing,y:filteredTarget.y+(goal.y-filteredTarget.y)*smoothing}:goal;
   goal=filteredTarget;
   speed=clamp(450-settings.followDelay*.16,170,450);
 }else{
   filteredTarget=null;cursorHistory=[];
   if(!roamTarget||now>nextRoam)pickRoam(now);
   if(now<roamPause){reportMotion(false);return;}
   goal=roamTarget;speed=85;
   if(Math.hypot(goal.x-x,goal.y-y)<12){roamTarget=null;roamPause=now+rand(2500,6000);reportMotion(false);return;}
 }
 const dx=goal.x-x,dy=goal.y-y,dist=Math.hypot(dx,dy);
 const deadZone=toiletTrip?5:settings.follow?40:5;
 if(dist<=deadZone){reportMotion(false);return;}
 // Gentle deceleration, while avoiding instant teleportation.
 const step=Math.min(speed*dt,Math.max(0,(dist-deadZone)*.14));
 if(step<.3){reportMotion(false);return;}
 const nx=x+dx/dist*step,ny=y+dy/dist*step;
 // In full-screen mode allow traversal across monitor bounds, otherwise constrain to primary work area.
 const pos=settings.fullScreen?{x:Math.round(nx),y:Math.round(ny)}:clampTo(rectFor(screen.getPrimaryDisplay()),nx,ny);
 if(pos.x!==x||pos.y!==y){win.setPosition(pos.x,pos.y);reportMotion(true);}else reportMotion(false);
}
function openFeedPicker(point){
 if(!settings.activeFeed||feeding||!win)return;
 if(feedPicker&&!feedPicker.isDestroyed()){feedPicker.focus();return;}
 feedPoint=point;
 const display=screen.getDisplayNearestPoint(point),rect=display.workArea;
 feedPicker=new BrowserWindow({width:240,height:190,frame:false,resizable:false,alwaysOnTop:true,show:false,
  backgroundColor:'#fff9f0',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});
 feedPicker.loadFile(path.join(__dirname,'feed-picker.html'));
 const x=clamp(Math.round(point.x),rect.x,rect.x+rect.width-240);
 const y=clamp(Math.round(point.y),rect.y,rect.y+rect.height-190);
 feedPicker.setPosition(x,y);feedPicker.once('ready-to-show',()=>feedPicker?.show());
 feedPicker.on('closed',()=>{feedPicker=null;feedPoint=null;});
}
function rightClick(point,now=Date.now()){
 if(!settings.activeFeed||feeding)return;
 if(lastRight&&now-lastRight.time<=430&&Math.hypot(point.x-lastRight.x,point.y-lastRight.y)<36){
  lastRight=null;openFeedPicker(point);
 }else lastRight={...point,time:now};
}
function startMouseMonitor(){
 if(process.platform!=='darwin'||mouseMonitor)return;
 const source=path.join(__dirname,'..','native','RightClickMonitor.swift');
 const bin=path.join(app.getPath('userData'),'naili-right-click-monitor');
 try{
  const sourceMtime=fs.statSync(source).mtimeMs;
  if(!fs.existsSync(bin)||fs.statSync(bin).mtimeMs<sourceMtime){
   const build=spawnSync('xcrun',['swiftc',source,'-o',bin],{timeout:90000,encoding:'utf8'});
   if(build.error||build.status!==0){console.warn('Global monitor compile failed',build.stderr||build.error);return;}
  }
  mouseMonitor=spawn(bin,[],{stdio:['ignore','pipe','pipe']});
  mouseMonitor.stdout.on('data',chunk=>{
   mouseBuffer+=chunk.toString();
   let n;while((n=mouseBuffer.indexOf('\n'))>=0){
    const line=mouseBuffer.slice(0,n);mouseBuffer=mouseBuffer.slice(n+1);
    try{
     const event=JSON.parse(line),primary=screen.getPrimaryDisplay().bounds;
     // Cocoa reports global bottom-left coordinates; Electron uses top-left.
     const point={x:Math.round(event.x),y:Math.round(primary.y+primary.height-event.y)};
     rightClick(point,Math.round(event.timestamp*1000));
    }catch{}
   }
  });
  mouseMonitor.stderr.on('data',v=>console.warn('Global mouse monitor:',String(v)));
  mouseMonitor.on('error',e=>console.warn('Global mouse monitor unavailable:',e.message));
  mouseMonitor.on('exit',()=>{mouseMonitor=null;});
 }catch(e){console.warn('Unable to start mouse monitor',e);}
}
function stopMouseMonitor(){if(mouseMonitor){mouseMonitor.kill();mouseMonitor=null;}lastRight=null;}
function beginFeed(food,point){
 if(!settings.activeFeed||feeding||!win)return {ok:false,reason:'disabled-or-busy'};
 if(!['hay','orchard','alfalfa','pellet','carrot','leaf','apple','herb'].includes(food))throw Error('Invalid food');
 if(!Number.isFinite(point?.x)||!Number.isFinite(point?.y))throw Error('Invalid feed point');
 const display=screen.getDisplayNearestPoint(point),rect=display.bounds,[w,h]=win.getSize();
 const target=clampTo(rect,point.x-w/2,point.y-h/2);
 const [x,y]=win.getPosition();
 feeding={food,home:{x,y},target,stage:'chase'};
 feedStart=Date.now();manualPause=0;toiletTrip=false;resetMovement();
 win.webContents.send('pet:feed:stage','chase',food);
 return {ok:true};
}
function createPanel(){
 if(panel&&!panel.isDestroyed())return;
 const rect=screen.getPrimaryDisplay().workArea;
 panel=new BrowserWindow({width:420,height:280,x:rect.x+Math.max(0,rect.width-450),y:rect.y+Math.max(0,rect.height-305),frame:false,transparent:true,alwaysOnTop:true,resizable:false,skipTaskbar:true,hasShadow:false,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});
 panel.loadFile(path.join(__dirname,'countdown.html'));
 panel.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
 panel.on('closed',()=>{panel=null;});
}
function syncPanel(){if(settings.panelVisible)createPanel();else if(panel){panel.close();}}
function broadcastSettings(){for(const w of [win,panel])if(w&&!w.isDestroyed())w.webContents.send('pet:settings:changed',{...settings});}
function movePanel(dx,dy){if(!panel)return;const [x,y]=panel.getPosition();const rect=screen.getDisplayNearestPoint({x,y}).workArea;panel.setPosition(clamp(Math.round(x+dx),rect.x,rect.x+rect.width-420),clamp(Math.round(y+dy),rect.y,rect.y+rect.height-280));}
function createWindow(){
 const rect=screen.getPrimaryDisplay().workArea,[w,h]=size();
 win=new BrowserWindow({width:w,height:h,x:rect.x+Math.max(0,rect.width-w-30),y:rect.y+Math.max(0,rect.height-h-30),
 frame:false,transparent:true,alwaysOnTop:true,resizable:false,hasShadow:false,skipTaskbar:true,backgroundColor:'#00000000',
 webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});
 win.loadFile(path.join(__dirname,'index.html'));
 win.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
 timer=setInterval(tick,16);
 win.on('closed',()=>{clearInterval(timer);win=null;});
}
app.whenReady().then(()=>{
 try{settings=normalize(JSON.parse(fs.readFileSync(settingsFile(),'utf8')));}catch{settings={...defaults};}
 createWindow();syncPanel();
 if(settings.activeFeed)startMouseMonitor();
 screen.on('display-removed',()=>{if(win){const [x,y]=win.getPosition(),p=clampPosition(x,y);win.setPosition(p.x,p.y);resetMovement();}});
 app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
ipcMain.handle('pet:settings:get',()=>({...settings}));
ipcMain.handle('pet:settings:set',(_event,patch)=>{
 if(!patch||typeof patch!=='object'||Array.isArray(patch))throw Error('Invalid settings');
 const keys=Object.keys(patch);
 if(!keys.length||keys.some(k=>!Object.hasOwn(defaults,k)))throw Error('Unknown setting');
 if('panelVisible'in patch&&typeof patch.panelVisible!=='boolean')throw Error('Invalid panelVisible');
 if('workStart'in patch&&!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(patch.workStart))throw Error('Invalid workStart');
 if('workEnd'in patch&&!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(patch.workEnd))throw Error('Invalid workEnd');
 if('monthlySalary'in patch&&(!Number.isFinite(patch.monthlySalary)||patch.monthlySalary<0||patch.monthlySalary>100000000))throw Error('Invalid monthlySalary');
 if('salaryMode'in patch&&!['work','calendar'].includes(patch.salaryMode))throw Error('Invalid salaryMode');
 if('activeFeed'in patch&&typeof patch.activeFeed!=='boolean')throw Error('Invalid activeFeed');
 if('toiletEnabled'in patch&&typeof patch.toiletEnabled!=='boolean')throw Error('Invalid toiletEnabled');
 if('toiletPosition'in patch&&patch.toiletPosition!==null&&(!Number.isFinite(patch.toiletPosition?.x)||!Number.isFinite(patch.toiletPosition?.y)))throw Error('Invalid toiletPosition');
 if('follow'in patch&&typeof patch.follow!=='boolean')throw Error('Invalid follow');
 if('fullScreen'in patch&&typeof patch.fullScreen!=='boolean')throw Error('Invalid fullScreen');
 if('scale'in patch&&(!Number.isInteger(patch.scale)||patch.scale<50||patch.scale>200))throw Error('Invalid scale');
 if('followDelay'in patch&&(!Number.isInteger(patch.followDelay)||patch.followDelay<0||patch.followDelay>1500))throw Error('Invalid followDelay');
 const oldScale=settings.scale;settings={...settings,...patch};save();syncPanel();broadcastSettings();
 if(patch.activeFeed===false&&feeding){feeding=null;win.webContents.send('pet:feed:stage','cancel','');reportMotion(false);}
 if('activeFeed'in patch){if(settings.activeFeed)startMouseMonitor();else {stopMouseMonitor();if(feedPicker)feedPicker.close();}}
 if('toiletEnabled'in patch||'toiletPosition'in patch){toiletTrip=false;toiletUntil=0;toiletDue=Date.now()+rand(180000,420000);}
 if(oldScale!==settings.scale)resize();
 else {resetMovement();if(!settings.fullScreen){const [x,y]=win.getPosition(),p=clampPosition(x,y);win.setPosition(p.x,p.y);}}
 manualPause=Date.now()+1200;
 return {...settings};
});
ipcMain.handle('pet:toilet:set-current',()=>{
 if(!win)throw Error('Pet window unavailable');
 const [x,y]=win.getPosition();settings.toiletPosition={x,y};save();
 toiletTrip=false;toiletDue=Date.now()+rand(180000,420000);return {...settings};
});
ipcMain.handle('pet:feed:start',(_event,payload)=>beginFeed(String(payload?.food||'hay'),payload?.point));
ipcMain.on('pet:feed:global-confirm',(event,food)=>{
 if(!feedPicker||event.sender!==feedPicker.webContents||!feedPoint)return;
 const point={...feedPoint};feedPicker.close();beginFeed(String(food),point);
});
ipcMain.on('pet:feed:global-cancel',event=>{if(feedPicker&&event.sender===feedPicker.webContents)feedPicker.close();});
ipcMain.on('pet:feed:finish',()=>{
 if(!feeding||feeding.stage!=='eat')return;
 feeding=null;manualPause=Date.now()+1800;reportMotion(false);
});
ipcMain.on('pet:drag',(_event,delta)=>{
 if(!win||!Number.isFinite(delta?.x)||!Number.isFinite(delta?.y))return;
 const [x,y]=win.getPosition(),nx=x+delta.x,ny=y+delta.y;
 const pos=settings.fullScreen?{x:Math.round(nx),y:Math.round(ny)}:clampTo(rectFor(screen.getPrimaryDisplay()),nx,ny);
 win.setPosition(pos.x,pos.y);manualPause=Date.now()+7000;resetMovement();
});
ipcMain.on('pet:toilet:finished',()=>{toiletTrip=false;toiletUntil=0;toiletDue=Date.now()+rand(300000,720000);});
ipcMain.on('pet:activity',(_event,value)=>{if(['idle','feed','chew','grab','carry','groom','sleep','pet','play','curious','walk','run','toilet'].includes(value))activity=value;});
app.on('before-quit',stopMouseMonitor);
ipcMain.on('pet:quit',()=>app.quit());

ipcMain.on('pet:panel:drag',(_event,payload)=>{if(panel&&_event.sender===panel.webContents&&Number.isFinite(payload?.x)&&Number.isFinite(payload?.y))movePanel(payload.x,payload.y);});
