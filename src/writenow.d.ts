export type DocumentFileListItem = {
  name: string
  path: string
  createdAt: number
  wordCount: number
}

export type FileReadResult = { content: string }
export type FileWriteResult = { ok: true }
export type FileCreateResult = { name: string; path: string }
export type FileDeleteResult = { ok: true }

export interface WriteNowFilesAPI {
  list: () => Promise<DocumentFileListItem[]>
  read: (path: string) => Promise<FileReadResult>
  write: (path: string, content: string) => Promise<FileWriteResult>
  create: (name: string) => Promise<FileCreateResult>
  delete: (path: string) => Promise<FileDeleteResult>
}

export interface WriteNowAPI {
  platform: string
  send: (channel: string, data?: unknown) => void
  on: (channel: string, callback: (...args: unknown[]) => void) => void
  invoke: <T = unknown>(channel: string, data?: unknown) => Promise<T>
  files: WriteNowFilesAPI
  minimize: () => void
  maximize: () => void
  close: () => void
}

declare global {
  interface Window {
    writenow?: WriteNowAPI
  }
}

export {}
