import { app, BrowserWindow, dialog, ipcMain, safeStorage } from 'electron'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { BackendLauncher } from './services/backendLauncher'
import type { LlamaCompletionGenerationOptions, LlamaContext, LlamaModel } from 'node-llama-cpp'
import type {
  IpcErrorCode,
  IpcResponse,
  LocalLlmModelDescriptor,
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

const BACKEND_PORT = 3000
const WINDOW_WIDTH = 1400
const WINDOW_HEIGHT = 900
const PRELOAD_PATH = path.join(__dirname, '../preload/index.cjs')
const SECURE_STORE_FILENAME = 'secure-store.json'
const AI_KEY_STORAGE_KEY = 'writenow_ai_api_key_v1'
const IS_E2E = process.env.WN_E2E === '1'

const requestedUserDataDir = typeof process.env.WN_USER_DATA_DIR === 'string' ? process.env.WN_USER_DATA_DIR.trim() : ''
if (requestedUserDataDir) {
  // Why: E2E runs must be fully isolated (no cross-test contamination) and reproducible.
  app.setPath('userData', requestedUserDataDir)
  try {
    app.setPath('logs', path.join(requestedUserDataDir, 'logs'))
  } catch {
    // ignore
  }
}

if (process.env.WN_DISABLE_GPU === '1') {
  // Why: Some CI/WSL environments crash Electron when GPU initialization fails. Keep the behavior opt-in so local
  // E2E runs can decide based on the runner (set `WN_DISABLE_GPU=1` when needed).
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-gpu-compositing')
  app.commandLine.appendSwitch('disable-gpu-sandbox')
  app.commandLine.appendSwitch('disable-setuid-sandbox')
  app.commandLine.appendSwitch('no-sandbox')
  app.commandLine.appendSwitch('use-gl', 'swiftshader')
  app.commandLine.appendSwitch('disable-dev-shm-usage')
  app.commandLine.appendSwitch('disable-seccomp-filter-sandbox')
}

function ensureLogFile(): string {
  const logDir = app.getPath('logs')
  try {
    fs.mkdirSync(logDir, { recursive: true })
  } catch {
    // ignore
  }
  return path.join(logDir, 'main.log')
}

const logFilePath = ensureLogFile()

function writeLogLine(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
  const line = `[${new Date().toISOString()}] [${level}] ${message}\n`
  try {
    fs.appendFileSync(logFilePath, line, 'utf8')
  } catch {
    // ignore
  }
}

const logger = {
  info: (message: string) => {
    console.log(message)
    writeLogLine('INFO', message)
  },
  warn: (message: string) => {
    console.warn(message)
    writeLogLine('WARN', message)
  },
  error: (message: string) => {
    console.error(message)
    writeLogLine('ERROR', message)
  },
}

/**
 * Why: E2E runs must not be blocked by native modal dialogs (they can hang Playwright workers).
 */
function showErrorDialog(title: string, message: string): void {
  if (IS_E2E) {
    logger.error(`[dialog:suppressed] ${title}: ${message}`)
    return
  }
  dialog.showErrorBox(title, message)
}

const backendLauncher = new BackendLauncher({
  logger,
  onUnexpectedExit: ({ code, signal }) => {
    const detail = `code=${code ?? 'null'} signal=${signal ?? 'null'}`
    logger.error(`[backend] crashed (${detail})`)
    showErrorDialog('后端已退出', `Theia 后端意外退出（${detail}）。请重启应用。`)
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('backend:crashed', { code, signal })
    }
  },
})

let mainWindow: BrowserWindow | null = null
let isQuitting = false

type SecureStoreFile = Record<string, string>

function getSecureStorePath(): string {
  return path.join(app.getPath('userData'), SECURE_STORE_FILENAME)
}

function loadSecureStore(): SecureStoreFile {
  const filePath = getSecureStorePath()
  if (!fs.existsSync(filePath)) return {}
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const record = parsed as Record<string, unknown>
    const out: SecureStoreFile = {}
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === 'string') out[key] = value
    }
    return out
  } catch (error) {
    logger.warn(`[secureStore] failed to load: ${error instanceof Error ? error.message : String(error)}`)
    return {}
  }
}

function saveSecureStore(data: SecureStoreFile): void {
  const filePath = getSecureStorePath()
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  } catch (error) {
    logger.error(`[secureStore] failed to save: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function encryptValue(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    // Why: Some environments (e.g. headless CI) may not provide OS-level encryption. Persist plaintext as fallback
    // to keep the setting functional; SettingsPanel warns this is best-effort.
    return value
  }
  return safeStorage.encryptString(value).toString('base64')
}

function decryptValue(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) return value
  return safeStorage.decryptString(Buffer.from(value, 'base64'))
}

function readSecureStoreValue(key: string): string | null {
  const store = loadSecureStore()
  const raw = store[key]
  if (!raw) return null
  try {
    return decryptValue(raw)
  } catch (error) {
    logger.warn(`[secureStore] decrypt failed: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

ipcMain.handle('secureStore:get', async (_event, key: unknown) => {
  if (typeof key !== 'string' || !key.trim()) return null
  return readSecureStoreValue(key)
})

ipcMain.handle('secureStore:set', async (_event, payload: unknown) => {
  if (!payload || typeof payload !== 'object') return
  const record = payload as { key?: unknown; value?: unknown }
  if (typeof record.key !== 'string' || !record.key.trim()) return
  if (typeof record.value !== 'string') return

  const store = loadSecureStore()
  store[record.key] = encryptValue(record.value)
  saveSecureStore(store)
})

ipcMain.handle('secureStore:delete', async (_event, payload: unknown) => {
  if (!payload || typeof payload !== 'object') return
  const record = payload as { key?: unknown }
  if (typeof record.key !== 'string' || !record.key.trim()) return

  const store = loadSecureStore()
  delete store[record.key]
  saveSecureStore(store)
})

type LocalLlmRunEntry = {
  runId: string
  controller: AbortController
  startedAt: number
}

type NodeLlamaCppModule = typeof import('node-llama-cpp')

type LlamaEngine = {
  modelPath: string
  mod: NodeLlamaCppModule
  model: LlamaModel
  context: LlamaContext
}

function ipcOk<T>(data: T): IpcResponse<T> {
  return { ok: true, data }
}

function ipcErr(code: IpcErrorCode, message: string, details?: unknown, retryable?: boolean): IpcResponse<never> {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(typeof details === 'undefined' ? {} : { details }),
      ...(typeof retryable === 'undefined' ? {} : { retryable }),
    },
  }
}

function coerceString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function coerceNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function coerceBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function coerceStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const out: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (!trimmed) continue
    out.push(trimmed)
  }
  return out.length > 0 ? out : undefined
}

const DEFAULT_LOCAL_LLM_SETTINGS: LocalLlmSettings = {
  enabled: false,
  modelId: 'qwen2.5-0.5b-instruct-q4_k_m',
  maxTokens: 48,
  temperature: 0.4,
  timeoutMs: 15_000,
  idleDelayMs: 800,
}

const LOCAL_LLM_MODELS: LocalLlmModelDescriptor[] = [
  {
    id: 'qwen2.5-0.5b-instruct-q4_k_m',
    label: 'Qwen2.5 0.5B Instruct（Q4_K_M，约 398MB）- 推荐',
    filename: 'Qwen2.5-0.5B-Instruct-Q4_K_M.gguf',
    url: 'https://huggingface.co/medmekk/Qwen2.5-0.5B-Instruct.GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf?download=true',
    sizeBytes: 397_807_936,
    sha256: '750f8f144f0504208add7897f01c7d2350a7363d8855eab59e137a1041e90394',
  },
  {
    id: 'qwen2.5-0.5b-instruct-q2_k',
    label: 'Qwen2.5 0.5B Instruct（Q2_K，约 339MB）- 低配',
    filename: 'Qwen2.5-0.5B-Instruct-Q2_K.gguf',
    url: 'https://huggingface.co/medmekk/Qwen2.5-0.5B-Instruct.GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q2_K.gguf?download=true',
    sizeBytes: 338_607_424,
    sha256: '0183050b0aa6a58c451fb558d3fdfa550c3dd6ba835561805778d30bdd79e44a',
  },
  {
    id: 'custom',
    label: '自定义模型路径（WN_LOCAL_LLM_MODEL_PATH）',
  },
]

class LocalLlmService {
  private settings: LocalLlmSettings = DEFAULT_LOCAL_LLM_SETTINGS
  private state: LocalLlmModelState = { status: 'idle' }
  private engine: LlamaEngine | null = null
  private engineInFlight: Promise<LlamaEngine> | null = null
  private run: LocalLlmRunEntry | null = null
  private downloadInFlight: Promise<void> | null = null
  private downloadModelId: string | null = null
  private downloadController: AbortController | null = null

  constructor(private readonly deps: { logger: typeof logger }) {
    this.settings = this.loadSettings()
  }

  getSettings(): IpcResponse<LocalLlmSettingsGetResponse> {
    return ipcOk({ settings: this.settings, state: this.state })
  }

  listModels(): IpcResponse<LocalLlmModelListResponse> {
    const installedModelIds: string[] = []
    for (const model of LOCAL_LLM_MODELS) {
      const resolved = this.resolveModelPath(model.id)
      if (!resolved) continue
      const modelPath = resolved.modelPath
      if (modelPath && fs.existsSync(modelPath)) installedModelIds.push(model.id)
    }
    return ipcOk({ models: LOCAL_LLM_MODELS, installedModelIds, state: this.state, settings: this.settings })
  }

  updateSettings(raw: unknown): IpcResponse<LocalLlmSettingsUpdateResponse> {
    if (!raw || typeof raw !== 'object') {
      return ipcErr('INVALID_ARGUMENT', 'Invalid settings patch')
    }

    const prevEnabled = this.settings.enabled
    const patch = raw as LocalLlmSettingsUpdateRequest
    const enabled = typeof patch.enabled === 'boolean' ? patch.enabled : undefined
    const modelId = typeof patch.modelId === 'string' ? patch.modelId.trim() : undefined
    const maxTokens = coerceNumber(patch.maxTokens)
    const temperature = coerceNumber(patch.temperature)
    const timeoutMs = coerceNumber(patch.timeoutMs)
    const idleDelayMs = coerceNumber(patch.idleDelayMs)

    const next: LocalLlmSettings = {
      ...this.settings,
      ...(typeof enabled === 'boolean' ? { enabled } : {}),
      ...(modelId ? { modelId } : {}),
      ...(typeof maxTokens === 'number' && maxTokens > 0 ? { maxTokens: Math.floor(maxTokens) } : {}),
      ...(typeof temperature === 'number' && temperature >= 0 ? { temperature } : {}),
      ...(typeof timeoutMs === 'number' && timeoutMs > 0 ? { timeoutMs: Math.floor(timeoutMs) } : {}),
      ...(typeof idleDelayMs === 'number' && idleDelayMs > 0 ? { idleDelayMs: Math.floor(idleDelayMs) } : {}),
    }

    this.settings = next
    this.saveSettings(next)
    this.broadcastSettings()
    if (prevEnabled && !next.enabled && this.run) {
      try {
        this.run.controller.abort('user')
      } catch {
        // ignore
      }
      this.run = null
    }
    return ipcOk({ settings: next })
  }

  async ensureModel(raw: unknown): Promise<IpcResponse<LocalLlmModelEnsureResponse>> {
    if (!raw || typeof raw !== 'object') return ipcErr('INVALID_ARGUMENT', 'Invalid payload')
    const payload = raw as LocalLlmModelEnsureRequest

    const modelId = coerceString(payload.modelId).trim()
    const allowDownload = coerceBoolean(payload.allowDownload)
    if (!modelId) return ipcErr('INVALID_ARGUMENT', 'modelId is required')
    if (allowDownload === null) return ipcErr('INVALID_ARGUMENT', 'allowDownload must be boolean')

    const resolved = this.resolveModelPath(modelId)
    if (!resolved) return ipcErr('NOT_FOUND', 'Model not found', { modelId })

    const { descriptor, modelPath } = resolved

    if (!modelPath) {
      this.setState({ status: 'idle', modelId })
      return ipcErr('MODEL_NOT_READY', 'Model path is not configured', { modelId, envVar: 'WN_LOCAL_LLM_MODEL_PATH' })
    }

    if (!fs.existsSync(modelPath)) {
      if (descriptor.id === 'custom') {
        this.setState({ status: 'idle', modelId, modelPath })
        return ipcErr('MODEL_NOT_READY', 'Custom model file not found', { modelId, modelPath })
      }

      if (!allowDownload) {
        this.setState({ status: 'idle', modelId, modelPath })
        return ipcErr('MODEL_NOT_READY', 'Model not downloaded', { modelId, modelPath })
      }

      if (!descriptor.url || !descriptor.filename || !descriptor.sha256) {
        this.setState({ status: 'idle', modelId, modelPath })
        return ipcErr('UNSUPPORTED', 'Model download is not available for this model', { modelId })
      }

      if (this.downloadInFlight) {
        if (this.downloadModelId !== modelId) {
          return ipcErr('CONFLICT', 'Another model download is in progress', { downloadingModelId: this.downloadModelId })
        }
        try {
          await this.downloadInFlight
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return ipcErr('IO_ERROR', 'Model download failed', { modelId, modelPath, message }, true)
        }
      } else {
        try {
          await this.startModelDownload({ descriptor, modelId, modelPath })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return ipcErr('IO_ERROR', 'Model download failed', { modelId, modelPath, message }, true)
        }
      }
    }

    try {
      await this.ensureEngine(modelPath)
      this.setState({ status: 'ready', modelId, modelPath, progress: undefined, error: undefined })
      return ipcOk({ modelPath })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.setState({ status: 'error', modelId, modelPath, error: { code: 'UPSTREAM_ERROR', message } })
      return ipcErr('UPSTREAM_ERROR', 'Failed to load local model', { modelId, modelPath, message }, true)
    }
  }

  async removeModel(raw: unknown): Promise<IpcResponse<LocalLlmModelRemoveResponse>> {
    if (!raw || typeof raw !== 'object') return ipcErr('INVALID_ARGUMENT', 'Invalid payload')
    const payload = raw as LocalLlmModelRemoveRequest

    const modelId = coerceString(payload.modelId).trim()
    if (!modelId) return ipcErr('INVALID_ARGUMENT', 'modelId is required')

    const resolved = this.resolveModelPath(modelId)
    if (!resolved) return ipcErr('NOT_FOUND', 'Model not found', { modelId })

    const { descriptor, modelPath } = resolved
    if (!modelPath) {
      this.setState({ status: 'idle', modelId })
      return ipcOk({ removed: true })
    }

    if (descriptor.id === 'custom') {
      // Why: Custom model path points to user-managed file; we never delete arbitrary paths.
      this.setState({ status: 'idle', modelId, modelPath })
      return ipcOk({ removed: true })
    }

    if (this.downloadModelId === modelId && this.downloadController) {
      try {
        this.downloadController.abort('user')
      } catch {
        // ignore
      }
    }

    try {
      if (fs.existsSync(modelPath)) fs.rmSync(modelPath, { force: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return ipcErr('IO_ERROR', 'Failed to remove model', { modelId, modelPath, message }, true)
    }

    const engine = this.engine
    if (engine && engine.modelPath === modelPath) {
      this.engine = null
      await this.disposeEngine(engine)
    }

    this.setState({ status: 'idle', modelId, modelPath })
    return ipcOk({ removed: true })
  }

  async complete(raw: unknown): Promise<IpcResponse<LocalLlmTabCompleteResponse>> {
    if (!raw || typeof raw !== 'object') return ipcErr('INVALID_ARGUMENT', 'Invalid payload')
    const payload = raw as Partial<LocalLlmTabCompleteRequest>

    if (!this.settings.enabled) {
      return ipcErr('UNSUPPORTED', 'Local LLM tab completion is disabled', { enabled: false })
    }

    const prefix = coerceString(payload.prefix)
    const suffix = coerceString(payload.suffix)
    if (!prefix.trim()) return ipcErr('INVALID_ARGUMENT', 'prefix is required')

    const maxTokens = coerceNumber(payload.maxTokens) ?? this.settings.maxTokens
    const temperature = coerceNumber(payload.temperature) ?? this.settings.temperature
    const timeoutMs = coerceNumber(payload.timeoutMs) ?? this.settings.timeoutMs
    const stop = coerceStringArray(payload.stop)

    const ensured = await this.ensureModel({ modelId: this.settings.modelId, allowDownload: false })
    if (!ensured.ok) return ensured as IpcResponse<never>

    if (this.run) {
      try {
        this.run.controller.abort('input')
      } catch {
        // ignore
      }
      this.run = null
    }

    const runId = `llm_${Date.now()}_${Math.random().toString(16).slice(2)}`
    const controller = new AbortController()
    const startedAt = Date.now()
    const run: LocalLlmRunEntry = { runId, controller, startedAt }
    this.run = run

    void this.runCompletion(run, {
      prefix,
      suffix,
      maxTokens,
      temperature,
      timeoutMs,
      ...(stop ? { stop } : {}),
    }).catch(() => {
      // Why: Errors are surfaced via stream events; keep the fire-and-forget task best-effort.
    })

    return ipcOk({ runId, startedAt })
  }

  cancel(raw: unknown): IpcResponse<LocalLlmTabCancelResponse> {
    if (!raw || typeof raw !== 'object') return ipcErr('INVALID_ARGUMENT', 'Invalid payload')
    const payload = raw as LocalLlmTabCancelRequest
    const runId = coerceString(payload.runId).trim()
    const reason = coerceString(payload.reason).trim() as LocalLlmTabCancelRequest['reason']
    if (!runId) return ipcErr('INVALID_ARGUMENT', 'runId is required')
    if (reason !== 'user' && reason !== 'input' && reason !== 'timeout') {
      return ipcErr('INVALID_ARGUMENT', 'Invalid cancel reason', { reason })
    }

    const current = this.run
    if (!current || current.runId !== runId) return ipcErr('NOT_FOUND', 'Run not found', { runId })
    try {
      current.controller.abort(reason)
    } catch {
      // ignore
    }
    this.run = null
    return ipcOk({ canceled: true })
  }

  shutdown(): void {
    if (this.run) {
      try {
        this.run.controller.abort('user')
      } catch {
        // ignore
      }
      this.run = null
    }

    if (this.downloadController) {
      try {
        this.downloadController.abort('user')
      } catch {
        // ignore
      }
      this.downloadController = null
    }

    const engine = this.engine
    this.engine = null
    if (engine) {
      void this.disposeEngine(engine).catch(() => undefined)
    }
  }

  private setState(next: LocalLlmModelState): void {
    this.state = next
    this.broadcastState()
  }

  private broadcastState(): void {
    for (const win of BrowserWindow.getAllWindows()) {
      try {
        win.webContents?.send?.('localLlm:state:changed', this.state)
      } catch {
        // ignore
      }
    }
  }

  private broadcastSettings(): void {
    for (const win of BrowserWindow.getAllWindows()) {
      try {
        win.webContents?.send?.('localLlm:settings:changed', this.settings)
      } catch {
        // ignore
      }
    }
  }

  private broadcastStream(event: LocalLlmTabStreamEvent): void {
    for (const win of BrowserWindow.getAllWindows()) {
      try {
        win.webContents?.send?.('localLlm:tab:stream', event)
      } catch {
        // ignore
      }
    }
  }

  private settingsPath(): string {
    return path.join(app.getPath('userData'), 'local-llm-settings.json')
  }

  private loadSettings(): LocalLlmSettings {
    const filePath = this.settingsPath()
    if (!fs.existsSync(filePath)) return DEFAULT_LOCAL_LLM_SETTINGS
    try {
      const raw = fs.readFileSync(filePath, 'utf8')
      const parsed = JSON.parse(raw) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return DEFAULT_LOCAL_LLM_SETTINGS
      const obj = parsed as Record<string, unknown>

      const enabled = typeof obj.enabled === 'boolean' ? obj.enabled : DEFAULT_LOCAL_LLM_SETTINGS.enabled
      const modelId = typeof obj.modelId === 'string' && obj.modelId.trim() ? obj.modelId.trim() : DEFAULT_LOCAL_LLM_SETTINGS.modelId

      const maxTokens = coerceNumber(obj.maxTokens)
      const temperature = coerceNumber(obj.temperature)
      const timeoutMs = coerceNumber(obj.timeoutMs)
      const idleDelayMs = coerceNumber(obj.idleDelayMs)

      return {
        enabled,
        modelId,
        maxTokens: typeof maxTokens === 'number' && maxTokens > 0 ? Math.floor(maxTokens) : DEFAULT_LOCAL_LLM_SETTINGS.maxTokens,
        temperature: typeof temperature === 'number' && temperature >= 0 ? temperature : DEFAULT_LOCAL_LLM_SETTINGS.temperature,
        timeoutMs: typeof timeoutMs === 'number' && timeoutMs > 0 ? Math.floor(timeoutMs) : DEFAULT_LOCAL_LLM_SETTINGS.timeoutMs,
        idleDelayMs: typeof idleDelayMs === 'number' && idleDelayMs > 0 ? Math.floor(idleDelayMs) : DEFAULT_LOCAL_LLM_SETTINGS.idleDelayMs,
      }
    } catch (error) {
      this.deps.logger.warn(`[localLlm] failed to load settings: ${error instanceof Error ? error.message : String(error)}`)
      return DEFAULT_LOCAL_LLM_SETTINGS
    }
  }

  private saveSettings(next: LocalLlmSettings): void {
    const filePath = this.settingsPath()
    try {
      fs.writeFileSync(filePath, JSON.stringify(next, null, 2), 'utf8')
    } catch (error) {
      this.deps.logger.error(`[localLlm] failed to save settings: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private resolveModelPath(modelId: string): { descriptor: LocalLlmModelDescriptor; modelPath: string } | null {
    const descriptor = LOCAL_LLM_MODELS.find((m) => m.id === modelId) ?? null
    if (!descriptor) return null

    if (descriptor.id === 'custom') {
      const envOverride = typeof process.env.WN_LOCAL_LLM_MODEL_PATH === 'string' ? process.env.WN_LOCAL_LLM_MODEL_PATH.trim() : ''
      return { descriptor, modelPath: envOverride }
    }

    const filename = typeof descriptor.filename === 'string' ? descriptor.filename.trim() : ''
    if (!filename) return null

    const modelDir = path.join(app.getPath('userData'), 'models')
    return { descriptor, modelPath: path.join(modelDir, filename) }
  }

  private async startModelDownload(args: {
    descriptor: LocalLlmModelDescriptor
    modelId: string
    modelPath: string
  }): Promise<void> {
    const { descriptor, modelId, modelPath } = args
    if (this.downloadInFlight) {
      await this.downloadInFlight
      return
    }

    const controller = new AbortController()
    this.downloadController = controller
    this.downloadModelId = modelId

    this.downloadInFlight = this.downloadModelToPath({
      descriptor,
      modelId,
      modelPath,
      signal: controller.signal,
    }).finally(() => {
      this.downloadInFlight = null
      this.downloadModelId = null
      this.downloadController = null
    })

    try {
      await this.downloadInFlight
    } catch (error) {
      const isCanceled = controller.signal.aborted
      const code: IpcErrorCode = isCanceled ? 'CANCELED' : 'IO_ERROR'
      const message = error instanceof Error ? error.message : String(error)
      this.setState({ status: 'error', modelId, modelPath, error: { code, message } })
      throw error
    }
  }

  private async downloadModelToPath(args: {
    descriptor: LocalLlmModelDescriptor
    modelId: string
    modelPath: string
    signal: AbortSignal
  }): Promise<void> {
    const { descriptor, modelId, modelPath, signal } = args
    const url = typeof descriptor.url === 'string' ? descriptor.url.trim() : ''
    const expectedSha256 = typeof descriptor.sha256 === 'string' ? descriptor.sha256.trim().toLowerCase() : ''
    if (!url) throw new Error('descriptor.url is required')
    if (!expectedSha256) throw new Error('descriptor.sha256 is required')

    const expectedSizeBytes = typeof descriptor.sizeBytes === 'number' && Number.isFinite(descriptor.sizeBytes) ? descriptor.sizeBytes : undefined
    const dir = path.dirname(modelPath)
    fs.mkdirSync(dir, { recursive: true })

    const tempPath = `${modelPath}.part`
    try {
      if (fs.existsSync(tempPath)) fs.rmSync(tempPath, { force: true })
    } catch {
      // ignore
    }

    this.setState({
      status: 'downloading',
      modelId,
      modelPath,
      progress: { receivedBytes: 0, totalBytes: expectedSizeBytes },
      error: undefined,
    })

    try {
      const res = await fetch(url, { signal })
      if (!res.ok || !res.body) {
        throw new Error(`Download failed (status=${res.status})`)
      }

      const contentLength = Number(res.headers.get('content-length') ?? '')
      const totalBytes = Number.isFinite(contentLength) && contentLength > 0 ? contentLength : expectedSizeBytes

      let receivedBytes = 0
      let lastEmitAt = 0
      const throttleMs = 160

      const updateProgress = () => {
        const now = Date.now()
        if (now - lastEmitAt < throttleMs && receivedBytes < (totalBytes ?? Number.POSITIVE_INFINITY)) return
        lastEmitAt = now
        this.setState({
          status: 'downloading',
          modelId,
          modelPath,
          progress: { receivedBytes, totalBytes },
          error: undefined,
        })
      }

      const progressStream = new Transform({
        transform(chunk, _encoding, callback) {
          receivedBytes += chunk.length
          updateProgress()
          callback(null, chunk)
        },
      })

      await pipeline(
        Readable.fromWeb(res.body as unknown as ReadableStream<Uint8Array>),
        progressStream,
        fs.createWriteStream(tempPath),
      )

      updateProgress()

      if (fs.existsSync(modelPath)) fs.rmSync(modelPath, { force: true })
      fs.renameSync(tempPath, modelPath)

      const stat = fs.statSync(modelPath)
      if (typeof expectedSizeBytes === 'number' && stat.size !== expectedSizeBytes) {
        throw new Error(`Size mismatch (expected=${expectedSizeBytes}, actual=${stat.size})`)
      }

      const actualSha256 = await this.sha256File(modelPath)
      if (actualSha256.toLowerCase() !== expectedSha256) {
        throw new Error(`SHA256 mismatch (expected=${expectedSha256}, actual=${actualSha256})`)
      }

      this.setState({ status: 'idle', modelId, modelPath, progress: undefined, error: undefined })
    } catch (error) {
      try {
        if (fs.existsSync(tempPath)) fs.rmSync(tempPath, { force: true })
      } catch {
        // ignore
      }
      try {
        if (fs.existsSync(modelPath)) fs.rmSync(modelPath, { force: true })
      } catch {
        // ignore
      }
      throw error
    }
  }

  private async sha256File(filePath: string): Promise<string> {
    const hash = createHash('sha256')
    const stream = fs.createReadStream(filePath)
    for await (const chunk of stream) {
      hash.update(chunk as Buffer)
    }
    return hash.digest('hex')
  }

  private async disposeEngine(engine: LlamaEngine): Promise<void> {
    try {
      await engine.context.dispose()
    } catch (error) {
      this.deps.logger.warn(`[localLlm] failed to dispose context: ${error instanceof Error ? error.message : String(error)}`)
    }
    try {
      await engine.model.dispose()
    } catch (error) {
      this.deps.logger.warn(`[localLlm] failed to dispose model: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async ensureEngine(modelPath: string): Promise<LlamaEngine> {
    if (this.engine && this.engine.modelPath === modelPath) return this.engine
    if (this.engineInFlight) return this.engineInFlight

    this.engineInFlight = (async () => {
      const mod = await import('node-llama-cpp')
      const forceCpu = process.env.WN_DISABLE_GPU === '1'
      const llama = await mod.getLlama(forceCpu ? { gpu: false } : undefined)
      const model = await llama.loadModel({ modelPath })
      const context = await model.createContext()
      const engine: LlamaEngine = { modelPath, mod, model, context }
      const prev = this.engine
      this.engine = engine
      if (prev && prev.modelPath !== modelPath) {
        void this.disposeEngine(prev).catch(() => undefined)
      }
      return engine
    })().finally(() => {
      this.engineInFlight = null
    })

    return this.engineInFlight
  }

  private async runCompletion(run: LocalLlmRunEntry, request: LocalLlmTabCompleteRequest): Promise<void> {
    const engine = this.engine
    if (!engine) {
      this.broadcastStream({ type: 'error', runId: run.runId, error: { code: 'MODEL_NOT_READY', message: 'Model not ready' } })
      return
    }

    const startedAt = Date.now()
    const timeoutMs = Number.isFinite(request.timeoutMs) && request.timeoutMs > 0 ? request.timeoutMs : 15_000
    const timeoutId = setTimeout(() => run.controller.abort('timeout'), timeoutMs)

    try {
      const completion = new engine.mod.LlamaCompletion({
        contextSequence: engine.context.getSequence(),
        autoDisposeSequence: true,
      })
      try {
        const opts: LlamaCompletionGenerationOptions = {
          maxTokens: request.maxTokens,
          temperature: request.temperature,
          signal: run.controller.signal,
          stopOnAbortSignal: true,
          customStopTriggers: request.stop && request.stop.length > 0 ? request.stop : ['\n\n'],
          onTextChunk: (chunk: string) => {
            if (!chunk) return
            this.broadcastStream({ type: 'delta', runId: run.runId, text: chunk })
          },
        }

        const hasSuffix = Boolean(request.suffix && request.suffix.trim())
        const output = completion.infillSupported && hasSuffix
          ? await completion.generateInfillCompletion(request.prefix, request.suffix, opts)
          : await completion.generateCompletion(request.prefix, opts)

        if (run.controller.signal.aborted) {
          const reason = String(run.controller.signal.reason ?? 'canceled')
          const code: IpcErrorCode = reason === 'timeout' ? 'TIMEOUT' : 'CANCELED'
          this.broadcastStream({ type: 'error', runId: run.runId, error: { code, message: 'Canceled' } })
          return
        }

        this.broadcastStream({ type: 'done', runId: run.runId, result: output, durationMs: Date.now() - startedAt })
      } finally {
        try {
          completion.dispose({ disposeSequence: true })
        } catch {
          // ignore
        }
      }
    } catch (error) {
      const reason = run.controller.signal.aborted ? String(run.controller.signal.reason ?? 'canceled') : ''
      const code: IpcErrorCode =
        reason === 'timeout' ? 'TIMEOUT' : run.controller.signal.aborted ? 'CANCELED' : 'UPSTREAM_ERROR'
      const message = error instanceof Error ? error.message : String(error)
      this.broadcastStream({ type: 'error', runId: run.runId, error: { code, message } })
      this.deps.logger.warn(`[localLlm] completion failed (${code}): ${message}`)
    } finally {
      clearTimeout(timeoutId)
      if (this.run?.runId === run.runId) {
        this.run = null
      }
    }
  }
}

const localLlmService = new LocalLlmService({ logger })

ipcMain.handle('localLlm:model:list', async () => localLlmService.listModels())
ipcMain.handle('localLlm:model:ensure', async (_event, payload: unknown) => await localLlmService.ensureModel(payload))
ipcMain.handle('localLlm:model:remove', async (_event, payload: unknown) => await localLlmService.removeModel(payload))
ipcMain.handle('localLlm:settings:get', async () => localLlmService.getSettings())
ipcMain.handle('localLlm:settings:update', async (_event, payload: unknown) => localLlmService.updateSettings(payload))
ipcMain.handle('localLlm:tab:complete', async (_event, payload: unknown) => await localLlmService.complete(payload))
ipcMain.handle('localLlm:tab:cancel', async (_event, payload: unknown) => localLlmService.cancel(payload))

/**
 * Resolve the backend entry path for dev and packaged builds to avoid hardcoding a single layout.
 */
function resolveBackendEntry(baseDir: string): { entryPath: string; cwd: string } {
  const candidates = [
    path.join(baseDir, 'lib', 'backend', 'main.js'),
    path.join(baseDir, 'lib', 'backend', 'main.cjs'),
    path.join(baseDir, 'src-gen', 'backend', 'main.js'),
    path.join(baseDir, 'backend', 'main.js'),
    path.join(baseDir, 'main.js'),
  ]

  const entryPath = candidates.find((candidate) => fs.existsSync(candidate))
  if (!entryPath) {
    throw new Error(`Unable to locate backend entry under ${baseDir}`)
  }

  return { entryPath, cwd: baseDir }
}

/**
 * Ensure the backend bundle has access to `schema.sql`.
 * Why: Theia backend bundle loads the schema from `path.join(__dirname, 'schema.sql')` at runtime, but webpack does
 * not automatically copy non-JS assets. We patch the dev layout by copying the source schema next to the bundle.
 */
function ensureBackendSchemaSql(entryPath: string): void {
  const destDir = path.dirname(entryPath)
  const destPath = path.join(destDir, 'schema.sql')
  if (fs.existsSync(destPath)) return

  const repoRoot = path.resolve(app.getAppPath(), '..')
  const candidates = [
    path.join(repoRoot, 'writenow-theia', 'writenow-core', 'src', 'node', 'database', 'schema.sql'),
    path.join(repoRoot, 'writenow-theia', 'writenow-core', 'lib', 'node', 'database', 'schema.sql'),
  ]

  const sourcePath = candidates.find((candidate) => fs.existsSync(candidate))
  if (!sourcePath) {
    throw new Error(`Unable to locate backend schema.sql (tried: ${candidates.join(', ')})`)
  }

  fs.copyFileSync(sourcePath, destPath)
}

/**
 * Ensure the default workspace exists so Theia has a stable root to open.
 */
function ensureWorkspaceDir(): string {
  const workspaceDir = path.join(app.getPath('userData'), 'workspace')
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true })
  }
  return workspaceDir
}

/**
 * Why: Track backend child PID across hard-kills so E2E can clean up stale servers.
 * E2E uses randomized `WN_USER_DATA_DIR` per test, so this file must live in a stable location to prevent
 * port-3000 cascades when a prior test times out before cleanup.
 */
function getBackendPidFilePath(): string {
  return path.join(os.tmpdir(), 'writenow-backend.pid')
}

/**
 * Create the main window only after the backend is reachable.
 */
function createMainWindow(): BrowserWindow {
  if (!fs.existsSync(PRELOAD_PATH)) {
    throw new Error(`Preload bundle not found: ${PRELOAD_PATH}`)
  }

  const window = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    webPreferences: {
      preload: PRELOAD_PATH,
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  window.webContents.on('render-process-gone', (_event, details) => {
    logger.error(`[renderer] render-process-gone reason=${details.reason} exitCode=${details.exitCode}`)
  })

  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logger.error(`[renderer] did-fail-load code=${errorCode} desc=${errorDescription} url=${validatedURL}`)
  })

  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null
    }
  })

  const devServerUrl = process.env.ELECTRON_RENDERER_URL ?? process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    window.loadURL(devServerUrl)
    if (process.env.WN_OPEN_DEVTOOLS !== '0' && process.env.WN_E2E !== '1') {
      window.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    const indexPath = path.join(__dirname, '../../dist/index.html')
    if (!fs.existsSync(indexPath)) {
      throw new Error(`Renderer bundle not found: ${indexPath}`)
    }
    window.loadFile(indexPath)
  }

  window.on('closed', () => {
    mainWindow = null
  })

  return window
}

/**
 * Boot the backend before showing the UI to avoid renderer race conditions.
 */
async function bootstrap(): Promise<void> {
  try {
    const backendBaseDir = app.isPackaged
      ? path.join(process.resourcesPath, 'theia-backend')
      : path.join(app.getAppPath(), '..', 'writenow-theia', 'browser-app')
    const { entryPath, cwd } = resolveBackendEntry(backendBaseDir)
    ensureBackendSchemaSql(entryPath)

    const workspaceDir = ensureWorkspaceDir()

    await backendLauncher.start({
      executablePath: app.isPackaged ? undefined : 'node',
      entryPath,
      cwd,
      env: {
        ...process.env,
        WRITENOW_THEIA_DATA_DIR: app.getPath('userData'),
        ...(process.env.WN_AI_API_KEY ? {} : (() => {
          const key = readSecureStoreValue(AI_KEY_STORAGE_KEY)
          return key ? { WN_AI_API_KEY: key } : {}
        })()),
      },
      port: BACKEND_PORT,
      args: ['--hostname', '127.0.0.1', '--port', String(BACKEND_PORT), workspaceDir],
      pidFilePath: IS_E2E ? getBackendPidFilePath() : undefined,
      cleanupStalePid: IS_E2E,
      preflightPortCheck: IS_E2E,
    })

    mainWindow = createMainWindow()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`[main] failed to start: ${message}`)
    showErrorDialog('启动失败', `应用无法启动：${message}`)
    app.quit()
  }
}

/**
 * Gracefully stop the backend before quitting to avoid orphan processes.
 */
async function shutdown(): Promise<void> {
  try {
    localLlmService.shutdown()
    await backendLauncher.stop()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`[main] backend shutdown failed: ${message}`)
  } finally {
    app.exit(0)
  }
}

app.whenReady().then(() => {
  void bootstrap()
})

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.focus()
    return
  }

  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', (event) => {
  if (isQuitting) {
    return
  }
  isQuitting = true
  event.preventDefault()
  void shutdown()
})
