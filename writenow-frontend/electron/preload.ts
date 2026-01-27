import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  IpcResponse,
  LocalLlmModelEnsureRequest,
  LocalLlmModelEnsureResponse,
  LocalLlmModelListResponse,
  LocalLlmModelRemoveRequest,
  LocalLlmModelRemoveResponse,
  LocalLlmModelState,
  LocalLlmSettings,
  LocalLlmSettingsGetResponse,
  LocalLlmSettingsUpdateRequest,
  LocalLlmSettingsUpdateResponse,
  LocalLlmTabCancelRequest,
  LocalLlmTabCancelResponse,
  LocalLlmTabCompleteRequest,
  LocalLlmTabCompleteResponse,
  LocalLlmTabStreamEvent,
} from '../src/types/ipc-generated'

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
  localLlm?: {
    modelList: () => Promise<IpcResponse<LocalLlmModelListResponse>>
    ensureModel: (payload: LocalLlmModelEnsureRequest) => Promise<IpcResponse<LocalLlmModelEnsureResponse>>
    removeModel: (payload: LocalLlmModelRemoveRequest) => Promise<IpcResponse<LocalLlmModelRemoveResponse>>
    settingsGet: () => Promise<IpcResponse<LocalLlmSettingsGetResponse>>
    settingsUpdate: (payload: LocalLlmSettingsUpdateRequest) => Promise<IpcResponse<LocalLlmSettingsUpdateResponse>>
    complete: (payload: LocalLlmTabCompleteRequest) => Promise<IpcResponse<LocalLlmTabCompleteResponse>>
    cancel: (payload: LocalLlmTabCancelRequest) => Promise<IpcResponse<LocalLlmTabCancelResponse>>
    onStream: (handler: (event: LocalLlmTabStreamEvent) => void) => () => void
    onStateChanged: (handler: (state: LocalLlmModelState) => void) => () => void
    onSettingsChanged: (handler: (settings: LocalLlmSettings) => void) => () => void
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
  localLlm: {
    modelList: async () => await ipcRenderer.invoke('localLlm:model:list'),
    ensureModel: async (payload) => await ipcRenderer.invoke('localLlm:model:ensure', payload),
    removeModel: async (payload) => await ipcRenderer.invoke('localLlm:model:remove', payload),
    settingsGet: async () => await ipcRenderer.invoke('localLlm:settings:get'),
    settingsUpdate: async (payload) => await ipcRenderer.invoke('localLlm:settings:update', payload),
    complete: async (payload) => await ipcRenderer.invoke('localLlm:tab:complete', payload),
    cancel: async (payload) => await ipcRenderer.invoke('localLlm:tab:cancel', payload),
    onStream: (handler) => {
      const listener = (_event: IpcRendererEvent, event: LocalLlmTabStreamEvent) => handler(event)
      ipcRenderer.on('localLlm:tab:stream', listener)
      return () => ipcRenderer.removeListener('localLlm:tab:stream', listener)
    },
    onStateChanged: (handler) => {
      const listener = (_event: IpcRendererEvent, state: LocalLlmModelState) => handler(state)
      ipcRenderer.on('localLlm:state:changed', listener)
      return () => ipcRenderer.removeListener('localLlm:state:changed', listener)
    },
    onSettingsChanged: (handler) => {
      const listener = (_event: IpcRendererEvent, next: LocalLlmSettings) => handler(next)
      ipcRenderer.on('localLlm:settings:changed', listener)
      return () => ipcRenderer.removeListener('localLlm:settings:changed', listener)
    },
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
