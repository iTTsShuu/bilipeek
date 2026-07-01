'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  minimize: () => ipcRenderer.send('win:minimize'),
  close: () => ipcRenderer.send('win:close'),
  setSize: (width, height) => ipcRenderer.send('win:set-size', { width, height }),
  toggleTop: () => ipcRenderer.invoke('win:toggle-top'),
  getState: () => ipcRenderer.invoke('win:get-state'),
  bossHide: () => ipcRenderer.send('boss:hide'),
  setBossKey: (accelerator) => ipcRenderer.invoke('boss:set-key', accelerator),
  onPauseMedia: (cb) => ipcRenderer.on('boss:pause-media', cb)
});
