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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
