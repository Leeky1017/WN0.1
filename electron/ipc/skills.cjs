const { createHash } = require('node:crypto')
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

function sha256Hex(text) {
  const value = typeof text === 'string' ? text : ''
  return createHash('sha256').update(value).digest('hex')
}

function toIsoNow() {
  return new Date().toISOString()
}

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

const CONTEXT_RULE_KEYS = [
  'surrounding',
  'user_preferences',
  'style_guide',
  'characters',
  'outline',
  'recent_summary',
  'knowledge_graph',
]

function buildDefaultContextRules() {
  return {
    surrounding: 0,
    user_preferences: false,
    style_guide: false,
    characters: false,
    outline: false,
    recent_summary: 0,
    knowledge_graph: false,
  }
}

function coerceNonNegativeInt(value, field, key) {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw createIpcError('INVALID_ARGUMENT', `Invalid ${field}.${key}`, { field, key, value })
  }
  return value
}

function coerceBoolean(value, field, key) {
  if (typeof value !== 'boolean') {
    throw createIpcError('INVALID_ARGUMENT', `Invalid ${field}.${key}`, { field, key, value })
  }
  return value
}

/**
 * Why: Context injection MUST be deterministic and auditable; unknown fields are rejected to avoid silent drift.
 * Failure: Invalid rules MUST surface as `INVALID_ARGUMENT` (no stack leakage across IPC boundary).
 */
function normalizeContextRules(value) {
  const field = 'context_rules'

  if (typeof value === 'undefined' || value === null) {
    const rules = buildDefaultContextRules()
    const normalized = Object.fromEntries(CONTEXT_RULE_KEYS.map((k) => [k, rules[k]]))
    return { rules: normalized, json: JSON.stringify(normalized) }
  }

  if (!isRecord(value)) {
    throw createIpcError('INVALID_ARGUMENT', `${field} must be a mapping`, { field, value })
  }

  const unknownKeys = Object.keys(value).filter((k) => !CONTEXT_RULE_KEYS.includes(k))
  if (unknownKeys.length > 0) {
    throw createIpcError('INVALID_ARGUMENT', `Unknown ${field} fields`, { field, unknownKeys })
  }

  const merged = { ...buildDefaultContextRules() }

  if (Object.prototype.hasOwnProperty.call(value, 'surrounding')) {
    merged.surrounding = coerceNonNegativeInt(value.surrounding, field, 'surrounding')
  }
  if (Object.prototype.hasOwnProperty.call(value, 'recent_summary')) {
    merged.recent_summary = coerceNonNegativeInt(value.recent_summary, field, 'recent_summary')
  }

  for (const key of ['user_preferences', 'style_guide', 'characters', 'outline', 'knowledge_graph']) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      merged[key] = coerceBoolean(value[key], field, key)
    }
  }

  const normalized = Object.fromEntries(CONTEXT_RULE_KEYS.map((k) => [k, merged[k]]))
  return { rules: normalized, json: JSON.stringify(normalized) }
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
    const description = coerceString(fm.description) || null
    const version = coerceString(fm.version)
    const tags = Array.isArray(fm.tags) ? fm.tags.map((t) => coerceString(t)).filter(Boolean) : []
    const prompt = isRecord(fm.prompt) ? fm.prompt : null
    const system = typeof prompt?.system === 'string' ? prompt.system : ''
    const user = typeof prompt?.user === 'string' ? prompt.user : ''
    const contextRules = normalizeContextRules(fm.context_rules)
    const modelProfile = isRecord(fm.modelProfile) ? fm.modelProfile : null
    const preferredModel = coerceString(modelProfile?.preferred) || 'claude-3-5-sonnet-latest'

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

    const now = toIsoNow()
    const sourceHash = sha256Hex(content)
    const tag = tags.length > 0 ? tags[0] : null
    const upsert = db.prepare(
      `INSERT INTO skills (
          id, name, description, tag, system_prompt, user_prompt_template, context_rules, model, is_builtin,
          source_uri, source_hash, version, scope, package_id,
          enabled, is_valid, error_code, error_message,
          created_at, updated_at
        ) VALUES (
          @id, @name, @description, @tag, @system_prompt, @user_prompt_template, @context_rules, @model, @is_builtin,
          @source_uri, @source_hash, @version, @scope, @package_id,
          1, 1, NULL, NULL,
          @created_at, @updated_at
        )
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name,
          description=excluded.description,
          tag=excluded.tag,
          system_prompt=excluded.system_prompt,
          user_prompt_template=excluded.user_prompt_template,
          context_rules=excluded.context_rules,
          model=excluded.model,
          is_builtin=excluded.is_builtin,
          source_uri=excluded.source_uri,
          source_hash=excluded.source_hash,
          version=excluded.version,
          scope=excluded.scope,
          package_id=excluded.package_id,
          enabled=excluded.enabled,
          is_valid=excluded.is_valid,
          error_code=excluded.error_code,
          error_message=excluded.error_message,
          updated_at=excluded.updated_at`
    )

    upsert.run({
      id: skillId,
      name,
      description,
      tag,
      system_prompt: system,
      user_prompt_template: user,
      context_rules: contextRules.json,
      model: preferredModel,
      is_builtin: 0,
      source_uri: filePath,
      source_hash: sourceHash,
      version,
      scope,
      package_id: packageId,
      created_at: now,
      updated_at: now,
    })

    try {
      broadcast?.('skills:changed', { skillIds: [skillId], reason: 'write', atMs: Date.now() })
    } catch (error) {
      logger?.warn?.('skills', 'broadcast failed', { message: error?.message })
    }

    return { written: true, sourceUri: filePath }
  })
}

module.exports = { registerSkillsIpcHandlers }
