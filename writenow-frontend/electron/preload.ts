import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

type BackendCrashPayload = {
  code: number | null
  signal: string | null
}

type ElectronAPI = {
  platform: NodeJS.Platform
  versions: NodeJS.ProcessVersions
  onBackendCrashed: (handler: (payload: BackendCrashPayload) => void) => () => void
  secureStore?: {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string) => Promise<void>
    delete: (key: string) => Promise<void>
  }
}

const api: ElectronAPI = {
  platform: process.platform,
  versions: process.versions,
  onBackendCrashed: (handler) => {
    const listener = (_event: IpcRendererEvent, payload: BackendCrashPayload) => {
      handler(payload)
    }
    ipcRenderer.on('backend:crashed', listener)
    return () => ipcRenderer.removeListener('backend:crashed', listener)
  },
  secureStore: {
    get: async (key) => await ipcRenderer.invoke('secureStore:get', key),
    set: async (key, value) => {
      await ipcRenderer.invoke('secureStore:set', { key, value })
    },
    delete: async (key) => {
      await ipcRenderer.invoke('secureStore:delete', { key })
    },
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
