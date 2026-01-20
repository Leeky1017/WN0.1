const { BrowserWindow } = require('electron')
const { autoUpdater } = require('electron-updater')

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function nowIso() {
  return new Date().toISOString()
}

function coerceString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function toUpdateInfo(info) {
  if (!info || typeof info !== 'object') return null
  const version = coerceString(info.version)
  if (!version) return null

  const notesRaw = info.releaseNotes
  const notes =
    typeof notesRaw === 'string'
      ? notesRaw.trim() || undefined
      : Array.isArray(notesRaw)
        ? notesRaw.map((n) => (typeof n === 'string' ? n : n?.note)).filter(Boolean).join('\n') || undefined
        : typeof notesRaw === 'object' && notesRaw && typeof notesRaw.note === 'string'
          ? notesRaw.note.trim() || undefined
          : undefined

  const publishedAtRaw = info.releaseDate
  const publishedAt =
    typeof publishedAtRaw === 'string' && publishedAtRaw.trim()
      ? new Date(publishedAtRaw).toISOString()
      : publishedAtRaw instanceof Date
        ? publishedAtRaw.toISOString()
        : nowIso()

  return { version, notes, publishedAt }
}

function generateDownloadId() {
  const rand = Math.random().toString(16).slice(2, 10)
  return `dl_${Date.now()}_${rand}`
}

function sanitizeError(err) {
  if (err && typeof err === 'object' && err.ipcError && typeof err.ipcError === 'object') {
    return {
      code: err.ipcError.code,
      message: err.ipcError.message,
      details: err.ipcError.details,
      retryable: err.ipcError.retryable,
    }
  }

  const message = err && typeof err === 'object' && typeof err.message === 'string' ? err.message : String(err || '')
  return { code: 'UPSTREAM_ERROR', message: message || 'Upstream error' }
}

function getSkippedVersion(config) {
  const value = config?.get?.('update.skippedVersion')
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function registerUpdateIpcHandlers(ipcMain, options = {}) {
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)
  const logger = options.logger ?? null
  const config = options.config ?? null
  const app = options.app
  if (!app || typeof app.getVersion !== 'function') throw new Error('registerUpdateIpcHandlers requires { app }')

  const getWindows = typeof options.getWindows === 'function' ? options.getWindows : () => BrowserWindow.getAllWindows()

  let state = {
    status: 'idle',
    currentVersion: app.getVersion(),
    skippedVersion: getSkippedVersion(config),
  }

  function broadcast() {
    const windows = getWindows()
    for (const win of windows) {
      try {
        win.webContents?.send?.('update:stateChanged', state)
      } catch {
        // ignore
      }
    }
  }

  function setState(patch) {
    state = { ...state, ...patch }
    broadcast()
  }

  function ensurePackaged() {
    if (app.isPackaged) return
    throw createIpcError('UNSUPPORTED', 'Updates are only available in packaged builds', { isPackaged: app.isPackaged })
  }

  function isSkipped(version) {
    const skippedVersion = getSkippedVersion(config)
    return Boolean(skippedVersion && skippedVersion === version)
  }

  function attachAutoUpdaterEvents() {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false

    autoUpdater.on('checking-for-update', () => {
      logger?.info?.('update', 'checking-for-update')
      setState({ status: 'checking', lastCheckedAt: nowIso(), error: undefined, progress: undefined })
    })

    autoUpdater.on('update-available', (info) => {
      const latest = toUpdateInfo(info)
      if (!latest) {
        setState({ status: 'available', lastCheckedAt: nowIso() })
        return
      }

      if (isSkipped(latest.version)) {
        logger?.info?.('update', 'available but skipped', { version: latest.version })
        setState({
          status: 'not_available',
          latest,
          lastCheckedAt: nowIso(),
          skippedVersion: latest.version,
          progress: undefined,
          error: undefined,
          downloadId: undefined,
        })
        return
      }

      const downloadId = generateDownloadId()
      logger?.info?.('update', 'available, start download', { version: latest.version, downloadId })
      setState({
        status: 'downloading',
        latest,
        lastCheckedAt: nowIso(),
        progress: undefined,
        error: undefined,
        downloadId,
      })

      autoUpdater.downloadUpdate().catch((err) => {
        logger?.error?.('update', 'downloadUpdate failed', { message: err?.message })
        setState({ status: 'error', error: sanitizeError(err) })
      })
    })

    autoUpdater.on('update-not-available', () => {
      logger?.info?.('update', 'update-not-available')
      setState({
        status: 'not_available',
        latest: undefined,
        lastCheckedAt: nowIso(),
        progress: undefined,
        error: undefined,
        downloadId: undefined,
      })
    })

    autoUpdater.on('download-progress', (progress) => {
      const percent = typeof progress?.percent === 'number' ? progress.percent : 0
      const transferred = typeof progress?.transferred === 'number' ? progress.transferred : 0
      const total = typeof progress?.total === 'number' ? progress.total : 0
      const bytesPerSecond = typeof progress?.bytesPerSecond === 'number' ? progress.bytesPerSecond : 0
      setState({
        status: 'downloading',
        progress: { percent, transferred, total, bytesPerSecond },
      })
    })

    autoUpdater.on('update-downloaded', () => {
      logger?.info?.('update', 'update-downloaded')
      setState({ status: 'downloaded', progress: undefined })
    })

    autoUpdater.on('error', (err) => {
      logger?.error?.('update', 'autoUpdater error', { message: err?.message })
      setState({ status: 'error', error: sanitizeError(err), progress: undefined })
    })
  }

  let didAttach = false
  function ensureAttached() {
    if (didAttach) return
    didAttach = true
    attachAutoUpdaterEvents()
  }

  async function checkForUpdates(payload = {}) {
    ensureAttached()
    ensurePackaged()

    const allowPrerelease = Boolean(payload.allowPrerelease)
    const channel = payload.channel
    if (typeof channel !== 'undefined' && channel !== 'stable' && channel !== 'beta') {
      throw createIpcError('INVALID_ARGUMENT', 'Invalid channel', { channel })
    }

    autoUpdater.allowPrerelease = allowPrerelease || channel === 'beta'

    const result = await autoUpdater.checkForUpdates()
    const latest = toUpdateInfo(result?.updateInfo)
    const currentVersion = app.getVersion()

    if (!latest) {
      return { currentVersion, available: false }
    }

    if (isSkipped(latest.version)) {
      return { currentVersion, available: false }
    }

    return { currentVersion, available: true, latest }
  }

  async function downloadUpdate(payload = {}) {
    ensureAttached()
    ensurePackaged()

    const version = coerceString(payload.version)
    if (!version) throw createIpcError('INVALID_ARGUMENT', 'Invalid version', { version: payload.version })

    const latest = state.latest
    if (!latest || typeof latest.version !== 'string' || !latest.version) {
      throw createIpcError('NOT_FOUND', 'No update info available; run update:check first')
    }

    if (latest.version !== version) {
      throw createIpcError('CONFLICT', 'Requested version does not match latest', { version, latest: latest.version })
    }

    if (isSkipped(version)) {
      throw createIpcError('CONFLICT', 'Version is skipped', { version })
    }

    if (state.status === 'downloading') return { downloadId: state.downloadId }

    const downloadId = generateDownloadId()
    setState({ status: 'downloading', downloadId, error: undefined, progress: undefined })
    await autoUpdater.downloadUpdate()
    return { downloadId }
  }

  async function installUpdate(payload = {}) {
    ensureAttached()
    ensurePackaged()

    const downloadId = coerceString(payload.downloadId)
    if (!downloadId) throw createIpcError('INVALID_ARGUMENT', 'Invalid downloadId', { downloadId: payload.downloadId })

    if (state.status !== 'downloaded') {
      throw createIpcError('CONFLICT', 'Update is not ready to install', { status: state.status })
    }

    if (state.downloadId && state.downloadId !== downloadId) {
      throw createIpcError('NOT_FOUND', 'downloadId not found', { downloadId })
    }

    setTimeout(() => {
      try {
        autoUpdater.quitAndInstall()
      } catch (err) {
        logger?.error?.('update', 'quitAndInstall failed', { message: err?.message })
      }
    }, 0)

    return { willRestart: true }
  }

  function skipVersion(payload = {}) {
    const version = coerceString(payload.version)
    if (!version) throw createIpcError('INVALID_ARGUMENT', 'Invalid version', { version: payload.version })
    config?.set?.('update.skippedVersion', version)
    logger?.info?.('update', 'skip version', { version })
    setState({ skippedVersion: version })
    return { skippedVersion: version }
  }

  function clearSkipped() {
    config?.set?.('update.skippedVersion', null)
    logger?.info?.('update', 'clear skipped version')
    setState({ skippedVersion: null })
    return { cleared: true }
  }

  handleInvoke('update:getState', async () => state)
  handleInvoke('update:check', async (_evt, payload) => checkForUpdates(payload))
  handleInvoke('update:download', async (_evt, payload) => downloadUpdate(payload))
  handleInvoke('update:install', async (_evt, payload) => installUpdate(payload))
  handleInvoke('update:skipVersion', async (_evt, payload) => skipVersion(payload))
  handleInvoke('update:clearSkipped', async () => clearSkipped())

  function startBackgroundCheck() {
    setTimeout(() => {
      checkForUpdates({ channel: 'stable' }).catch((err) => {
        setState({ status: 'error', error: sanitizeError(err), lastCheckedAt: nowIso() })
      })
    }, 1500)
  }

  return {
    startBackgroundCheck,
    getState: () => state,
  }
}

module.exports = { registerUpdateIpcHandlers }

