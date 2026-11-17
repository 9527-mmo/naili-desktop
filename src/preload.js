const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('naili',{
 drag:(x,y)=>ipcRenderer.send('pet:drag',{x,y}),
 quit:()=>ipcRenderer.send('pet:quit'),
 getSettings:()=>ipcRenderer.invoke('pet:settings:get'),
 setSettings:patch=>ipcRenderer.invoke('pet:settings:set',patch),
 setFollow:follow=>ipcRenderer.invoke('pet:settings:set',{follow}),
 activity:name=>ipcRenderer.send('pet:activity',name),
 onMotion:callback=>{const listener=(_event,moving)=>callback(moving);ipcRenderer.on('pet:motion',listener);return ()=>ipcRenderer.removeListener('pet:motion',listener);}
});
