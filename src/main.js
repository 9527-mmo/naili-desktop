const {app,BrowserWindow,screen,ipcMain}=require('electron');
const fs=require('fs'),path=require('path');
const BASE={width:360,height:390};
const defaults={follow:false,fullScreen:false,scale:100,followDelay:350,toiletEnabled:false,toiletPosition:null};
let settings={...defaults},win,timer,activity='idle',roamTarget=null,nextRoam=0,roamPause=0,lastTick=0,manualPause=0;
let toiletDue=Date.now()+240000,toiletTrip=false,toiletUntil=0;
let cursorHistory=[],filteredTarget=null,moving=false,lastMovementReport=0;
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const rand=(a,b)=>a+Math.random()*(b-a);
const settingsFile=()=>path.join(app.getPath('userData'),'settings.json');
function normalize(raw){
 return {follow:raw?.follow===true,fullScreen:raw?.fullScreen===true,
 scale:clamp(Number.isFinite(raw?.scale)?Math.round(raw.scale):100,50,200),
 followDelay:clamp(Number.isFinite(raw?.followDelay)?Math.round(raw.followDelay):350,0,1500),
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
 if(activity==='toilet'){if(toiletUntil&&now>toiletUntil){toiletUntil=0;toiletTrip=false;toiletDue=now+rand(300000,720000);}reportMotion(false);return;}
 if(toiletUntil&&now<toiletUntil){reportMotion(false);return;}
 if(['feed','sleep','pet','play'].includes(activity)||now<manualPause){reportMotion(false);return;}
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
 createWindow();
 screen.on('display-removed',()=>{if(win){const [x,y]=win.getPosition(),p=clampPosition(x,y);win.setPosition(p.x,p.y);resetMovement();}});
 app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
ipcMain.handle('pet:settings:get',()=>({...settings}));
ipcMain.handle('pet:settings:set',(_event,patch)=>{
 if(!patch||typeof patch!=='object'||Array.isArray(patch))throw Error('Invalid settings');
 const keys=Object.keys(patch);
 if(!keys.length||keys.some(k=>!Object.hasOwn(defaults,k)))throw Error('Unknown setting');
 if('toiletEnabled'in patch&&typeof patch.toiletEnabled!=='boolean')throw Error('Invalid toiletEnabled');
 if('toiletPosition'in patch&&patch.toiletPosition!==null&&(!Number.isFinite(patch.toiletPosition?.x)||!Number.isFinite(patch.toiletPosition?.y)))throw Error('Invalid toiletPosition');
 if('follow'in patch&&typeof patch.follow!=='boolean')throw Error('Invalid follow');
 if('fullScreen'in patch&&typeof patch.fullScreen!=='boolean')throw Error('Invalid fullScreen');
 if('scale'in patch&&(!Number.isInteger(patch.scale)||patch.scale<50||patch.scale>200))throw Error('Invalid scale');
 if('followDelay'in patch&&(!Number.isInteger(patch.followDelay)||patch.followDelay<0||patch.followDelay>1500))throw Error('Invalid followDelay');
 const oldScale=settings.scale;settings={...settings,...patch};save();
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
ipcMain.on('pet:drag',(_event,delta)=>{
 if(!win||!Number.isFinite(delta?.x)||!Number.isFinite(delta?.y))return;
 const [x,y]=win.getPosition(),nx=x+delta.x,ny=y+delta.y;
 const pos=settings.fullScreen?{x:Math.round(nx),y:Math.round(ny)}:clampTo(rectFor(screen.getPrimaryDisplay()),nx,ny);
 win.setPosition(pos.x,pos.y);manualPause=Date.now()+7000;resetMovement();
});
ipcMain.on('pet:toilet:finished',()=>{toiletTrip=false;toiletUntil=0;toiletDue=Date.now()+rand(300000,720000);});
ipcMain.on('pet:activity',(_event,value)=>{if(['idle','feed','sleep','pet','play','curious','walk','run'].includes(value))activity=value;});
ipcMain.on('pet:quit',()=>app.quit());
