'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getData:      ()    => ipcRenderer.invoke('get-data'),
  saveData:     (d)   => ipcRenderer.invoke('save-data', d),
  hideWin:      ()    => ipcRenderer.invoke('hide-win'),
  quit:         ()    => ipcRenderer.invoke('quit-app'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
