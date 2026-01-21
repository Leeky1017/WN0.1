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

function nowIso() {
  return new Date().toISOString()
}

function generateConversationId() {
  const rand = Math.random().toString(16).slice(2, 10)
  return `conv_${Date.now()}_${rand}`
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

function ensureSafeConversationId(value) {
  const raw = coerceString(value)
  if (!raw) throw createIpcError('INVALID_ARGUMENT', 'conversationId is required')
  const base = path.basename(raw)
  if (base !== raw) throw createIpcError('INVALID_ARGUMENT', 'Invalid conversationId', { conversationId: value })
  if (base === '.' || base === '..') throw createIpcError('INVALID_ARGUMENT', 'Invalid conversationId', { conversationId: value })
  if (!/^[a-zA-Z0-9_-]+$/.test(base)) {
    throw createIpcError('INVALID_ARGUMENT', 'Invalid conversationId', { conversationId: value })
  }
  return base
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

async function safeReadJsonValue(filePath) {
  const raw = await safeReadUtf8(filePath)
  if (!raw.ok) return raw
  try {
    const value = JSON.parse(raw.content)
    return { ok: true, value, updatedAtMs: raw.updatedAtMs }
  } catch (error) {
    return {
      ok: false,
      error: { code: 'INVALID_ARGUMENT', message: 'Invalid JSON', details: { message: error?.message } },
    }
  }
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return []
  return value.map((v) => coerceString(v)).filter(Boolean)
}

function normalizeUserPreferences(value) {
  const obj = value && typeof value === 'object' ? value : null
  return {
    accepted: normalizeStringArray(obj?.accepted),
    rejected: normalizeStringArray(obj?.rejected),
  }
}

function normalizeSummaryQuality(value) {
  if (value === 'l2' || value === 'heuristic' || value === 'placeholder') return value
  return 'placeholder'
}

function getConversationIndexPath(projectId) {
  return path.join(getWritenowConversationsDir(projectId), 'index.json')
}

function getConversationFilePath(projectId, conversationId) {
  const safeId = ensureSafeConversationId(conversationId)
  return path.join(getWritenowConversationsDir(projectId), `${safeId}.json`)
}

async function writeUtf8Atomic(filePath, content) {
  const dir = path.dirname(filePath)
  const base = path.basename(filePath)
  const tmpPath = path.join(dir, `.${base}.tmp-${process.pid}-${Date.now()}`)

  try {
    await fsp.writeFile(tmpPath, content, 'utf8')
    await fsp.rename(tmpPath, filePath)
  } catch (error) {
    let cleanupError = null
    try {
      await fsp.unlink(tmpPath)
    } catch (err) {
      cleanupError = err
    }

    const code = error && typeof error === 'object' ? error.code : null
    const cleanupCode = cleanupError && typeof cleanupError === 'object' ? cleanupError.code : null
    throw createIpcError('IO_ERROR', 'Atomic write failed', {
      filePath,
      cause: String(code || ''),
      ...(cleanupError ? { cleanupCause: String(cleanupCode || ''), cleanupMessage: cleanupError?.message } : {}),
    })
  }
}

async function loadConversationIndex(projectId) {
  await ensureWritenowScaffold(projectId)
  const indexPath = getConversationIndexPath(projectId)
  const parsed = await safeReadJsonValue(indexPath)

  const errors = []
  const normalizeIndexFile = (value) => {
    const obj = value && typeof value === 'object' ? value : null
    const version = typeof obj?.version === 'number' && Number.isFinite(obj.version) ? obj.version : 1
    const items = Array.isArray(obj?.items) ? obj.items : []
    return { version, items }
  }

  if (parsed.ok) {
    const normalized = normalizeIndexFile(parsed.value)
    const items = normalized.items
      .map((item) => normalizeConversationIndexItem(item))
      .filter((item) => item !== null)
    return {
      ok: true,
      loadedAtMs: Date.now(),
      index: { version: normalized.version, updatedAt: nowIso(), items },
      errors,
      indexPath,
    }
  }

  if (parsed.error.code !== 'NOT_FOUND') {
    errors.push({
      path: toRelPath(projectId, indexPath),
      code: parsed.error.code,
      message: parsed.error.message,
      details: parsed.error.details,
    })

    const backupPath = path.join(getWritenowConversationsDir(projectId), `index.corrupt-${Date.now()}.json`)
    try {
      const raw = await safeReadUtf8(indexPath)
      if (raw.ok) await writeUtf8Atomic(backupPath, raw.content)
    } catch (error) {
      const code = error && typeof error === 'object' ? error.code : null
      errors.push({
        path: toRelPath(projectId, backupPath),
        code: typeof code === 'string' ? 'IO_ERROR' : 'INTERNAL',
        message: 'Failed to back up corrupt conversation index',
        details: { cause: String(code || ''), message: error?.message },
      })
    }
  }

  const rebuilt = await rebuildConversationIndex(projectId, errors)
  return {
    ok: true,
    loadedAtMs: Date.now(),
    index: rebuilt.index,
    errors: rebuilt.errors,
    indexPath,
  }
}

function normalizeConversationIndexItem(value) {
  const obj = value && typeof value === 'object' ? value : null
  const id = coerceString(obj?.id)
  const articleId = coerceString(obj?.articleId)
  const createdAt = coerceString(obj?.createdAt)
  const updatedAt = coerceString(obj?.updatedAt)
  const fullPath = coerceString(obj?.fullPath)
  if (!id || !articleId || !createdAt || !updatedAt || !fullPath) return null

  const messageCount = typeof obj?.messageCount === 'number' && Number.isFinite(obj.messageCount) ? obj.messageCount : 0
  const summary = typeof obj?.summary === 'string' ? obj.summary : ''
  const summaryQuality = normalizeSummaryQuality(obj?.summaryQuality)
  const keyTopics = normalizeStringArray(obj?.keyTopics)
  const skillsUsed = normalizeStringArray(obj?.skillsUsed)
  const userPreferences = normalizeUserPreferences(obj?.userPreferences)

  return {
    id,
    articleId,
    createdAt,
    updatedAt,
    messageCount,
    summary,
    summaryQuality,
    keyTopics,
    skillsUsed,
    userPreferences,
    fullPath,
  }
}

async function rebuildConversationIndex(projectId, existingErrors) {
  const conversationsDir = getWritenowConversationsDir(projectId)
  const errors = Array.isArray(existingErrors) ? [...existingErrors] : []
  const items = []

  let entries = []
  try {
    entries = await fsp.readdir(conversationsDir, { withFileTypes: true })
  } catch (error) {
    const code = error && typeof error === 'object' ? error.code : null
    errors.push({
      path: toRelPath(projectId, conversationsDir),
      code: code === 'ENOENT' ? 'NOT_FOUND' : 'IO_ERROR',
      message: code === 'ENOENT' ? 'Not found' : 'I/O error',
      details: { cause: String(code || '') },
    })
    return { index: { version: 1, updatedAt: nowIso(), items: [] }, errors }
  }

  const conversationFiles = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.json') && e.name !== 'index.json' && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b))

  for (const fileName of conversationFiles) {
    const fullPath = path.join(conversationsDir, fileName)
    const parsed = await safeReadJsonValue(fullPath)
    if (!parsed.ok) {
      errors.push({
        path: toRelPath(projectId, fullPath),
        code: parsed.error.code,
        message: parsed.error.message,
        details: parsed.error.details,
      })
      continue
    }

    const record = normalizeConversationRecord(parsed.value)
    if (!record) {
      errors.push({
        path: toRelPath(projectId, fullPath),
        code: 'INVALID_ARGUMENT',
        message: 'Invalid conversation record',
      })
      continue
    }

    const indexItem = toConversationIndexItem(projectId, fullPath, record)
    if (indexItem) items.push(indexItem)
  }

  items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))

  const index = { version: 1, updatedAt: nowIso(), items }
  const indexPath = getConversationIndexPath(projectId)
  try {
    await writeUtf8Atomic(indexPath, JSON.stringify(index, null, 2) + '\n')
  } catch (error) {
    const code = error && typeof error === 'object' ? error.code : null
    errors.push({
      path: toRelPath(projectId, indexPath),
      code: typeof code === 'string' ? 'IO_ERROR' : 'INTERNAL',
      message: 'Failed to write rebuilt conversation index',
      details: { cause: String(code || ''), message: error?.message },
    })
  }

  return { index, errors }
}

function normalizeConversationMessage(value) {
  const obj = value && typeof value === 'object' ? value : null
  const role = obj?.role
  const content = typeof obj?.content === 'string' ? obj.content : ''
  const createdAt = coerceString(obj?.createdAt) || nowIso()
  if (role !== 'system' && role !== 'user' && role !== 'assistant') return null
  return { role, content, createdAt }
}

function normalizeConversationRecord(value) {
  const obj = value && typeof value === 'object' ? value : null
  const id = coerceString(obj?.id)
  const articleId = coerceString(obj?.articleId)
  const createdAt = coerceString(obj?.createdAt)
  const updatedAt = coerceString(obj?.updatedAt)
  const messages = Array.isArray(obj?.messages) ? obj.messages.map((m) => normalizeConversationMessage(m)).filter(Boolean) : []

  if (!id || !articleId || !createdAt || !updatedAt) return null

  const analysis = obj?.analysis && typeof obj.analysis === 'object' ? obj.analysis : null
  const summary = typeof analysis?.summary === 'string' ? analysis.summary : ''
  const summaryQuality = normalizeSummaryQuality(analysis?.summaryQuality)
  const keyTopics = normalizeStringArray(analysis?.keyTopics)
  const skillsUsed = normalizeStringArray(analysis?.skillsUsed)
  const userPreferences = normalizeUserPreferences(analysis?.userPreferences)

  return {
    version: 1,
    id,
    articleId,
    createdAt,
    updatedAt,
    messages,
    analysis: {
      summary,
      summaryQuality,
      keyTopics,
      skillsUsed,
      userPreferences,
    },
  }
}

function toConversationIndexItem(projectId, conversationFilePath, record) {
  const rel = toRelPath(projectId, conversationFilePath)
  return {
    id: record.id,
    articleId: record.articleId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    messageCount: Array.isArray(record.messages) ? record.messages.length : 0,
    summary: record.analysis?.summary ?? '',
    summaryQuality: normalizeSummaryQuality(record.analysis?.summaryQuality),
    keyTopics: normalizeStringArray(record.analysis?.keyTopics),
    skillsUsed: normalizeStringArray(record.analysis?.skillsUsed),
    userPreferences: normalizeUserPreferences(record.analysis?.userPreferences),
    fullPath: rel,
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

  handleInvoke('context:writenow:conversations:save', async (_evt, payload) => {
    const projectId = coerceString(payload?.projectId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')

    const conv = payload?.conversation
    const articleId = coerceString(conv?.articleId)
    if (!articleId) throw createIpcError('INVALID_ARGUMENT', 'conversation.articleId is required')

    const explicitId = coerceString(conv?.id)
    const conversationId = explicitId ? ensureSafeConversationId(explicitId) : generateConversationId()
    const createdAt = coerceString(conv?.createdAt) || nowIso()
    const updatedAt = coerceString(conv?.updatedAt) || createdAt

    const rawMessages = Array.isArray(conv?.messages) ? conv.messages : []
    const messages = rawMessages.map((m) => normalizeConversationMessage(m)).filter(Boolean)

    const analysis = {
      summary: '',
      summaryQuality: 'placeholder',
      keyTopics: [],
      skillsUsed: normalizeStringArray(conv?.skillsUsed),
      userPreferences: normalizeUserPreferences(conv?.userPreferences),
    }

    const record = {
      version: 1,
      id: conversationId,
      articleId,
      createdAt,
      updatedAt,
      messages,
      analysis,
    }

    await ensureWritenowScaffold(projectId)
    const conversationPath = getConversationFilePath(projectId, conversationId)
    await writeUtf8Atomic(conversationPath, JSON.stringify(record, null, 2) + '\n')

    const indexLoaded = await loadConversationIndex(projectId)
    const nextItems = indexLoaded.index.items.filter((item) => item.id !== conversationId)
    const indexItem = toConversationIndexItem(projectId, conversationPath, record)
    nextItems.push(indexItem)
    nextItems.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))

    const nextIndex = {
      version: 1,
      updatedAt: nowIso(),
      items: nextItems,
    }
    await writeUtf8Atomic(indexLoaded.indexPath, JSON.stringify(nextIndex, null, 2) + '\n')

    return { saved: true, index: indexItem }
  })

  handleInvoke('context:writenow:conversations:list', async (_evt, payload) => {
    const projectId = coerceString(payload?.projectId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    const articleId = coerceString(payload?.articleId)
    const limitRaw = payload?.limit
    const limit = typeof limitRaw === 'number' && Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(200, Math.floor(limitRaw)) : 50

    const rootPath = getWritenowRoot(projectId)
    const loaded = await loadConversationIndex(projectId)
    const filtered = articleId ? loaded.index.items.filter((item) => item.articleId === articleId) : loaded.index.items
    return {
      projectId,
      rootPath,
      loadedAtMs: loaded.loadedAtMs,
      items: filtered.slice(0, limit),
      errors: loaded.errors,
    }
  })

  handleInvoke('context:writenow:conversations:read', async (_evt, payload) => {
    const projectId = coerceString(payload?.projectId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    const conversationId = ensureSafeConversationId(payload?.conversationId)
    const rootPath = getWritenowRoot(projectId)

    const filePath = getConversationFilePath(projectId, conversationId)
    const parsed = await safeReadJsonValue(filePath)
    if (!parsed.ok) throw createIpcError(parsed.error.code, parsed.error.message, { path: toRelPath(projectId, filePath), details: parsed.error.details })

    const record = normalizeConversationRecord(parsed.value)
    if (!record) throw createIpcError('IO_ERROR', 'Conversation file is corrupted', { path: toRelPath(projectId, filePath) })
    return { projectId, rootPath, conversation: record }
  })

  handleInvoke('context:writenow:conversations:analysis:update', async (_evt, payload) => {
    const projectId = coerceString(payload?.projectId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    const conversationId = ensureSafeConversationId(payload?.conversationId)
    const analysis = payload?.analysis
    const summary = typeof analysis?.summary === 'string' ? analysis.summary : ''
    if (!summary.trim()) throw createIpcError('INVALID_ARGUMENT', 'analysis.summary is required')

    const rootPath = getWritenowRoot(projectId)
    const filePath = getConversationFilePath(projectId, conversationId)

    const parsed = await safeReadJsonValue(filePath)
    if (!parsed.ok) throw createIpcError(parsed.error.code, parsed.error.message, { path: toRelPath(projectId, filePath), details: parsed.error.details })

    const record = normalizeConversationRecord(parsed.value)
    if (!record) throw createIpcError('IO_ERROR', 'Conversation file is corrupted', { path: toRelPath(projectId, filePath) })

    const updatedAt = nowIso()
    const nextRecord = {
      ...record,
      updatedAt,
      analysis: {
        summary: summary.trim(),
        summaryQuality: normalizeSummaryQuality(analysis?.summaryQuality),
        keyTopics: normalizeStringArray(analysis?.keyTopics),
        skillsUsed: normalizeStringArray(analysis?.skillsUsed),
        userPreferences: normalizeUserPreferences(analysis?.userPreferences),
      },
    }

    await writeUtf8Atomic(filePath, JSON.stringify(nextRecord, null, 2) + '\n')

    const indexLoaded = await loadConversationIndex(projectId)
    const nextItems = indexLoaded.index.items.filter((item) => item.id !== conversationId)
    const indexItem = toConversationIndexItem(projectId, filePath, nextRecord)
    nextItems.push(indexItem)
    nextItems.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))

    const nextIndex = {
      version: 1,
      updatedAt: nowIso(),
      items: nextItems,
    }
    await writeUtf8Atomic(indexLoaded.indexPath, JSON.stringify(nextIndex, null, 2) + '\n')

    return { updated: true, index: indexItem }
  })
}

module.exports = { registerContextIpcHandlers }
