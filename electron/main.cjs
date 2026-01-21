const { app, BrowserWindow, dialog, ipcMain, safeStorage } = require('electron')
const path = require('path')
const fs = require('fs')

const { initDatabase } = require('./database/init.cjs')
const { createLogger } = require('./lib/logger.cjs')
const config = require('./lib/config.cjs')
const { syncDocumentsToDatabase } = require('./lib/documents-indexer.cjs')
const { EmbeddingService } = require('./lib/embedding-service.cjs')
const { VectorStore } = require('./lib/vector-store.cjs')
const { ensureBuiltinSkills } = require('./lib/skills.cjs')
const { RagIndexer } = require('./lib/rag/indexer.cjs')
const { registerFileIpcHandlers } = require('./ipc/files.cjs')
const { registerUpdateIpcHandlers } = require('./ipc/update.cjs')
const { registerExportIpcHandlers } = require('./ipc/export.cjs')
const { registerClipboardIpcHandlers } = require('./ipc/clipboard.cjs')
const { initSessionLock, clearSessionLock } = require('./lib/session.cjs')
const { registerEmbeddingIpcHandlers } = require('./ipc/embedding.cjs')
const { registerRagIpcHandlers } = require('./ipc/rag.cjs')
const { registerSearchIpcHandlers } = require('./ipc/search.cjs')
const { registerProjectsIpcHandlers } = require('./ipc/projects.cjs')
const { registerCharactersIpcHandlers } = require('./ipc/characters.cjs')
const { registerOutlineIpcHandlers } = require('./ipc/outline.cjs')
const { registerKnowledgeGraphIpcHandlers } = require('./ipc/knowledgeGraph.cjs')
const { registerMemoryIpcHandlers } = require('./ipc/memory.cjs')
const { registerAiIpcHandlers } = require('./ipc/ai.cjs')
const { registerVersionIpcHandlers } = require('./ipc/version.cjs')
const { registerStatsIpcHandlers } = require('./ipc/stats.cjs')
const { registerJudgeIpcHandlers } = require('./ipc/judge.cjs')
const { registerContextIpcHandlers } = require('./ipc/context.cjs')

let logger = null
let db = null
let embeddingService = null
let vectorStore = null
let ragIndexer = null
let shuttingDown = false
let updateService = null
let judgeService = null

function configureUserDataPath() {
  // Must be called before app 'ready'.
  const explicit = typeof process.env.WN_USER_DATA_DIR === 'string' ? process.env.WN_USER_DATA_DIR.trim() : ''
  if (explicit) {
    try {
      app.setPath('userData', explicit)
    } catch {
      // ignore
    }
    return
  }

  try {
    const userDataPath = path.join(app.getPath('appData'), 'WriteNow')
    app.setPath('userData', userDataPath)
  } catch {
    // ignore
  }
}

configureUserDataPath()

if (process.platform === 'win32') {
  try {
    app.setAppUserModelId('com.writenow.app')
  } catch {
    // ignore
  }
}

function isE2E() {
  return process.env.WN_E2E === '1'
}

function shouldShowDialogs() {
  return !isE2E()
}

function ensureAppDirs() {
  const baseDir = app.getPath('userData')
  const dirNames = ['documents', 'data', 'snapshots', 'logs', 'models', 'cache', 'projects']
  for (const dirName of dirNames) {
    fs.mkdirSync(path.join(baseDir, dirName), { recursive: true })
  }
  return baseDir
}

function initLogging() {
  const userDataPath = app.getPath('userData')
  const logFilePath = path.join(userDataPath, 'logs', 'main.log')
  const isDev = process.env.NODE_ENV === 'development' || process.defaultApp
  logger = createLogger({ logFilePath, isDev })
  return logger
}

function toIpcError(error) {
  if (error && typeof error === 'object' && error.ipcError && typeof error.ipcError === 'object') {
    const code = error.ipcError.code
    const message = error.ipcError.message
    const details = error.ipcError.details
    if (typeof code === 'string' && typeof message === 'string') {
      return { code, message, details }
    }
  }

  const nodeCode = error && typeof error === 'object' ? error.code : null
  if (nodeCode === 'ENOENT') return { code: 'NOT_FOUND', message: 'Not found' }
  if (nodeCode === 'EEXIST') return { code: 'ALREADY_EXISTS', message: 'Already exists' }
  if (nodeCode === 'EACCES' || nodeCode === 'EPERM') return { code: 'PERMISSION_DENIED', message: 'Permission denied' }

  if (typeof nodeCode === 'string') return { code: 'IO_ERROR', message: 'I/O error', details: { cause: nodeCode } }
  return { code: 'INTERNAL', message: 'Internal error' }
}

function createInvokeHandler() {
  return (channel, handler) => {
    ipcMain.handle(channel, async (evt, payload) => {
      try {
        const data = await handler(evt, payload)
        return { ok: true, data }
      } catch (error) {
        const ipcError = toIpcError(error)
        logger?.error?.('ipc', 'invoke failed', { channel, code: ipcError.code })
        return { ok: false, error: ipcError }
      }
    })
  }
}

process.on('uncaughtException', (err) => {
  logger?.error?.('main', 'uncaughtException', { message: err?.message, name: err?.name })
  if (shouldShowDialogs()) {
    try {
      dialog.showErrorBox('WriteNow 崩溃', err && err.stack ? err.stack : String(err))
    } catch {
      // ignore
    }
  }
})

process.on('unhandledRejection', (reason) => {
  logger?.error?.('main', 'unhandledRejection', { reason: String(reason?.message || reason || '') })
})

function setupIpc() {
  ipcMain.on('app:renderer-boot', (_evt, payload) => {
    logger?.info?.('renderer', 'boot', payload)
  })

  ipcMain.on('app:renderer-ready', () => {
    logger?.info?.('renderer', 'ready')
  })

  ipcMain.on('app:renderer-log', (_evt, payload) => {
    if (!payload || typeof payload !== 'object') return
    const level = payload.level
    const moduleName = typeof payload.module === 'string' ? payload.module : 'renderer'
    const message = typeof payload.message === 'string' ? payload.message : 'log'
    const details = payload.details

    if (level === 'debug') logger?.debug?.(moduleName, message, details)
    if (level === 'info') logger?.info?.(moduleName, message, details)
    if (level === 'warn') logger?.warn?.(moduleName, message, details)
    if (level === 'error') logger?.error?.(moduleName, message, details)
  })

  ipcMain.on('app:renderer-error', (_evt, payload) => {
    logger?.error?.('renderer', 'error', payload)
    if (shouldShowDialogs()) {
      try {
        dialog.showErrorBox('WriteNow 渲染错误', `${JSON.stringify(payload, null, 2)}\nlog=${logger?.getLogFilePath?.() ?? '(no log file)'}`)
      } catch {
        // ignore
      }
    }
  })

  ipcMain.on('app:renderer-unhandledrejection', (_evt, payload) => {
    logger?.error?.('renderer', 'unhandledrejection', payload)
  })

  ipcMain.on('window:minimize', (evt) => {
    try {
      const win = BrowserWindow.fromWebContents(evt.sender)
      win?.minimize()
    } catch (e) {
      logger?.warn?.('window', 'minimize error', { message: e?.message })
    }
  })

  ipcMain.on('window:maximize', (evt) => {
    try {
      const win = BrowserWindow.fromWebContents(evt.sender)
      if (!win) return
      if (win.isMaximized()) win.unmaximize()
      else win.maximize()
    } catch (e) {
      logger?.warn?.('window', 'maximize error', { message: e?.message })
    }
  })

  ipcMain.on('window:close', (evt) => {
    try {
      const win = BrowserWindow.fromWebContents(evt.sender)
      win?.close()
    } catch (e) {
      logger?.warn?.('window', 'close error', { message: e?.message })
    }
  })

  const handleInvoke = createInvokeHandler()
  registerFileIpcHandlers(ipcMain, {
    handleInvoke,
    db,
    logger,
    log: (...args) => logger?.info?.('file', args.map((a) => String(a)).join(' ')),
    onDocumentCreated: (articleId) => ragIndexer?.enqueueArticle?.(articleId),
    onDocumentSaved: (articleId) => ragIndexer?.enqueueArticle?.(articleId),
    onDocumentDeleted: (articleId) => ragIndexer?.handleDeletedArticle?.(articleId),
  })

  registerStatsIpcHandlers(ipcMain, {
    handleInvoke,
    db,
    logger,
  })

  registerSearchIpcHandlers(ipcMain, {
    handleInvoke,
    db,
    logger,
    embeddingService,
    vectorStore,
  })

  registerProjectsIpcHandlers(ipcMain, {
    handleInvoke,
    db,
    logger,
  })

  registerCharactersIpcHandlers(ipcMain, {
    handleInvoke,
    db,
    logger,
  })

  registerOutlineIpcHandlers(ipcMain, {
    handleInvoke,
    db,
    logger,
  })

  registerKnowledgeGraphIpcHandlers(ipcMain, {
    handleInvoke,
    db,
    logger,
  })

  registerMemoryIpcHandlers(ipcMain, {
    handleInvoke,
    db,
    logger,
    config,
  })

  registerEmbeddingIpcHandlers(ipcMain, {
    handleInvoke,
    embeddingService,
    vectorStore,
  })

  registerAiIpcHandlers(ipcMain, {
    handleInvoke,
    db,
    logger,
    config,
  })

  registerContextIpcHandlers(ipcMain, {
    handleInvoke,
  })

  registerVersionIpcHandlers(ipcMain, {
    handleInvoke,
    db,
    logger,
  })

  registerRagIpcHandlers(ipcMain, {
    handleInvoke,
    db,
    logger,
    embeddingService,
    vectorStore,
    ragIndexer,
  })

  updateService = registerUpdateIpcHandlers(ipcMain, {
    app,
    config,
    logger,
    handleInvoke,
  })

  registerExportIpcHandlers(ipcMain, { handleInvoke, logger })
  registerClipboardIpcHandlers(ipcMain, { handleInvoke })

  judgeService = registerJudgeIpcHandlers(ipcMain, {
    app,
    config,
    logger,
    handleInvoke,
  })
}

async function createMainWindow() {
  logger?.info?.('main', 'creating window', { isPackaged: app.isPackaged, platform: process.platform })

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    backgroundColor: '#0b0d10',
    title: 'WriteNow',
    frame: false,
    transparent: false,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs')
    },
    titleBarStyle:
      process.platform === 'darwin'
        ? 'hiddenInset'
        : process.platform === 'win32'
          ? 'hidden'
          : 'default'
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  // 错误处理
  win.webContents.on('console-message', (_evt, level, message, line, sourceId) => {
    logger?.debug?.('renderer', 'console', { level, message, sourceId, line })
  })

  win.webContents.on('render-process-gone', (_evt, details) => {
    logger?.error?.('renderer', 'render-process-gone', details)
    if (shouldShowDialogs()) {
      try {
        dialog.showErrorBox(
          'WriteNow 渲染进程崩溃',
          `reason=${details?.reason ?? 'unknown'} exitCode=${details?.exitCode ?? 'unknown'}\nlog=${logger?.getLogFilePath?.() ?? '(no log file)'}`
        )
      } catch {
        // ignore
      }
    }
  })

  win.webContents.on('did-fail-load', (_evt, errorCode, errorDescription, validatedURL, isMainFrame) => {
    logger?.error?.('renderer', 'did-fail-load', { errorCode, errorDescription, validatedURL, isMainFrame })
    if (isMainFrame && shouldShowDialogs()) {
      try {
        dialog.showErrorBox(
          'WriteNow 页面加载失败',
          `${errorCode} ${errorDescription}\nurl=${validatedURL}\nlog=${logger?.getLogFilePath?.() ?? '(no log file)'}`
        )
      } catch {
        // ignore
      }
    }
  })

  win.webContents.on('dom-ready', () => {
    logger?.debug?.('renderer', 'dom-ready')
  })

  win.webContents.on('did-finish-load', () => {
    logger?.info?.('renderer', 'did-finish-load', { url: win.webContents.getURL() })
  })

  // 加载页面
  const explicitUrl = typeof process.env.WN_RENDERER_URL === 'string' ? process.env.WN_RENDERER_URL.trim() : ''
  const isDev = process.env.NODE_ENV === 'development' || process.defaultApp
  if (explicitUrl) {
    logger?.info?.('main', 'loading explicit renderer url', { url: explicitUrl })
    await win.loadURL(explicitUrl)
    return
  }

  if (isDev && !isE2E()) {
    const devUrl = typeof process.env.WN_DEV_URL === 'string' ? process.env.WN_DEV_URL.trim() : 'http://localhost:5173'
    logger?.info?.('main', 'loading dev url', { url: devUrl })
    await win.loadURL(devUrl)
    if (process.env.WN_OPEN_DEVTOOLS !== '0') win.webContents.openDevTools()
    return
  }

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html')
  logger?.info?.('main', 'loading renderer file', { indexPath })

  if (!fs.existsSync(indexPath)) {
    logger?.error?.('main', 'index.html not found', { indexPath })
    if (shouldShowDialogs()) {
      dialog.showErrorBox('WriteNow 启动失败', `找不到 index.html: ${indexPath}`)
    }
    return
  }

  await win.loadFile(indexPath)
}

app.whenReady().then(async () => {
  try {
    ensureAppDirs()
    initLogging()
    await initSessionLock({ log: (message, details) => logger?.info?.('session', message, details) })
    db = initDatabase({ userDataPath: app.getPath('userData') })
    config.initConfig({ db, logger, safeStorage })
    ensureBuiltinSkills(db, logger)
    embeddingService = new EmbeddingService({ userDataDir: app.getPath('userData'), logger })
    vectorStore = new VectorStore({ db, logger })
    ragIndexer = new RagIndexer({ db, logger, embeddingService, vectorStore })
    await syncDocumentsToDatabase(db, path.join(app.getPath('userData'), 'documents'), logger).catch((e) =>
      logger?.warn?.('indexer', 'startup sync failed', { message: e?.message })
    )
    setupIpc()
    logger?.info?.('main', 'app ready', { userData: app.getPath('userData') })
    await createMainWindow()
    updateService?.startBackgroundCheck?.()
    judgeService?.startBackgroundModelDownload?.()
  } catch (e) {
    logger?.error?.('main', 'startup error', { message: e?.message })
    if (shouldShowDialogs()) dialog.showErrorBox('WriteNow 启动失败', String(e))
    app.exit(1)
  }
})

async function gracefulShutdown(exitCode) {
  if (shuttingDown) return
  shuttingDown = true

  try {
    await embeddingService?.close?.()
  } catch {
    // ignore
  }

  try {
    await clearSessionLock({ log: (message, details) => logger?.info?.('session', message, details) })
  } catch {
    // ignore
  }

  try {
    db?.close?.()
  } catch {
    // ignore
  }

  try {
    await logger?.flush?.()
  } catch {
    // ignore
  }

  try {
    await logger?.close?.()
  } catch {
    // ignore
  }

  app.exit(exitCode)
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow().catch((e) => logger?.error?.('main', 'activate error', { message: e?.message }))
  }
})

app.on('before-quit', (event) => {
  if (shuttingDown) return
  event.preventDefault()
  gracefulShutdown(0).catch(() => app.exit(0))
})
