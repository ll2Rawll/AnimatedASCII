const {contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('winter',{apply:scene=>ipcRenderer.invoke('apply-wallpaper',scene)});
