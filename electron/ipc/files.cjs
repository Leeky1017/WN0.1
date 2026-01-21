const path = require('path')
const fs = require('fs/promises')
const { app } = require('electron')

const { getSessionStatus } = require('../lib/session.cjs')
const { writeSnapshot, readLatestSnapshot } = require('../lib/snapshots.cjs')
const { deleteArticle, upsertArticle } = require('../lib/articles.cjs')
const { incrementWritingStats, toLocalDateKey } = require('../lib/writing-stats.cjs')

function getDocumentsDir() {
  return path.join(app.getPath('userData'), 'documents')
}

async function ensureDocumentsDir() {
  await fs.mkdir(getDocumentsDir(), { recursive: true })
}

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function countWords(content) {
  if (!content) return 0
  return String(content).replace(/\s+/g, '').length
}

function parseProjectId(raw) {
  if (typeof raw === 'undefined') return null
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed ? trimmed : null
}

function assertValidProjectId(payload) {
  if (!payload || typeof payload !== 'object') return null
  if (!('projectId' in payload)) return null
  const value = parseProjectId(payload.projectId)
  if (!value) throw createIpcError('INVALID_ARGUMENT', 'Invalid projectId', { projectId: payload.projectId })
  return value
}

function resolveDocumentFilePath(relativePath) {
  if (typeof relativePath !== 'string') throw new Error('Invalid path')
  const trimmed = relativePath.trim()
  if (!trimmed) throw new Error('Invalid path')

  const normalized = path.normalize(trimmed).replace(/^([/\\])+/, '')
  const base = path.basename(normalized)
  if (normalized !== base) throw new Error('Invalid path')
  if (base === '.' || base === '..') throw new Error('Invalid path')
  if (!base.toLowerCase().endsWith('.md')) throw new Error('Only .md files are supported')

  const documentsDir = getDocumentsDir()
  const fullPath = path.resolve(path.join(documentsDir, base))
  const documentsResolved = path.resolve(documentsDir)
  if (fullPath !== documentsResolved && !fullPath.startsWith(documentsResolved + path.sep)) {
    throw new Error('Invalid path')
  }

  return { name: base, fullPath }
}

function sanitizeFileName(name) {
  const raw = typeof name === 'string' ? name : ''
  let base = raw.trim()
  if (!base) base = '未命名'
  base = path.basename(base)
  base = base.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
  base = base.replace(/\s+/g, ' ').trim()
  if (!base.toLowerCase().endsWith('.md')) base += '.md'
  return base
}

async function findAvailableFileName(fileName) {
  const ext = path.extname(fileName)
  const stem = path.basename(fileName, ext)

  let candidate = fileName
  for (let i = 1; i < 1000; i++) {
    const fullPath = path.join(getDocumentsDir(), candidate)
    try {
      await fs.access(fullPath)
      candidate = `${stem} (${i})${ext}`
    } catch {
      return candidate
    }
  }
  throw new Error('Unable to create file')
}

function getDefaultMarkdownContent(fileName) {
  const title = path.basename(fileName, path.extname(fileName))
  if (title === '欢迎使用') {
    return `# 欢迎使用 WriteNow

WriteNow 是一款本地优先的写作工具：文件保存在本机，可审计、可复现。

## 快速开始

- 点击左侧「+」新建文章
- 支持 Markdown 编辑，2 秒无操作自动保存

祝你写作愉快！
`
  }
  return `# ${title}\n\n`
}

function registerFileIpcHandlers(ipcMain, options = {}) {
  const log = typeof options.log === 'function' ? options.log : null
  const logger = options.logger ?? null
  const db = options.db ?? null
  const onDocumentCreated = typeof options.onDocumentCreated === 'function' ? options.onDocumentCreated : null
  const onDocumentSaved = typeof options.onDocumentSaved === 'function' ? options.onDocumentSaved : null
  const onDocumentDeleted = typeof options.onDocumentDeleted === 'function' ? options.onDocumentDeleted : null
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  handleInvoke('file:session:status', async () => {
    return getSessionStatus()
  })

  handleInvoke('file:list', async (_evt, payload) => {
    await ensureDocumentsDir()
    const scope = payload?.scope
    if (typeof scope !== 'undefined' && scope !== 'documents') {
      throw createIpcError('INVALID_ARGUMENT', 'Invalid scope', { scope })
    }
    const projectId = assertValidProjectId(payload)
    if (projectId && !db) {
      throw createIpcError('DB_ERROR', 'Database is not ready')
    }

    const dir = getDocumentsDir()
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const mdFiles = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))

    const items = await Promise.all(
      mdFiles.map(async (entry) => {
        const fullPath = path.join(dir, entry.name)
        const stat = await fs.stat(fullPath)
        const content = await fs.readFile(fullPath, 'utf8').catch(() => '')
        const createdAt = stat.birthtimeMs || stat.ctimeMs || stat.mtimeMs || Date.now()
        return {
          name: entry.name,
          path: entry.name,
          createdAt,
          wordCount: countWords(content),
        }
      })
    )

    items.sort((a, b) => b.createdAt - a.createdAt)
    if (projectId) {
      const rows = db.prepare("SELECT id FROM articles WHERE project_id = ? AND id LIKE '%.md'").all(projectId)
      const allowed = new Set(rows.map((r) => (r && typeof r.id === 'string' ? r.id : null)).filter(Boolean))
      return { items: items.filter((item) => allowed.has(item.path)) }
    }
    return { items }
  })

  handleInvoke('file:read', async (_evt, payload) => {
    await ensureDocumentsDir()
    let fullPath = null
    try {
      fullPath = resolveDocumentFilePath(payload?.path).fullPath
    } catch {
      throw createIpcError('INVALID_ARGUMENT', 'Invalid path', { path: payload?.path })
    }
    const content = await fs.readFile(fullPath, 'utf8')
    return { content, encoding: 'utf8' }
  })

  handleInvoke('file:write', async (_evt, payload) => {
    await ensureDocumentsDir()
    let fullPath = null
    try {
      fullPath = resolveDocumentFilePath(payload?.path).fullPath
    } catch {
      throw createIpcError('INVALID_ARGUMENT', 'Invalid path', { path: payload?.path })
    }
    const content = typeof payload?.content === 'string' ? payload.content : null
    if (content === null) {
      throw createIpcError('INVALID_ARGUMENT', 'Invalid content', { contentType: typeof payload?.content })
    }
    try {
      await fs.access(fullPath)
    } catch (e) {
      if (e && typeof e === 'object' && e.code === 'ENOENT') throw e
      throw e
    }
    await fs.writeFile(fullPath, content, 'utf8')

    const nextWordCount = countWords(content)
    let prevWordCount = 0
    if (db) {
      try {
        const row = db.prepare('SELECT word_count FROM articles WHERE id = ?').get(payload.path)
        prevWordCount = typeof row?.word_count === 'number' ? row.word_count : 0
      } catch (e) {
        logger?.warn?.('stats', 'read previous word_count failed', { path: payload.path, message: e?.message })
      }
    }

    if (db) {
      try {
        const projectId = assertValidProjectId(payload)
        upsertArticle(db, { id: payload.path, fileName: payload.path, content, projectId })
      } catch (e) {
        log?.('[file:write] db index failed:', payload.path, e?.message)
        throw createIpcError('DB_ERROR', 'Saved to disk but failed to update search index', { path: payload.path, message: e?.message })
      }
    }

    if (db) {
      const delta = Math.max(0, nextWordCount - prevWordCount)
      if (delta > 0) {
        try {
          incrementWritingStats(db, toLocalDateKey(), { wordCount: delta })
        } catch (e) {
          logger?.error?.('stats', 'word_count increment failed', { path: payload.path, delta, message: e?.message })
        }
      }
    }

    if (onDocumentSaved) {
      try {
        Promise.resolve(onDocumentSaved(payload.path)).catch(() => undefined)
      } catch {
        // ignore
      }
    }

    return { written: true }
  })

  handleInvoke('file:create', async (_evt, payload) => {
    await ensureDocumentsDir()
    const safeName = sanitizeFileName(payload?.name)
    const fileName = await findAvailableFileName(safeName)
    const fullPath = path.join(getDocumentsDir(), fileName)
    const template = payload?.template
    if (typeof template !== 'undefined' && template !== 'default' && template !== 'blank') {
      throw createIpcError('INVALID_ARGUMENT', 'Invalid template', { template })
    }
    const defaultContent = template === 'blank' ? '' : getDefaultMarkdownContent(fileName)

    await fs.writeFile(fullPath, defaultContent, { encoding: 'utf8', flag: 'wx' })

    if (db) {
      try {
        const projectId = assertValidProjectId(payload)
        upsertArticle(db, { id: fileName, fileName, content: defaultContent, projectId })
      } catch (e) {
        log?.('[file:create] db index failed:', fileName, e?.message)
        try {
          await fs.unlink(fullPath)
        } catch {
          // ignore
        }
        throw createIpcError('DB_ERROR', 'Failed to initialize search index for new file', { name: fileName, message: e?.message })
      }
    }

    if (db) {
      try {
        incrementWritingStats(db, toLocalDateKey(), { articlesCreated: 1 })
      } catch (e) {
        logger?.error?.('stats', 'articles_created increment failed', { path: fileName, message: e?.message })
      }
    }

    if (onDocumentCreated) {
      try {
        Promise.resolve(onDocumentCreated(fileName)).catch(() => undefined)
      } catch {
        // ignore
      }
    }

    log?.('[file:create] created:', fileName)
    return { name: fileName, path: fileName }
  })

  handleInvoke('file:delete', async (_evt, payload) => {
    await ensureDocumentsDir()
    let fullPath = null
    let name = null
    try {
      const resolved = resolveDocumentFilePath(payload?.path)
      fullPath = resolved.fullPath
      name = resolved.name
    } catch {
      throw createIpcError('INVALID_ARGUMENT', 'Invalid path', { path: payload?.path })
    }
    const existingContent = db ? await fs.readFile(fullPath, 'utf8').catch(() => null) : null
    if (db) {
      try {
        deleteArticle(db, name)
      } catch (e) {
        log?.('[file:delete] db index failed:', name, e?.message)
        throw createIpcError('DB_ERROR', 'Failed to update search index for deleted file', { name, message: e?.message })
      }
    }

    try {
      await fs.unlink(fullPath)
    } catch (e) {
      if (db && typeof existingContent === 'string') {
        try {
          upsertArticle(db, { id: name, fileName: name, content: existingContent })
        } catch {
          // ignore
        }
      }
      throw e
    }

    if (onDocumentDeleted) {
      try {
        Promise.resolve(onDocumentDeleted(name)).catch(() => undefined)
      } catch {
        // ignore
      }
    }

    log?.('[file:delete] deleted:', name)
    return { deleted: true }
  })

  handleInvoke('file:snapshot:write', async (_evt, payload) => {
    await ensureDocumentsDir()
    let resolved = null
    try {
      resolved = resolveDocumentFilePath(payload?.path)
    } catch {
      throw createIpcError('INVALID_ARGUMENT', 'Invalid path', { path: payload?.path })
    }

    const content = typeof payload?.content === 'string' ? payload.content : null
    if (content === null) {
      throw createIpcError('INVALID_ARGUMENT', 'Invalid content', { contentType: typeof payload?.content })
    }

    const reason = payload?.reason
    if (typeof reason !== 'undefined' && reason !== 'auto' && reason !== 'manual') {
      throw createIpcError('INVALID_ARGUMENT', 'Invalid reason', { reason })
    }

    const result = await writeSnapshot({
      docName: resolved.name,
      docPath: resolved.name,
      content,
      reason: reason || 'auto',
      maxKeep: 50,
    })

    log?.('[file:snapshot:write] created:', result.snapshotId)
    return result
  })

  handleInvoke('file:snapshot:latest', async (_evt, payload) => {
    await ensureDocumentsDir()

    const inputPath = payload?.path
    let docName = null
    if (typeof inputPath !== 'undefined') {
      try {
        docName = resolveDocumentFilePath(inputPath).name
      } catch {
        throw createIpcError('INVALID_ARGUMENT', 'Invalid path', { path: inputPath })
      }
    }

    const snapshot = await readLatestSnapshot({ docName: docName || undefined })
    return { snapshot }
  })
}

module.exports = { registerFileIpcHandlers }
