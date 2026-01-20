const { contextBridge, ipcRenderer } = require('electron')

const ALLOWED_INVOKE_CHANNELS = new Set([
  'file:list',
  'file:read',
  'file:write',
  'file:create',
  'file:delete',
  'ai:skill:run',
  'ai:skill:cancel',
  'search:fulltext',
  'search:semantic',
  'embedding:encode',
  'embedding:index',
  'version:list',
  'version:create',
  'version:restore',
  'version:diff',
  'update:check',
  'update:download',
  'update:install',
  'update:getState',
  'update:skipVersion',
  'update:clearSkipped',
  'export:markdown',
  'export:docx',
  'export:pdf',
  'clipboard:writeText',
  'clipboard:writeHtml',
])

const ALLOWED_SEND_CHANNELS = new Set([
  'app:renderer-boot',
  'app:renderer-ready',
  'app:renderer-error',
  'app:renderer-unhandledrejection',
  'app:renderer-log',
  'window:minimize',
  'window:maximize',
  'window:close',
])

const listenerMap = new WeakMap()

function assertAllowed(channel, allowlist) {
  if (typeof channel !== 'string' || !allowlist.has(channel)) {
    throw new Error(`IPC channel is not allowlisted: ${String(channel)}`)
  }
}

contextBridge.exposeInMainWorld('writenow', {
  platform: process.platform,
  send: (channel, payload) => {
    assertAllowed(channel, ALLOWED_SEND_CHANNELS)
    return ipcRenderer.send(channel, payload)
  },
  on: (event, callback) => {
    const byEvent = listenerMap.get(callback) || new Map()
    if (byEvent.has(event)) return

    const wrapper = (_evt, ...args) => callback(...args)
    byEvent.set(event, wrapper)
    listenerMap.set(callback, byEvent)
    ipcRenderer.on(event, wrapper)
  },
  off: (event, callback) => {
    const byEvent = listenerMap.get(callback)
    const wrapper = byEvent?.get(event)
    if (!wrapper) return
    ipcRenderer.removeListener(event, wrapper)
    byEvent.delete(event)
    if (byEvent.size === 0) listenerMap.delete(callback)
  },
  invoke: (channel, payload) => {
    assertAllowed(channel, ALLOWED_INVOKE_CHANNELS)
    return ipcRenderer.invoke(channel, payload)
  },
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
})
