import { app, BrowserWindow, dialog, ipcMain, safeStorage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { BackendLauncher } from './services/backendLauncher'

const BACKEND_PORT = 3000
const WINDOW_WIDTH = 1400
const WINDOW_HEIGHT = 900
const PRELOAD_PATH = path.join(__dirname, '../preload/index.cjs')
const SECURE_STORE_FILENAME = 'secure-store.json'
const AI_KEY_STORAGE_KEY = 'writenow_ai_api_key_v1'

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

const backendLauncher = new BackendLauncher({
  logger,
  onUnexpectedExit: ({ code, signal }) => {
    const detail = `code=${code ?? 'null'} signal=${signal ?? 'null'}`
    logger.error(`[backend] crashed (${detail})`)
    dialog.showErrorBox('后端已退出', `Theia 后端意外退出（${detail}）。请重启应用。`)
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
    })

    mainWindow = createMainWindow()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`[main] failed to start: ${message}`)
    dialog.showErrorBox('启动失败', `应用无法启动：${message}`)
    app.quit()
  }
}

/**
 * Gracefully stop the backend before quitting to avoid orphan processes.
 */
async function shutdown(): Promise<void> {
  try {
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
