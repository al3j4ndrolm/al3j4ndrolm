'use strict';
// The only bridge between the sandboxed page and the main process. Exposes a small, fixed API.
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel, fn) => {
  const handler = (_event, ...args) => fn(...args);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('facet', {
  platform: process.platform,
  onMenu: fn => on('menu', fn),
  onLoadProject: fn => on('load-project', fn),
  onFile: fn => on('file', fn),
  onFullscreen: fn => on('fullscreen', fn),
  setDirty: dirty => ipcRenderer.send('set-dirty', !!dirty),
  saveProject: (json, saveAs) => ipcRenderer.invoke('save-project', String(json), !!saveAs),
  exportKotlin: files => ipcRenderer.invoke('export-kotlin', files),
  closeWindow: () => ipcRenderer.send('close-window'),
});
