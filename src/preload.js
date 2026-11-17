const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('naili',{
 drag:(x,y)=>ipcRenderer.send('pet:drag',{x,y}),
 quit:()=>ipcRenderer.send('pet:quit'),
 getSettings:()=>ipcRenderer.invoke('pet:settings:get'),
 setFollow:follow=>ipcRenderer.invoke('pet:settings:set',{follow})
});
