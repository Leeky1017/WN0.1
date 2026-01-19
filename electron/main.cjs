const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const util = require('util')
const { registerFileIpcHandlers } = require('./ipc/files.cjs')

let desiredUserDataPath = null

function configureUserDataPath() {
  // Avoid sharing userData with legacy builds (and avoid Cache/GPUCache permission issues).
  // Must be called before app 'ready'.
  const isDev = process.env.NODE_ENV === 'development' || process.defaultApp
  if (isDev) return

  try {
    const userDataPath =
      process.platform === 'win32'
        ? path.join(process.env.LOCALAPPDATA || process.env.APPDATA || process.cwd(), 'WriteNow-v2')
        : path.join(app.getPath('appData'), 'WriteNow-v2')
    desiredUserDataPath = userDataPath
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

// 日志系统
let logStream = null
let logPath = null

function initLogging() {
  try {
    const logsDir = path.join(app.getPath('userData'), 'logs')
    fs.mkdirSync(logsDir, { recursive: true })
    logPath = path.join(logsDir, 'main.log')
    logStream = fs.createWriteStream(logPath, { flags: 'a' })
  } catch {
    // ignore
  }
}

function log(...args) {
  const msg = util.format(...args)
  try {
    console.log(msg)
  } catch {
    // ignore
  }
  try {
    if (logStream) logStream.write(`[${new Date().toISOString()}] ${msg}\n`)
  } catch {
    // ignore
  }
}

process.on('uncaughtException', (err) => {
  log('[main] uncaughtException:', err && err.stack ? err.stack : String(err))
  try {
    dialog.showErrorBox('WriteNow 崩溃', err && err.stack ? err.stack : String(err))
  } catch {
    // ignore
  }
})

process.on('unhandledRejection', (reason) => {
  log('[main] unhandledRejection:', reason && reason.stack ? reason.stack : String(reason))
})

function setupIpc() {
  ipcMain.on('app:renderer-boot', (_evt, payload) => {
    log('[renderer] boot:', payload)
  })

  ipcMain.on('app:renderer-ready', () => {
    log('[renderer] ready')
  })

  ipcMain.on('app:renderer-error', (_evt, payload) => {
    log('[renderer] error:', payload)
    try {
      dialog.showErrorBox('WriteNow 渲染错误', `${JSON.stringify(payload, null, 2)}\nlog=${logPath ?? '(no log file)'}`)
    } catch {
      // ignore
    }
  })

  ipcMain.on('app:renderer-unhandledrejection', (_evt, payload) => {
    log('[renderer] unhandledrejection:', payload)
  })

  ipcMain.on('window:minimize', (evt) => {
    try {
      const win = BrowserWindow.fromWebContents(evt.sender)
      win?.minimize()
    } catch (e) {
      log('[window] minimize error:', e)
    }
  })

  ipcMain.on('window:maximize', (evt) => {
    try {
      const win = BrowserWindow.fromWebContents(evt.sender)
      if (!win) return
      if (win.isMaximized()) win.unmaximize()
      else win.maximize()
    } catch (e) {
      log('[window] maximize error:', e)
    }
  })

  ipcMain.on('window:close', (evt) => {
    try {
      const win = BrowserWindow.fromWebContents(evt.sender)
      win?.close()
    } catch (e) {
      log('[window] close error:', e)
    }
  })

  registerFileIpcHandlers(ipcMain, { log })
}

async function createMainWindow() {
  log('[main] creating window, isPackaged=%s, platform=%s', app.isPackaged, process.platform)
  log('[main] __dirname:', __dirname)

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
    log('[renderer][console]', { level, message, sourceId, line })
  })

  win.webContents.on('render-process-gone', (_evt, details) => {
    log('[renderer] render-process-gone:', details)
    try {
      dialog.showErrorBox(
        'WriteNow 渲染进程崩溃',
        `reason=${details?.reason ?? 'unknown'} exitCode=${details?.exitCode ?? 'unknown'}\nlog=${logPath ?? '(no log file)'}`
      )
    } catch {
      // ignore
    }
  })

  win.webContents.on('did-fail-load', (_evt, errorCode, errorDescription, validatedURL, isMainFrame) => {
    log('[renderer] did-fail-load:', { errorCode, errorDescription, validatedURL, isMainFrame })
    if (isMainFrame) {
      try {
        dialog.showErrorBox(
          'WriteNow 页面加载失败',
          `${errorCode} ${errorDescription}\nurl=${validatedURL}\nlog=${logPath ?? '(no log file)'}`
        )
      } catch {
        // ignore
      }
    }
  })

  win.webContents.on('dom-ready', () => {
    log('[renderer] dom-ready')
  })

  win.webContents.on('did-finish-load', () => {
    log('[renderer] did-finish-load:', win.webContents.getURL())
  })

  // 加载页面
  if (!app.isPackaged) {
    // 开发模式
    log('[main] loading dev URL: http://localhost:5173')
    await win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    // 生产模式 - dist 在 asar 中与 electron 同级
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html')
    log('[main] loading production file:', indexPath)

    // 检查文件是否存在
    try {
      if (fs.existsSync(indexPath)) {
        log('[main] index.html found')
      } else {
        log('[main] index.html NOT found!')
        dialog.showErrorBox('WriteNow 启动失败', `找不到 index.html: ${indexPath}`)
        return
      }
    } catch (e) {
      log('[main] fs.existsSync error:', e)
    }

    await win.loadFile(indexPath)
  }

  if (logPath) log('[main] log file:', logPath)
}

app.whenReady().then(async () => {
  try {
    initLogging()
    setupIpc()
    log('[main] app ready')
    if (desiredUserDataPath) {
      try {
        log('[main] userData:', app.getPath('userData'))
        log('[main] desired userData:', desiredUserDataPath)
      } catch {
        // ignore
      }
    }
    await createMainWindow()
  } catch (e) {
    log('[main] startup error:', e)
    dialog.showErrorBox('WriteNow 启动失败', String(e))
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow().catch(e => log('[main] activate error:', e))
  }
})
