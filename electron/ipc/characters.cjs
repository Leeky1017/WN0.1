const { randomUUID } = require('node:crypto')
const fsp = require('node:fs/promises')
const path = require('node:path')

const { app } = require('electron')

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function toIsoNow() {
  return new Date().toISOString()
}

function coerceString(value) {
  return typeof value === 'string' ? value.trim() : ''
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

function getWritenowCharactersDir(projectId) {
  return path.join(getWritenowRoot(projectId), 'characters')
}

async function ensureWritenowCharactersDir(projectId) {
  await fsp.mkdir(getWritenowCharactersDir(projectId), { recursive: true })
  return { dirPath: getWritenowCharactersDir(projectId) }
}

function hasOwn(obj, key) {
  return Boolean(obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key))
}

function encodeJsonField(payload, key, options = {}) {
  if (!hasOwn(payload, key)) return { present: false, value: undefined }
  const raw = payload[key]
  if (raw === null) return { present: true, value: null }

  let json = null
  try {
    json = JSON.stringify(raw)
  } catch {
    throw createIpcError('INVALID_ARGUMENT', 'Invalid JSON field', { field: key })
  }

  if (typeof json !== 'string') {
    throw createIpcError('INVALID_ARGUMENT', 'Invalid JSON field', { field: key })
  }

  const maxBytes = typeof options.maxBytes === 'number' && options.maxBytes > 0 ? options.maxBytes : 64 * 1024
  const bytes = Buffer.byteLength(json, 'utf8')
  if (bytes > maxBytes) {
    throw createIpcError('INVALID_ARGUMENT', 'JSON field too large', { field: key, bytes, maxBytes })
  }

  return { present: true, value: json }
}

function decodeJsonField(raw) {
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  try {
    return JSON.parse(trimmed)
  } catch {
    return undefined
  }
}

function stableJsonStringify(value) {
  const seen = new Set()
  const normalize = (v) => {
    if (v === null || typeof v !== 'object') return v
    if (seen.has(v)) return null
    seen.add(v)
    if (Array.isArray(v)) return v.map(normalize)
    const obj = v
    const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b))
    const out = {}
    for (const k of keys) out[k] = normalize(obj[k])
    return out
  }
  return JSON.stringify(normalize(value), null, 2)
}

function sanitizeWindowsUnsafeFileStem(value) {
  const raw = coerceString(value)
  if (!raw) return ''
  // Why: Keep filenames cross-platform safe (Windows reserved characters + control chars).
  const replaced = raw.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
  const collapsed = replaced.replace(/\s+/g, ' ').trim()
  // Why: Windows disallows trailing dots/spaces.
  return collapsed.replace(/[. ]+$/g, '')
}

function toCharacterFileName(name) {
  const stem = sanitizeWindowsUnsafeFileStem(name)
  if (!stem) throw createIpcError('INVALID_ARGUMENT', 'name is required')
  const limited = stem.length > 120 ? stem.slice(0, 120) : stem
  if (limited === '.' || limited === '..') throw createIpcError('INVALID_ARGUMENT', 'Invalid character name', { name })
  return `${limited}.md`
}

function buildCharacterCardText(character) {
  const meta = {
    version: 1,
    id: character.id,
    projectId: character.projectId,
    name: character.name,
    description: character.description ?? null,
    traits: typeof character.traits === 'undefined' ? null : character.traits,
    relationships: typeof character.relationships === 'undefined' ? null : character.relationships,
    createdAt: character.createdAt,
    updatedAt: character.updatedAt,
  }

  const metaJson = stableJsonStringify(meta)
  const title = character.name
  const description = typeof character.description === 'string' && character.description.trim() ? character.description.trim() : ''

  return [
    '<!-- writenow:character-card:v1 -->',
    '```json',
    metaJson,
    '```',
    '<!-- /writenow:character-card:v1 -->',
    '',
    `# ${title}`,
    description ? '' : '(no description)',
    description ? description : '',
    '',
  ].join('\n')
}

function parseCharacterCard(text) {
  const raw = typeof text === 'string' ? text : ''
  const match = raw.match(
    /<!--\s*writenow:character-card:v1\s*-->\s*```json\s*([\s\S]*?)\s*```\s*<!--\s*\/writenow:character-card:v1\s*-->/
  )
  if (!match) return null
  const json = match[1]
  try {
    const value = JSON.parse(json)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value
  } catch {
    return null
  }
}

async function writeUtf8Atomic(filePath, content) {
  const dir = path.dirname(filePath)
  const base = path.basename(filePath)
  const tmpPath = path.join(dir, `.${base}.tmp-${process.pid}-${Date.now()}`)
  try {
    await fsp.writeFile(tmpPath, content, 'utf8')
    await fsp.rename(tmpPath, filePath)
  } catch (error) {
    try {
      await fsp.unlink(tmpPath)
    } catch {
      // ignore
    }
    const code = error && typeof error === 'object' ? error.code : null
    if (code === 'EACCES' || code === 'EPERM') throw createIpcError('PERMISSION_DENIED', 'Permission denied')
    throw createIpcError('IO_ERROR', 'Atomic write failed', { cause: String(code || '') })
  }
}

async function readUtf8(filePath) {
  try {
    return { ok: true, content: await fsp.readFile(filePath, 'utf8') }
  } catch (error) {
    const code = error && typeof error === 'object' ? error.code : null
    if (code === 'ENOENT') return { ok: false, error: { code: 'NOT_FOUND', message: 'Not found' } }
    if (code === 'EACCES' || code === 'EPERM') return { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Permission denied' } }
    return { ok: false, error: { code: 'IO_ERROR', message: 'I/O error', details: { cause: String(code || '') } } }
  }
}

async function listCharacterCards(projectId) {
  await ensureWritenowCharactersDir(projectId)
  const dirPath = getWritenowCharactersDir(projectId)
  const entries = await fsp.readdir(dirPath, { withFileTypes: true }).catch((error) => {
    const code = error && typeof error === 'object' ? error.code : null
    if (code === 'EACCES' || code === 'EPERM') throw createIpcError('PERMISSION_DENIED', 'Permission denied')
    throw createIpcError('IO_ERROR', 'Failed to list characters', { cause: String(code || '') })
  })

  const files = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md')).map((e) => e.name)
  files.sort((a, b) => a.localeCompare(b))

  const characters = []
  for (const fileName of files) {
    const filePath = path.join(dirPath, fileName)
    const read = await readUtf8(filePath)
    if (!read.ok) continue
    const meta = parseCharacterCard(read.content)
    if (!meta) continue

    const id = coerceString(meta.id)
    const pid = coerceString(meta.projectId)
    const name = coerceString(meta.name)
    const createdAt = coerceString(meta.createdAt)
    const updatedAt = coerceString(meta.updatedAt)
    if (!id || !pid || !name || !createdAt || !updatedAt) continue
    if (pid !== projectId) continue

    characters.push({
      id,
      projectId: pid,
      name,
      description: coerceString(meta.description) || undefined,
      traits: meta.traits === null ? undefined : meta.traits,
      relationships: meta.relationships === null ? undefined : meta.relationships,
      createdAt,
      updatedAt,
      _filePath: filePath,
    })
  }

  characters.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
  return characters
}

function registerCharactersIpcHandlers(ipcMain, options = {}) {
  const db = options.db ?? null
  const logger = options.logger ?? null
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  handleInvoke('character:list', async (_evt, payload) => {
    const projectId = coerceString(payload?.projectId)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')

    // Why: File-based character cards are the source of truth for long-context injection.
    // DB remains available for project validation but does not store character content.
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projectExists = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId)
    if (!projectExists) throw createIpcError('NOT_FOUND', 'Project not found', { projectId })

    const cards = await listCharacterCards(projectId)
    return {
      characters: cards.map((c) => {
        const { _filePath: _ignore, ...rest } = c
        return rest
      }),
    }
  })

  handleInvoke('character:create', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projectId = coerceString(payload?.projectId)
    const name = coerceString(payload?.name)
    const description = coerceString(payload?.description) || null
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    if (!name) throw createIpcError('INVALID_ARGUMENT', 'name is required')
    if (name.length > 120) throw createIpcError('INVALID_ARGUMENT', 'name is too long', { max: 120 })

    const projectExists = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId)
    if (!projectExists) throw createIpcError('NOT_FOUND', 'Project not found', { projectId })

    const id = randomUUID()
    const now = toIsoNow()
    const traitsField = encodeJsonField(payload, 'traits')
    const relationshipsField = encodeJsonField(payload, 'relationships')
    const traits = traitsField.present ? (traitsField.value === null ? null : JSON.parse(traitsField.value)) : undefined
    const relationships = relationshipsField.present
      ? relationshipsField.value === null
        ? null
        : JSON.parse(relationshipsField.value)
      : undefined

    const character = {
      id,
      projectId,
      name,
      description: description || undefined,
      traits,
      relationships,
      createdAt: now,
      updatedAt: now,
    }

    await ensureWritenowCharactersDir(projectId)
    const fileName = toCharacterFileName(name)
    const filePath = path.join(getWritenowCharactersDir(projectId), fileName)
    const content = buildCharacterCardText(character)

    try {
      await fsp.access(filePath)
      throw createIpcError('INVALID_ARGUMENT', 'Character file already exists', { fileName })
    } catch (error) {
      if (error && typeof error === 'object' && error.ipcError) throw error
      const code = error && typeof error === 'object' ? error.code : null
      if (code && code !== 'ENOENT') {
        if (code === 'EACCES' || code === 'EPERM') throw createIpcError('PERMISSION_DENIED', 'Permission denied')
        throw createIpcError('IO_ERROR', 'Failed to access character file', { cause: String(code || '') })
      }
    }
    await writeUtf8Atomic(filePath, content)
    return { character }
  })

  handleInvoke('character:update', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projectId = coerceString(payload?.projectId)
    const id = coerceString(payload?.id)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required')

    const name = typeof payload?.name === 'string' ? payload.name.trim() : undefined
    const description = typeof payload?.description === 'string' ? payload.description.trim() : undefined
    if (typeof name === 'string' && !name) throw createIpcError('INVALID_ARGUMENT', 'name cannot be empty')
    if (typeof name === 'string' && name.length > 120) throw createIpcError('INVALID_ARGUMENT', 'name is too long', { max: 120 })

    const traitsField = encodeJsonField(payload, 'traits')
    const relationshipsField = encodeJsonField(payload, 'relationships')
    const hasTraits = traitsField.present
    const hasRelationships = relationshipsField.present

    if (typeof name !== 'string' && typeof description !== 'string' && !hasTraits && !hasRelationships) {
      throw createIpcError('INVALID_ARGUMENT', 'No fields to update')
    }

    const existingCards = await listCharacterCards(projectId)
    const existing = existingCards.find((c) => c.id === id)
    if (!existing || !existing._filePath) throw createIpcError('NOT_FOUND', 'Character not found', { id, projectId })

    const next = {
      id: existing.id,
      projectId: existing.projectId,
      name: typeof name === 'string' ? name : existing.name,
      description:
        typeof description === 'string' ? (description.trim() ? description.trim() : undefined) : existing.description,
      traits: hasTraits ? (traitsField.value === null ? null : JSON.parse(traitsField.value)) : existing.traits,
      relationships: hasRelationships
        ? relationshipsField.value === null
          ? null
          : JSON.parse(relationshipsField.value)
        : existing.relationships,
      createdAt: existing.createdAt,
      updatedAt: toIsoNow(),
    }

    const oldPath = existing._filePath
    const dirPath = path.dirname(oldPath)
    const newFileName = toCharacterFileName(next.name)
    const newPath = path.join(dirPath, newFileName)

    const raw = await readUtf8(oldPath)
    if (!raw.ok) throw createIpcError(raw.error.code, raw.error.message)

    const nextContent = (() => {
      const base = buildCharacterCardText(next)
      // Why: Preserve user-authored content below the metadata block.
      const existingText = raw.content
      const markerRe =
        /<!--\s*writenow:character-card:v1\s*-->\s*```json\s*[\s\S]*?\s*```\s*<!--\s*\/writenow:character-card:v1\s*-->\s*/m
      const stripped = existingText.replace(markerRe, '').trimStart()
      return stripped ? `${base}\n${stripped}` : base
    })()

    if (newPath !== oldPath) {
      try {
        await fsp.access(newPath)
        throw createIpcError('INVALID_ARGUMENT', 'Character file already exists', { fileName: newFileName })
      } catch (error) {
        if (error && typeof error === 'object' && error.ipcError) throw error
        const code = error && typeof error === 'object' ? error.code : null
        if (code && code !== 'ENOENT') {
          if (code === 'EACCES' || code === 'EPERM') throw createIpcError('PERMISSION_DENIED', 'Permission denied')
          throw createIpcError('IO_ERROR', 'Failed to access character file', { cause: String(code || '') })
        }
      }
    }

    await writeUtf8Atomic(newPath, nextContent)
    if (newPath !== oldPath) {
      try {
        await fsp.unlink(oldPath)
      } catch (error) {
        logger?.warn?.('characters', 'old file cleanup failed', { message: error?.message })
      }
    }

    return { character: next }
  })

  handleInvoke('character:delete', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const projectId = coerceString(payload?.projectId)
    const id = coerceString(payload?.id)
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')
    if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required')

    const existingCards = await listCharacterCards(projectId)
    const existing = existingCards.find((c) => c.id === id)
    if (!existing || !existing._filePath) throw createIpcError('NOT_FOUND', 'Character not found', { id, projectId })

    try {
      await fsp.unlink(existing._filePath)
    } catch (error) {
      const code = error && typeof error === 'object' ? error.code : null
      if (code === 'ENOENT') throw createIpcError('NOT_FOUND', 'Character file not found', { id, projectId })
      if (code === 'EACCES' || code === 'EPERM') throw createIpcError('PERMISSION_DENIED', 'Permission denied')
      throw createIpcError('IO_ERROR', 'Failed to delete character file', { cause: String(code || '') })
    }

    return { deleted: true }
  })
}

module.exports = { registerCharactersIpcHandlers }

