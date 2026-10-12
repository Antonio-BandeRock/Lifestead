// The versions picker's window (versions.html), P34. Puts one object on
// window, lifesteadVersions, for listing the versions and opening them; the
// work is done in main.js and versions.js.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lifesteadVersions', {
  list: () => ipcRenderer.invoke('versions:list'),
  open: (keys) => ipcRenderer.invoke('versions:open', keys),
  startFresh: (key) => ipcRenderer.invoke('versions:startFresh', key),
});
