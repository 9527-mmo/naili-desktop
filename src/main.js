const { app, BrowserWindow, screen, ipcMain } = require('electron');
const fs=require('fs'),path=require('path');
let win, motionTimer, settings={follow:false};
let target=null, nextRoam=0, roamPause=0, lastTick=0,activity='idle',motionNotice=0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const settingsFile=()=>path.join(app.getPath('userData'),'settings.json');
function save(){try{fs.writeFileSync(settingsFile(),JSON.stringify(settings,null,2));}catch(e){console.warn('Settings save failed',e.message);}}
function bounds(x,y){const display=screen.getDisplayNearestPoint({x,y});return display.workArea;}
function pickRoam(now){
 const [x,y]=win.getPosition(),a=bounds(x,y),margin=22;
 target={x:Math.round(a.x+margin+Math.random()*Math.max(1,a.width-win.getSize()[0]-2*margin)),
 y:Math.round(a.y+margin+Math.random()*Math.max(1,a.height-win.getSize()[1]-2*margin))};
 nextRoam=now+9000+Math.random()*13000;
 roamPause=now+2500+Math.random()*4500;
}
function tick(){
 if(!win||win.isDestroyed())return;
 if(activity==='feed'||activity==='sleep'||activity==='pet'||activity==='play')return;
 const now=Date.now(),dt=Math.min(.05,Math.max(.001,(now-(lastTick||now-16))/1000));lastTick=now;
 const [x,y]=win.getPosition(),[w,h]=win.getSize();
 let goal;
 if(settings.follow){
   const cursor=screen.getCursorScreenPoint(),a=bounds(cursor.x,cursor.y);
   goal={x:clamp(cursor.x+55,a.x,a.x+a.width-w),y:clamp(cursor.y+35,a.y,a.y+a.height-h)};
   // Dead zone prevents constant tiny adjustments around the pointer.
   if(Math.hypot(goal.x-x,goal.y-y)<95)return;
 }else{
   if(!target||now>nextRoam)pickRoam(now);
   if(now<roamPause)return;
   goal=target;
   if(Math.hypot(goal.x-x,goal.y-y)<16){target=null;roamPause=now+2500+Math.random()*4500;return;}
 }
 const dx=goal.x-x,dy=goal.y-y,dist=Math.hypot(dx,dy);
 const maxStep=(settings.follow?185:68)*dt;
 const step=Math.min(maxStep,Math.max(0,dist-(settings.follow?65:0)));
 if(step>.3&&dist>0){win.setPosition(Math.round(x+dx/dist*step),Math.round(y+dy/dist*step));if(now-motionNotice>350){win.webContents.send('pet:motion',true);motionNotice=now;}}
}
function createWindow(){
 const {workArea}=screen.getPrimaryDisplay();
 win=new BrowserWindow({width:360,height:390,x:workArea.x+workArea.width-390,y:workArea.y+workArea.height-430,
 frame:false,transparent:true,alwaysOnTop:true,resizable:false,hasShadow:false,skipTaskbar:true,backgroundColor:'#00000000',
 webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});
 win.loadFile(path.join(__dirname,'index.html'));
 win.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
 motionTimer=setInterval(tick,33);
 win.on('closed',()=>{clearInterval(motionTimer);win=null;});
}
app.whenReady().then(()=>{
 try{const stored=JSON.parse(fs.readFileSync(settingsFile(),'utf8'));settings.follow=stored.follow===true;}catch{}
 createWindow();
 app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
ipcMain.on('pet:drag',(_event,delta)=>{
 if(!win)return;
 const [x,y]=win.getPosition(),a=bounds(x,y),[w,h]=win.getSize();
 win.setPosition(clamp(Math.round(x+delta.x),a.x,a.x+a.width-w),clamp(Math.round(y+delta.y),a.y,a.y+a.height-h));
 target=null;roamPause=Date.now()+7000;
});
ipcMain.handle('pet:settings:get',()=>({...settings}));
ipcMain.handle('pet:settings:set',(_event,value)=>{
 if(typeof value?.follow!=='boolean')throw Error('Invalid follow setting');
 settings.follow=value.follow;target=null;nextRoam=0;roamPause=Date.now()+3000;save();
 return {...settings};
});
ipcMain.on('pet:activity',(_event,value)=>{if(['idle','feed','sleep','pet','play','curious','walk','run'].includes(value))activity=value;});
ipcMain.on('pet:quit',()=>app.quit());
