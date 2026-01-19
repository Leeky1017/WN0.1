const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('writenow', {
  platform: process.platform,
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args)),
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  files: {
    list: () => ipcRenderer.invoke('file:list'),
    read: (path) => ipcRenderer.invoke('file:read', { path }),
    write: (path, content) => ipcRenderer.invoke('file:write', { path, content }),
    create: (name) => ipcRenderer.invoke('file:create', { name }),
    delete: (path) => ipcRenderer.invoke('file:delete', { path }),
  },
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close')
})
