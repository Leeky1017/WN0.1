const { contextBridge, ipcRenderer } = require('electron')

const ALLOWED_INVOKE_CHANNELS = new Set([
  // IPC_CONTRACT_AUTOGEN_INVOKE_START
  'file:create',
  'file:delete',
  'file:list',
  'file:read',
  'file:session:status',
  'file:snapshot:latest',
  'file:snapshot:write',
  'file:write',
  'project:bootstrap',
  'project:create',
  'project:delete',
  'project:getCurrent',
  'project:list',
  'project:setCurrent',
  'project:update',
  'character:create',
  'character:delete',
  'character:list',
  'character:update',
  'outline:get',
  'outline:save',
  'kg:entity:create',
  'kg:entity:delete',
  'kg:entity:list',
  'kg:entity:update',
  'kg:graph:get',
  'kg:relation:create',
  'kg:relation:delete',
  'kg:relation:list',
  'ai:skill:cancel',
  'ai:skill:run',
  'constraints:get',
  'constraints:set',
  'judge:l2:prompt',
  'judge:model:ensure',
  'judge:model:getState',
  'search:fulltext',
  'search:semantic',
  'embedding:encode',
  'embedding:index',
  'rag:retrieve',
  'version:create',
  'version:diff',
  'version:list',
  'version:restore',
  'update:check',
  'update:clearSkipped',
  'update:download',
  'update:getState',
  'update:install',
  'update:skipVersion',
  'export:docx',
  'export:markdown',
  'export:pdf',
  'clipboard:writeHtml',
  'clipboard:writeText',
  // IPC_CONTRACT_AUTOGEN_INVOKE_END
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
  snapshotIntervalMs: (() => {
    const raw = typeof process.env.WN_SNAPSHOT_INTERVAL_MS === 'string' ? process.env.WN_SNAPSHOT_INTERVAL_MS.trim() : ''
    if (!raw) return undefined
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? value : undefined
  })(),
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
