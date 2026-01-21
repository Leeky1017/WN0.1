const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')

const { app, BrowserWindow } = require('electron')

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function coerceString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function ensureSafeFileName(fileName) {
  const raw = coerceString(fileName)
  if (!raw) throw createIpcError('INVALID_ARGUMENT', 'Invalid file name', { fileName })

  const base = path.basename(raw)
  if (base !== raw) throw createIpcError('INVALID_ARGUMENT', 'Invalid file name', { fileName })
  if (base === '.' || base === '..') throw createIpcError('INVALID_ARGUMENT', 'Invalid file name', { fileName })
  if (!base.toLowerCase().endsWith('.md')) throw createIpcError('INVALID_ARGUMENT', 'Only .md files are supported', { fileName })
  return base
}

function getProjectsDir() {
  return path.join(app.getPath('userData'), 'projects')
}

function getProjectDir(projectId) {
  const id = coerceString(projectId)
  if (!id) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
  return path.join(getProjectsDir(), id)
}

function getWritenowRoot(projectId) {
  return path.join(getProjectDir(projectId), '.writenow')
}

function getWritenowRulesDir(projectId) {
  return path.join(getWritenowRoot(projectId), 'rules')
}

function getWritenowCharactersDir(projectId) {
  return path.join(getWritenowRoot(projectId), 'characters')
}

function getWritenowSettingsDir(projectId) {
  return path.join(getWritenowRoot(projectId), 'settings')
}

function getWritenowConversationsDir(projectId) {
  return path.join(getWritenowRoot(projectId), 'conversations')
}

function getWritenowCacheDir(projectId) {
  return path.join(getWritenowRoot(projectId), 'cache')
}

function toRelPath(projectId, absolutePath) {
  const root = getWritenowRoot(projectId)
  const rel = path.relative(root, absolutePath)
  return rel.replaceAll(path.sep, '/')
}

async function pathExists(p) {
  try {
    await fsp.access(p)
    return true
  } catch {
    return false
  }
}

async function safeReadUtf8(filePath) {
  try {
    const stat = await fsp.stat(filePath)
    const content = await fsp.readFile(filePath, 'utf8')
    const updatedAtMs = typeof stat.mtimeMs === 'number' ? stat.mtimeMs : null
    return { ok: true, content, updatedAtMs }
  } catch (error) {
    const code = error && typeof error === 'object' ? error.code : null
    if (code === 'ENOENT') return { ok: false, error: { code: 'NOT_FOUND', message: 'Not found' } }
    return { ok: false, error: { code: 'IO_ERROR', message: 'I/O error', details: { cause: String(code || '') } } }
  }
}

async function safeReadJsonUtf8(filePath) {
  const raw = await safeReadUtf8(filePath)
  if (!raw.ok) return raw
  try {
    JSON.parse(raw.content)
    return raw
  } catch (error) {
    return {
      ok: false,
      error: { code: 'INVALID_ARGUMENT', message: 'Invalid JSON', details: { message: error?.message } },
    }
  }
}

function broadcast(event, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    try {
      win.webContents.send(event, payload)
    } catch {
      // ignore
    }
  }
}

const projectState = new Map()

function getOrCreateState(projectId) {
  const id = coerceString(projectId)
  if (!id) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')

  const existing = projectState.get(id)
  if (existing) return existing

  const state = {
    projectId: id,
    rules: { loadedAtMs: null, fragments: [], errors: [] },
    settingsIndex: { loadedAtMs: null, characters: [], settings: [], errors: [] },
    watching: false,
    watchers: [],
    pending: null,
    pendingChanged: new Set(),
  }
  projectState.set(id, state)
  return state
}

async function ensureWritenowScaffold(projectId) {
  const root = getWritenowRoot(projectId)
  const dirs = [
    root,
    getWritenowRulesDir(projectId),
    getWritenowCharactersDir(projectId),
    getWritenowSettingsDir(projectId),
    getWritenowConversationsDir(projectId),
    getWritenowCacheDir(projectId),
  ]

  for (const dir of dirs) {
    await fsp.mkdir(dir, { recursive: true })
  }
  const projectJsonPath = path.join(root, 'project.json')
  if (!(await pathExists(projectJsonPath))) {
    await fsp.writeFile(projectJsonPath, JSON.stringify({ version: 1 }, null, 2) + '\n', 'utf8').catch(() => undefined)
  }
  return { rootPath: root }
}

async function loadRulesCache(projectId) {
  const state = getOrCreateState(projectId)
  await ensureWritenowScaffold(projectId)

  const rulesDir = getWritenowRulesDir(projectId)
  const files = [
    { kind: 'style', name: 'style.md', reader: safeReadUtf8 },
    { kind: 'terminology', name: 'terminology.json', reader: safeReadJsonUtf8 },
    { kind: 'constraints', name: 'constraints.json', reader: safeReadJsonUtf8 },
  ]

  const fragments = []
  const errors = []

  for (const file of files) {
    const fullPath = path.join(rulesDir, file.name)
    const result = await file.reader(fullPath)
    const relPath = toRelPath(projectId, fullPath)
    if (result.ok) {
      fragments.push({
        kind: file.kind,
        path: relPath,
        content: result.content,
        updatedAtMs: result.updatedAtMs,
      })
    } else {
      errors.push({
        path: relPath,
        code: result.error.code,
        message: result.error.message,
        details: result.error.details,
      })
    }
  }

  state.rules = {
    loadedAtMs: Date.now(),
    fragments,
    errors,
  }
  return state.rules
}

async function loadSettingsIndex(projectId) {
  const state = getOrCreateState(projectId)
  await ensureWritenowScaffold(projectId)

  const charactersDir = getWritenowCharactersDir(projectId)
  const settingsDir = getWritenowSettingsDir(projectId)

  const errors = []
  const listMd = async (dirPath) => {
    try {
      const entries = await fsp.readdir(dirPath, { withFileTypes: true })
      return entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md')).map((e) => e.name)
    } catch (error) {
      const code = error && typeof error === 'object' ? error.code : null
      errors.push({
        path: toRelPath(projectId, dirPath),
        code: code === 'ENOENT' ? 'NOT_FOUND' : 'IO_ERROR',
        message: code === 'ENOENT' ? 'Not found' : 'I/O error',
        details: { cause: String(code || '') },
      })
      return []
    }
  }

  const characters = await listMd(charactersDir)
  const settings = await listMd(settingsDir)
  characters.sort((a, b) => a.localeCompare(b))
  settings.sort((a, b) => a.localeCompare(b))

  state.settingsIndex = {
    loadedAtMs: Date.now(),
    characters,
    settings,
    errors,
  }
  return state.settingsIndex
}

async function readSettingsFiles(projectId, payload) {
  const state = getOrCreateState(projectId)
  await ensureWritenowScaffold(projectId)

  const requestedCharacters = Array.isArray(payload?.characters) ? payload.characters : []
  const requestedSettings = Array.isArray(payload?.settings) ? payload.settings : []

  const files = []
  const errors = []

  for (const name of requestedCharacters) {
    const safe = ensureSafeFileName(name)
    const fullPath = path.join(getWritenowCharactersDir(projectId), safe)
    const result = await safeReadUtf8(fullPath)
    const relPath = toRelPath(projectId, fullPath)
    if (result.ok) {
      files.push({ path: relPath, content: result.content, updatedAtMs: result.updatedAtMs })
    } else {
      errors.push({ path: relPath, code: result.error.code, message: result.error.message, details: result.error.details })
    }
  }

  for (const name of requestedSettings) {
    const safe = ensureSafeFileName(name)
    const fullPath = path.join(getWritenowSettingsDir(projectId), safe)
    const result = await safeReadUtf8(fullPath)
    const relPath = toRelPath(projectId, fullPath)
    if (result.ok) {
      files.push({ path: relPath, content: result.content, updatedAtMs: result.updatedAtMs })
    } else {
      errors.push({ path: relPath, code: result.error.code, message: result.error.message, details: result.error.details })
    }
  }

  state.settingsIndex = state.settingsIndex?.loadedAtMs ? state.settingsIndex : await loadSettingsIndex(projectId)
  return { files, errors }
}

function scheduleProjectRefresh(projectId, changedRelPath) {
  const state = getOrCreateState(projectId)
  if (typeof changedRelPath === 'string' && changedRelPath.trim()) state.pendingChanged.add(changedRelPath)
  if (state.pending) clearTimeout(state.pending)

  state.pending = setTimeout(async () => {
    state.pending = null
    const changed = [...state.pendingChanged]
    state.pendingChanged.clear()

    const didTouchRules = changed.some((p) => p.startsWith('rules/')) || changed.length === 0
    const didTouchSettings =
      changed.some((p) => p.startsWith('characters/') || p.startsWith('settings/')) || changed.length === 0

    if (didTouchRules) {
      try {
        await loadRulesCache(projectId)
      } catch {
        // ignore
      }
    }
    if (didTouchSettings) {
      try {
        await loadSettingsIndex(projectId)
      } catch {
        // ignore
      }
    }

    broadcast('context:writenow:changed', { projectId, changedPaths: changed, atMs: Date.now() })
  }, 120)
}

async function startWatch(projectId) {
  const state = getOrCreateState(projectId)
  if (state.watching) return { watching: true }
  await ensureWritenowScaffold(projectId)
  await loadRulesCache(projectId)
  await loadSettingsIndex(projectId)

  const watchDirs = [
    getWritenowRoot(projectId),
    getWritenowRulesDir(projectId),
    getWritenowCharactersDir(projectId),
    getWritenowSettingsDir(projectId),
  ]

  const watchers = []
  for (const dir of watchDirs) {
    try {
      const watcher = fs.watch(dir, { persistent: false }, (_eventType, filename) => {
        const normalized = typeof filename === 'string' && filename.trim() ? filename.trim() : null
        const absChanged = normalized ? path.join(dir, normalized) : null
        const rel = absChanged ? toRelPath(projectId, absChanged) : ''
        scheduleProjectRefresh(projectId, rel)
      })
      watchers.push(watcher)
    } catch {
      // ignore
    }
  }

  state.watching = true
  state.watchers = watchers
  broadcast('context:writenow:watch', { projectId, watching: true, atMs: Date.now() })
  return { watching: true }
}

function stopWatch(projectId) {
  const state = getOrCreateState(projectId)
  for (const watcher of state.watchers) {
    try {
      watcher.close()
    } catch {
      // ignore
    }
  }
  state.watchers = []
  state.watching = false
  if (state.pending) clearTimeout(state.pending)
  state.pending = null
  state.pendingChanged.clear()
  broadcast('context:writenow:watch', { projectId, watching: false, atMs: Date.now() })
  return { watching: false }
}

function registerContextIpcHandlers(ipcMain, options = {}) {
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  handleInvoke('context:writenow:ensure', async (_evt, payload) => {
    const projectId = coerceString(payload?.projectId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    const { rootPath } = await ensureWritenowScaffold(projectId)
    return { projectId, rootPath, ensured: true }
  })

  handleInvoke('context:writenow:status', async (_evt, payload) => {
    const projectId = coerceString(payload?.projectId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    const rootPath = getWritenowRoot(projectId)
    const exists = await pathExists(rootPath)
    const state = getOrCreateState(projectId)
    return { projectId, rootPath, exists, watching: state.watching }
  })

  handleInvoke('context:writenow:watch:start', async (_evt, payload) => {
    const projectId = coerceString(payload?.projectId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    return startWatch(projectId)
  })

  handleInvoke('context:writenow:watch:stop', async (_evt, payload) => {
    const projectId = coerceString(payload?.projectId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    return stopWatch(projectId)
  })

  handleInvoke('context:writenow:rules:get', async (_evt, payload) => {
    const projectId = coerceString(payload?.projectId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    const refresh = payload?.refresh === true
    const state = getOrCreateState(projectId)
    if (refresh || !state.rules?.loadedAtMs) await loadRulesCache(projectId)
    const rootPath = getWritenowRoot(projectId)
    return { projectId, rootPath, ...state.rules }
  })

  handleInvoke('context:writenow:settings:list', async (_evt, payload) => {
    const projectId = coerceString(payload?.projectId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    const refresh = payload?.refresh === true
    const state = getOrCreateState(projectId)
    if (refresh || !state.settingsIndex?.loadedAtMs) await loadSettingsIndex(projectId)
    const rootPath = getWritenowRoot(projectId)
    return { projectId, rootPath, ...state.settingsIndex }
  })

  handleInvoke('context:writenow:settings:read', async (_evt, payload) => {
    const projectId = coerceString(payload?.projectId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    const rootPath = getWritenowRoot(projectId)
    const result = await readSettingsFiles(projectId, payload)
    return { projectId, rootPath, ...result }
  })
}

module.exports = { registerContextIpcHandlers }

