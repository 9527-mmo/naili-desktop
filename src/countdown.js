/* Retro countdown: daily repeating shift; local time; no network. */
const $=id=>document.getElementById(id);
let settings=null;
const money=n=>'¥ '+Math.max(0,n).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
const pad=n=>String(n).padStart(2,'0');
function shiftFor(date,hhmm){
 const [h,m]=hhmm.split(':').map(Number);const d=new Date(date);d.setHours(h,m,0,0);return d;
}
function calculate(now,s){
 const start=shiftFor(now,s.workStart),end=shiftFor(now,s.workEnd);
 if(end<=start)end.setDate(end.getDate()+1);
 const priorStart=new Date(start);priorStart.setDate(priorStart.getDate()-1);
 const priorEnd=new Date(end);priorEnd.setDate(priorEnd.getDate()-1);
 let currentStart=start,currentEnd=end;
 if(now<start&&now<priorEnd){currentStart=priorStart;currentEnd=priorEnd;}
 const working=now>=currentStart&&now<currentEnd;
 let target,rest=false;
 if(working)target=currentEnd;
 else{rest=true;target=now<end?end:new Date(end.getTime()+86400000);if(now<start)target=end;}
 // If off shift, count down to the next shift's end (daily schedule).
 const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
 const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
 let accrued=0,today=0;
 if(s.salaryMode==='calendar'){
  const monthMs=new Date(now.getFullYear(),now.getMonth()+1,1)-monthStart;
  accrued=s.monthlySalary*(now-monthStart)/monthMs;
  const todayStart=new Date(now);todayStart.setHours(0,0,0,0);
  today=s.monthlySalary*(now-todayStart)/monthMs;
 }else{
  // Daily shift assumption; workdays are every calendar day.
  const shiftMs=end-start;
  const daily=s.monthlySalary/daysInMonth;
  for(let day=1;day<=now.getDate();day++){
   const date=new Date(now.getFullYear(),now.getMonth(),day);
   const a=shiftFor(date,s.workStart),b=shiftFor(date,s.workEnd);if(b<=a)b.setDate(b.getDate()+1);
   const fraction=Math.max(0,Math.min(1,(now-a)/(b-a)));
   accrued+=daily*fraction;
   if(day===now.getDate())today=daily*fraction;
  }
 }
 return {remaining:Math.max(0,Math.ceil((target-now)/1000)),working,today,accrued};
}
function render(){
 if(!settings)return;
 const v=calculate(new Date(),settings);
 $('count-label').textContent=v.working?'距离下班':'休息中 · 距下次下班';
 const sec=v.remaining;$('count').textContent=[Math.floor(sec/3600),Math.floor(sec%3600/60),sec%60].map(pad).join(':');
 $('today').textContent=money(v.today);$('month').textContent=money(v.accrued);
 $('info').textContent=(settings.salaryMode==='calendar'?'整月均摊':'每日排班均摊')+' · 每秒更新 · 仅供参考';
}
async function refresh(){settings=await window.naili.getSettings();render();}
$('config').onclick=()=>{if(!settings)return;$('start').value=settings.workStart;$('end').value=settings.workEnd;$('salary').value=settings.monthlySalary;$('mode').value=settings.salaryMode;$('settings').hidden=false;};
$('cancel').onclick=()=>$('settings').hidden=true;
$('save').onclick=async()=>{try{settings=await window.naili.setSettings({workStart:$('start').value,workEnd:$('end').value,monthlySalary:Number($('salary').value),salaryMode:$('mode').value});$('settings').hidden=true;render();}catch(e){alert('保存失败：'+e.message);}};
let dragging=null;
$('panel').addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;dragging={x:e.screenX,y:e.screenY};});
window.addEventListener('pointermove',e=>{if(!dragging)return;window.naili.dragPanel(e.screenX-dragging.x,e.screenY-dragging.y);dragging={x:e.screenX,y:e.screenY};});
window.addEventListener('pointerup',()=>dragging=null);
window.naili.onSettingsChanged(v=>{settings=v;render();});
refresh().catch(console.error);setInterval(render,1000);
