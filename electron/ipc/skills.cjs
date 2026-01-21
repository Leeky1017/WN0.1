const fsp = require('node:fs/promises')
const path = require('node:path')

const yaml = require('yaml')

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function coerceString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function toIsoNow() {
  return new Date().toISOString()
}

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function isValidSemVer(version) {
  const v = coerceString(version)
  if (!v) return false
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.test(
    v
  )
}

function ensureSafePathSegment(value, field) {
  const raw = coerceString(value)
  if (!raw) throw createIpcError('INVALID_ARGUMENT', `${field} is required`, { field })
  const base = path.basename(raw)
  if (base !== raw) throw createIpcError('INVALID_ARGUMENT', `Invalid ${field}`, { field, value })
  if (base === '.' || base === '..') throw createIpcError('INVALID_ARGUMENT', `Invalid ${field}`, { field, value })
  if (base.includes(path.sep) || base.includes('/')) throw createIpcError('INVALID_ARGUMENT', `Invalid ${field}`, { field, value })
  return base
}

function splitFrontmatter(text) {
  const normalized = (typeof text === 'string' ? text : '').replace(/\r\n/g, '\n').replace(/^\uFEFF/, '')
  const lines = normalized.split('\n')
  if ((lines[0] ?? '').trim() !== '---') return null
  let endIndex = -1
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i]?.trim() === '---') {
      endIndex = i
      break
    }
  }
  if (endIndex === -1) return null
  return {
    yaml: lines.slice(1, endIndex).join('\n'),
    markdown: lines.slice(endIndex + 1).join('\n'),
  }
}

async function safeReadUtf8(filePath) {
  try {
    const content = await fsp.readFile(filePath, 'utf8')
    return { ok: true, content }
  } catch (error) {
    const code = error && typeof error === 'object' ? error.code : null
    if (code === 'ENOENT') return { ok: false, error: { code: 'NOT_FOUND', message: 'Not found' } }
    return { ok: false, error: { code: 'IO_ERROR', message: 'I/O error', details: { cause: String(code || '') } } }
  }
}

function mapScope(value) {
  const raw = coerceString(value)
  if (raw === 'builtin' || raw === 'global' || raw === 'project') return raw
  return 'global'
}

function mapSkillListRow(row) {
  const id = coerceString(row?.id)
  const name = coerceString(row?.name)
  const description = coerceString(row?.description) || null
  const version = coerceString(row?.version) || null
  const scope = mapScope(row?.scope)
  const packageId = coerceString(row?.package_id) || null
  const enabled = row?.enabled === 0 ? false : true
  const valid = row?.is_valid === 0 ? false : true
  const errorCode = coerceString(row?.error_code) || null
  const errorMessage = coerceString(row?.error_message) || null

  return {
    id,
    name,
    description: description || undefined,
    version: version || undefined,
    scope,
    packageId: packageId || undefined,
    enabled,
    valid,
    ...(errorCode || errorMessage ? { error: { code: errorCode || 'INVALID_ARGUMENT', message: errorMessage || 'Invalid skill' } } : {}),
  }
}

function parseSkillText(text) {
  const split = splitFrontmatter(text)
  if (!split) {
    return { ok: false, error: { code: 'INVALID_ARGUMENT', message: 'Missing or invalid YAML frontmatter' } }
  }

  let frontmatter
  try {
    frontmatter = yaml.parse(split.yaml)
  } catch (error) {
    return {
      ok: false,
      error: { code: 'INVALID_ARGUMENT', message: 'Invalid YAML frontmatter', details: { message: error?.message } },
    }
  }

  if (!isRecord(frontmatter)) {
    return { ok: false, error: { code: 'INVALID_ARGUMENT', message: 'YAML frontmatter must be a mapping' } }
  }

  return { ok: true, definition: { frontmatter, markdown: split.markdown } }
}

function registerSkillsIpcHandlers(ipcMain, options = {}) {
  const db = options.db ?? null
  const logger = options.logger ?? null
  const broadcast = typeof options.broadcast === 'function' ? options.broadcast : null
  const userDataDir = coerceString(options.userDataDir)
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  handleInvoke('skill:list', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const includeDisabled = payload?.includeDisabled === true

    const rows = db
      .prepare(
        `SELECT id, name, description, version, scope, package_id, enabled, is_valid, error_code, error_message
         FROM skills
         WHERE scope IN ('builtin','global','project')
         ORDER BY
           CASE scope WHEN 'project' THEN 3 WHEN 'global' THEN 2 WHEN 'builtin' THEN 1 ELSE 0 END DESC,
           name COLLATE NOCASE ASC`
      )
      .all()

    const skills = rows
      .map(mapSkillListRow)
      .filter((skill) => skill.id && skill.name)
      .filter((skill) => (includeDisabled ? true : skill.enabled))

    return { skills }
  })

  handleInvoke('skill:read', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const id = coerceString(payload?.id)
    if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required')

    const row = db
      .prepare(
        `SELECT id, name, description, version, scope, package_id, enabled, is_valid, error_code, error_message, source_uri, source_hash
         FROM skills
         WHERE id = ?`
      )
      .get(id)

    if (!row) throw createIpcError('NOT_FOUND', 'Skill not found', { id })

    const sourceUri = coerceString(row.source_uri)
    if (!sourceUri) {
      throw createIpcError('IO_ERROR', 'Skill source file is unavailable', { id })
    }

    const read = await safeReadUtf8(sourceUri)
    if (!read.ok) throw createIpcError(read.error.code, read.error.message, { id, sourceUri, ...read.error.details })

    const parsed = parseSkillText(read.content)
    const definition = parsed.ok ? parsed.definition : null

    return {
      skill: {
        ...mapSkillListRow(row),
        sourceUri,
        sourceHash: coerceString(row.source_hash) || undefined,
        ...(definition ? { definition } : {}),
        ...(parsed.ok ? {} : { parseError: parsed.error }),
        rawText: read.content,
      },
    }
  })

  handleInvoke('skill:toggle', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const id = coerceString(payload?.id)
    if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required')
    const enabled = payload?.enabled === true

    const exists = db.prepare('SELECT 1 FROM skills WHERE id = ?').get(id)
    if (!exists) throw createIpcError('NOT_FOUND', 'Skill not found', { id })

    db.prepare('UPDATE skills SET enabled = ?, updated_at = ? WHERE id = ?').run(enabled ? 1 : 0, toIsoNow(), id)

    try {
      broadcast?.('skills:changed', { skillIds: [id], reason: 'toggle', atMs: Date.now() })
    } catch (error) {
      logger?.warn?.('skills', 'broadcast failed', { message: error?.message })
    }

    return { id, enabled }
  })

  handleInvoke('skill:write', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    if (!userDataDir) throw createIpcError('INTERNAL', 'userDataDir is not configured')

    const scope = coerceString(payload?.scope)
    if (scope !== 'global' && scope !== 'project') throw createIpcError('INVALID_ARGUMENT', 'Invalid scope', { scope })
    const projectId = scope === 'project' ? coerceString(payload?.projectId) : ''
    if (scope === 'project' && !projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required', { scope })

    const packageId = ensureSafePathSegment(payload?.packageId, 'packageId')
    const packageVersion = ensureSafePathSegment(payload?.packageVersion, 'packageVersion')
    const skillSlug = ensureSafePathSegment(payload?.skillSlug, 'skillSlug')
    const content = typeof payload?.content === 'string' ? payload.content : ''
    if (!content.trim()) throw createIpcError('INVALID_ARGUMENT', 'content is empty')

    const overwrite = payload?.overwrite === true

    const parsed = parseSkillText(content)
    if (!parsed.ok) throw createIpcError(parsed.error.code, parsed.error.message, parsed.error.details)

    const fm = parsed.definition.frontmatter
    const skillId = coerceString(fm.id)
    const name = coerceString(fm.name)
    const version = coerceString(fm.version)
    const tags = Array.isArray(fm.tags) ? fm.tags.map((t) => coerceString(t)).filter(Boolean) : []
    const prompt = isRecord(fm.prompt) ? fm.prompt : null
    const system = typeof prompt?.system === 'string' ? prompt.system : ''
    const user = typeof prompt?.user === 'string' ? prompt.user : ''

    if (!skillId || !name) throw createIpcError('INVALID_ARGUMENT', 'Missing required fields (id/name)', { skillId, name })
    if (!version || !isValidSemVer(version)) throw createIpcError('INVALID_ARGUMENT', 'version must be valid SemVer', { version })
    if (tags.length === 0) throw createIpcError('INVALID_ARGUMENT', 'tags is required')
    if (!system.trim() || !user.trim()) throw createIpcError('INVALID_ARGUMENT', 'prompt.system and prompt.user are required')

    const packagesRoot =
      scope === 'global'
        ? path.join(userDataDir, 'skills', 'packages')
        : path.join(userDataDir, 'projects', projectId, '.writenow', 'skills', 'packages')

    const dir = path.join(packagesRoot, packageId, packageVersion, 'skills', skillSlug)
    const filePath = path.join(dir, 'SKILL.md')

    await fsp.mkdir(dir, { recursive: true })

    if (!overwrite) {
      try {
        await fsp.access(filePath)
        throw createIpcError('ALREADY_EXISTS', 'SKILL.md already exists', { filePath })
      } catch (error) {
        const code = error && typeof error === 'object' ? error.code : null
        if (code && code !== 'ENOENT') throw error
      }
    }

    await fsp.writeFile(filePath, content, 'utf8')

    try {
      broadcast?.('skills:changed', { skillIds: [skillId], reason: 'write', atMs: Date.now() })
    } catch (error) {
      logger?.warn?.('skills', 'broadcast failed', { message: error?.message })
    }

    return { written: true, sourceUri: filePath }
  })
}

module.exports = { registerSkillsIpcHandlers }
