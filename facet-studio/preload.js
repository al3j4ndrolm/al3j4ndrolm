'use strict';
// The only bridge between the sandboxed editor and the main process. A small, fixed API.
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel, fn) => {
  const handler = (_event, ...args) => fn(...args);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('facet', {
  platform: process.platform,
  version: '1.0.0',
  // events from the main process
  onMenu: fn => on('menu', fn),
  onLoadProject: fn => on('load-project', fn),
  onWelcome: fn => on('welcome', fn),
  onRecents: fn => on('recents', fn),
  onRun: fn => on('run', fn),
  onFullscreen: fn => on('fullscreen', fn),
  // window & project
  ready: () => ipcRenderer.send('ready'),
  setDirty: dirty => ipcRenderer.send('set-dirty', !!dirty),
  closeWindow: () => ipcRenderer.send('close-window'),
  defaults: () => ipcRenderer.invoke('defaults'),
  pickFolder: opts => ipcRenderer.invoke('pick-folder', opts),
  createProject: opts => ipcRenderer.invoke('create-project', opts),
  openDialog: () => ipcRenderer.send('open-dialog'),
  openPath: dir => ipcRenderer.send('open-path', String(dir)),
  forgetRecent: dir => ipcRenderer.invoke('forget-recent', String(dir)),
  saveProject: payload => ipcRenderer.invoke('save-project', payload),
  checkExternal: () => ipcRenderer.invoke('check-external'),
  reveal: () => ipcRenderer.send('reveal'),
  openInStudio: () => ipcRenderer.invoke('open-in-studio'),
  // Android toolchain
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: s => ipcRenderer.invoke('set-settings', s),
  toolStatus: () => ipcRenderer.invoke('tool-status'),
  devices: () => ipcRenderer.invoke('devices'),
  run: opts => ipcRenderer.send('run', opts),
  stop: () => ipcRenderer.send('stop'),
});
