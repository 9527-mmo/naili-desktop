/* Naili compact countdown. Uses system-local clock; no external data. */
const $=id=>document.getElementById(id);
let settings=null,dragging=null;
const pad=n=>String(n).padStart(2,'0');
const money=n=>'¥ '+Math.max(0,n).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
function at(date,hhmm){const [h,m]=hhmm.split(':').map(Number),d=new Date(date);d.setHours(h,m,0,0);return d;}
function bounds(date,s){const a=at(date,s.workStart),b=at(date,s.workEnd);if(b<=a)b.setDate(b.getDate()+1);return {a,b};}
function calculate(now,s){
 const current=bounds(now,s),previous=bounds(new Date(now.getFullYear(),now.getMonth(),now.getDate()-1),s);
 const active=now>=current.a&&now<current.b?current:now>=previous.a&&now<previous.b?previous:null;
 const next=active?active.b:now<current.a?current.a:new Date(current.a.getTime()+86400000);
 const progress=active?Math.max(0,Math.min(100,(now-active.a)/(active.b-active.a)*100)):0;
 const monthStart=new Date(now.getFullYear(),now.getMonth(),1),monthEnd=new Date(now.getFullYear(),now.getMonth()+1,1);
 let today=0,accrued=0;
 if(s.salaryMode==='calendar'){
  const ms=monthEnd-monthStart,dayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  today=s.monthlySalary*(now-dayStart)/ms;
  accrued=s.monthlySalary*(now-monthStart)/ms;
 }else{
  const days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(),daily=s.monthlySalary/days;
  // Include all scheduled shifts starting this month, even if yesterday's shift crosses midnight.
  for(let day=1;day<=now.getDate();day++){
   const shift=bounds(new Date(now.getFullYear(),now.getMonth(),day),s);
   const fraction=Math.max(0,Math.min(1,(now-shift.a)/(shift.b-shift.a)));
   accrued+=daily*fraction;
   if(day===now.getDate())today=daily*fraction;
  }
  // A night shift started yesterday may still be earning today.
  if(active&&active.a.getDate()!==now.getDate()){
   const dailyMs=active.b-active.a;
   today=daily*Math.max(0,(now-new Date(now.getFullYear(),now.getMonth(),now.getDate()))/dailyMs);
  }
 }
 return {working:!!active,remaining:Math.max(0,Math.ceil((next-now)/1000)),progress,today,accrued};
}
function render(){
 if(!settings)return;
 const now=new Date(),v=calculate(now,settings),sec=v.remaining;
 $('count-label').textContent=v.working?'距离下班还有':'休息中 · 距离上班';
 $('hours').textContent=pad(Math.floor(sec/3600));$('minutes').textContent=pad(Math.floor(sec%3600/60));$('seconds').textContent=pad(sec%60);
 $('today').textContent=money(v.today);$('month').textContent=money(v.accrued);
}
async function refresh(){settings=await window.naili.getSettings();render();}
$('config').onclick=()=>{if(!settings)return;$('start').value=settings.workStart;$('end').value=settings.workEnd;$('salary').value=settings.monthlySalary;$('mode').value=settings.salaryMode;$('settings').hidden=false;};
$('cancel').onclick=()=>$('settings').hidden=true;
$('minimize').onclick=async()=>{try{await window.naili.setSettings({panelVisible:false});}catch(e){console.warn(e);}};
$('save').onclick=async()=>{try{settings=await window.naili.setSettings({workStart:$('start').value,workEnd:$('end').value,monthlySalary:Number($('salary').value),salaryMode:$('mode').value});$('settings').hidden=true;render();}catch(e){window.alert('保存失败：'+e.message);}};
$('panel').addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button,input,select'))return;dragging={x:e.screenX,y:e.screenY};});
window.addEventListener('pointermove',e=>{if(!dragging)return;window.naili.dragPanel(e.screenX-dragging.x,e.screenY-dragging.y);dragging={x:e.screenX,y:e.screenY};});
window.addEventListener('pointerup',()=>dragging=null);
window.addEventListener('blur',()=>dragging=null);
window.naili.onSettingsChanged(v=>{settings=v;render();});
refresh().catch(console.error);setInterval(render,1000);
