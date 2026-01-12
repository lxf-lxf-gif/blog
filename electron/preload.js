const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    platform: process.platform,
    saveFile: (options) => ipcRenderer.invoke('save-file', options),
    selectFiles: () => ipcRenderer.invoke('select-files'),
    readFile: (path) => ipcRenderer.invoke('read-file', path)
});
