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
} from './ipc-generated'

export type BackendCrashPayload = {
  code: number | null
  signal: string | null
}

export type ElectronAPI = {
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

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
