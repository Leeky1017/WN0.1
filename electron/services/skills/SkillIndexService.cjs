const crypto = require('node:crypto')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')

const chokidar = require('chokidar')
const yaml = require('yaml')

function nowIso() {
  return new Date().toISOString()
}

function coerceString(value) {
  return typeof value === 'string' ? value.trim() : ''
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

function estimateTokensApproxV1(text) {
  const raw = typeof text === 'string' ? text : ''
  const trimmed = raw.trim()
  if (!trimmed) return 0

  let cjk = 0
  for (const ch of trimmed) {
    const code = ch.charCodeAt(0)
    const isCjk = code >= 0x4e00 && code <= 0x9fff
    if (isCjk) cjk += 1
  }
  const nonCjk = Math.max(0, trimmed.length - cjk)
  return Math.max(0, Math.floor(cjk + Math.ceil(nonCjk / 3)))
}

function splitFrontmatter(text) {
  const normalized = (typeof text === 'string' ? text : '').replace(/\r\n/g, '\n').replace(/^\uFEFF/, '')
  const lines = normalized.split('\n')
  if ((lines[0] ?? '').trim() !== '---') {
    return { ok: false, error: { code: 'INVALID_ARGUMENT', message: 'Missing YAML frontmatter', details: { reason: 'missing_frontmatter' } } }
  }
  let endIndex = -1
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i]?.trim() === '---') {
      endIndex = i
      break
    }
  }
  if (endIndex === -1) {
    return {
      ok: false,
      error: { code: 'INVALID_ARGUMENT', message: 'Unterminated YAML frontmatter', details: { reason: 'unterminated_frontmatter' } },
    }
  }
  return {
    ok: true,
    yaml: lines.slice(1, endIndex).join('\n'),
    markdown: lines.slice(endIndex + 1).join('\n'),
  }
}

function parseStringArray(value) {
  if (!Array.isArray(value)) return null
  const out = []
  for (const item of value) {
    const trimmed = coerceString(item)
    if (!trimmed) continue
    out.push(trimmed)
  }
  return out
}

function parseSkillFile(text) {
  const split = splitFrontmatter(text)
  if (!split.ok) return split

  let parsed
  try {
    parsed = yaml.parse(split.yaml)
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'INVALID_ARGUMENT',
        message: 'Invalid YAML frontmatter',
        details: { reason: 'yaml_parse_failed', message: error?.message },
      },
    }
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: { code: 'INVALID_ARGUMENT', message: 'YAML frontmatter must be a mapping', details: { reason: 'frontmatter_not_object' } } }
  }

  const fm = parsed
  const tags = parseStringArray(fm.tags) ?? (coerceString(fm.tag) ? [coerceString(fm.tag)] : null)

  const prompt = isRecord(fm.prompt)
    ? {
        system: typeof fm.prompt.system === 'string' ? fm.prompt.system : null,
        user: typeof fm.prompt.user === 'string' ? fm.prompt.user : null,
      }
    : null

  const contextMaxInstructionTokens = isRecord(fm.context) && isRecord(fm.context.hints) ? fm.context.hints.maxInstructionTokens : null
  const maxInstructionTokens =
    typeof contextMaxInstructionTokens === 'number' && Number.isFinite(contextMaxInstructionTokens) && contextMaxInstructionTokens > 0
      ? Math.floor(contextMaxInstructionTokens)
      : null

  const modelPreferred = isRecord(fm.modelProfile) ? coerceString(fm.modelProfile.preferred) : ''

  return {
    ok: true,
    data: {
      id: coerceString(fm.id) || null,
      name: coerceString(fm.name) || null,
      description: coerceString(fm.description) || null,
      version: coerceString(fm.version) || null,
      tags,
      kind: coerceString(fm.kind) || null,
      scope: coerceString(fm.scope) || null,
      packageId: coerceString(fm.packageId || fm.package_id) || null,
      prompt,
      modelPreferred: modelPreferred || null,
      maxInstructionTokens,
      raw: fm,
      markdown: split.markdown,
    },
  }
}

function derivePackageMeta(packagesDir, filePath) {
  const root = coerceString(packagesDir)
  const full = coerceString(filePath)
  if (!root || !full) return {}

  const rel = path.relative(root, full)
  const parts = rel.split(path.sep)
  if (parts.length < 5) return {}
  const [packageId, _packageVersion, skillsDirName] = parts
  if (!packageId || !skillsDirName) return {}
  if (skillsDirName !== 'skills') return {}
  return { packageId }
}

function buildDefaultContextRulesJson() {
  return JSON.stringify({ includeArticle: true, includeStyleGuide: true })
}

function stableInvalidId(scope, sourceUri) {
  const hash = crypto.createHash('sha256').update(`${scope}:${sourceUri}`).digest('hex').slice(0, 12)
  return `invalid:${scope}:${hash}`
}

function scopePriority(scope) {
  if (scope === 'project') return 3
  if (scope === 'global') return 2
  return 1
}

async function fileExists(p) {
  try {
    await fsp.access(p)
    return true
  } catch {
    return false
  }
}

async function walkForSkillMd(rootDir) {
  const results = []
  const stack = [rootDir]

  while (stack.length > 0) {
    const dir = stack.pop()
    if (!dir) continue
    let entries
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        stack.push(fullPath)
        continue
      }
      if (entry.isFile() && entry.name === 'SKILL.md') results.push(fullPath)
    }
  }

  return results
}

class SkillIndexService {
  constructor(options = {}) {
    this.db = options.db ?? null
    this.logger = options.logger ?? null
    this.userDataDir = coerceString(options.userDataDir)
    this.builtinPackagesDir = coerceString(options.builtinPackagesDir)
    this.onIndexChanged = typeof options.onIndexChanged === 'function' ? options.onIndexChanged : null

    this.globalPackagesDir = this.userDataDir ? path.join(this.userDataDir, 'skills', 'packages') : ''
    this.activeProjectId = null
    this.projectPackagesDir = null

    /** @type {Map<string, { scope: string, skillId: string, sourceHash: string, mtimeMs: number, indexed: any }>} */
    this.sourcesByUri = new Map()
    /** @type {Map<string, { builtin?: string, global?: string, project?: string }>} */
    this.bySkillId = new Map()
    /** @type {Map<string, string>} */
    this.effectiveUriBySkillId = new Map()

    this.pending = null
    /** @type {Map<string, { scope: string, filePath: string }>} */
    this.pendingFiles = new Map()

    this.watchers = { builtin: null, global: null, project: null }

    if (this.db) {
      this.stmtUpsert = this.db.prepare(
        `INSERT INTO skills (
          id, name, description, tag, system_prompt, user_prompt_template, context_rules, model, is_builtin,
          source_uri, source_hash, version, scope, package_id,
          enabled, is_valid, error_code, error_message,
          created_at, updated_at
        ) VALUES (
          @id, @name, @description, @tag, @system_prompt, @user_prompt_template, @context_rules, @model, @is_builtin,
          @source_uri, @source_hash, @version, @scope, @package_id,
          1, @is_valid, @error_code, @error_message,
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
          is_valid=excluded.is_valid,
          error_code=excluded.error_code,
          error_message=excluded.error_message,
          updated_at=excluded.updated_at`
      )
      this.stmtDelete = this.db.prepare('DELETE FROM skills WHERE id = ?')
      this.stmtListManaged = this.db.prepare("SELECT id FROM skills WHERE scope IN ('builtin','global','project')")
    }
  }

  async start() {
    if (!this.db) throw new Error('SkillIndexService requires db')

    await this.ensureScopeDirs()
    await this.reindexAll()
    this.startWatchers()
    this.logger?.info?.('skills', 'index service started')
  }

  async ensureScopeDirs() {
    const dirs = [this.globalPackagesDir].filter(Boolean)
    for (const dir of dirs) {
      try {
        await fsp.mkdir(dir, { recursive: true })
      } catch {
        // ignore
      }
    }
  }

  async setActiveProject(projectId) {
    const next = coerceString(projectId) || null
    if (this.activeProjectId === next) return

    const prevProjectDir = this.projectPackagesDir
    this.activeProjectId = next
    this.projectPackagesDir = next && this.userDataDir ? path.join(this.userDataDir, 'projects', next, '.writenow', 'skills', 'packages') : null

    if (prevProjectDir) {
      await this.dropScope('project')
    }

    if (this.projectPackagesDir) {
      try {
        await fsp.mkdir(this.projectPackagesDir, { recursive: true })
      } catch {
        // ignore
      }
      await this.reindexScope('project')
    }

    this.restartProjectWatcher()
  }

  stop() {
    for (const watcher of Object.values(this.watchers)) {
      try {
        watcher?.close?.()
      } catch {
        // ignore
      }
    }
    this.watchers = { builtin: null, global: null, project: null }
    if (this.pending) clearTimeout(this.pending)
    this.pending = null
    this.pendingFiles.clear()
    this.logger?.info?.('skills', 'index service stopped')
  }

  startWatchers() {
    this.watchers.builtin = this.createWatcher('builtin', this.builtinPackagesDir)
    this.watchers.global = this.createWatcher('global', this.globalPackagesDir)
    this.restartProjectWatcher()
  }

  restartProjectWatcher() {
    try {
      this.watchers.project?.close?.()
    } catch {
      // ignore
    }
    this.watchers.project = this.createWatcher('project', this.projectPackagesDir)
  }

  createWatcher(scope, rootDir) {
    const root = coerceString(rootDir)
    if (!root) return null
    const pattern = path.join(root, '**', 'SKILL.md')
    const watcher = chokidar.watch(pattern, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 25 },
    })

    watcher.on('add', (filePath) => this.enqueueFile(scope, filePath))
    watcher.on('change', (filePath) => this.enqueueFile(scope, filePath))
    watcher.on('unlink', (filePath) => this.enqueueFile(scope, filePath))
    watcher.on('error', (error) => this.logger?.warn?.('skills', 'watcher error', { scope, message: error?.message }))

    return watcher
  }

  enqueueFile(scope, filePath) {
    const abs = coerceString(filePath)
    if (!abs) return
    const key = `${scope}:${abs}`
    this.pendingFiles.set(key, { scope, filePath: abs })
    if (this.pending) clearTimeout(this.pending)
    this.pending = setTimeout(() => {
      this.pending = null
      this.flushPending().catch((error) => this.logger?.warn?.('skills', 'flush pending failed', { message: error?.message }))
    }, 120)
  }

  async flushPending() {
    const items = [...this.pendingFiles.values()]
    this.pendingFiles.clear()
    if (items.length === 0) return

    const affected = new Set()
    for (const item of items) {
      const ids = await this.refreshFile(item.scope, item.filePath)
      for (const id of ids) affected.add(id)
    }

    await this.reconcileSkillIds([...affected])
  }

  async reindexAll() {
    await this.dropScope('builtin')
    await this.dropScope('global')
    await this.reindexScope('builtin')
    await this.reindexScope('global')
    await this.cleanupManagedRows()
  }

  async cleanupManagedRows() {
    if (!this.db) return
    const changed = []
    const tx = this.db.transaction(() => {
      const managedIds = this.stmtListManaged.all().map((r) => r.id).filter(Boolean)
      for (const id of managedIds) {
        if (this.bySkillId.has(id)) continue
        this.stmtDelete.run(id)
        this.effectiveUriBySkillId.delete(id)
        changed.push(id)
      }
    })
    try {
      tx()
      if (changed.length > 0) {
        try {
          this.onIndexChanged?.({ skillIds: changed, reason: 'cleanup' })
        } catch {
          // ignore
        }
      }
    } catch (error) {
      this.logger?.warn?.('skills', 'cleanup managed rows failed', { message: error?.message })
    }
  }

  async reindexScope(scope) {
    const rootDir = scope === 'builtin' ? this.builtinPackagesDir : scope === 'global' ? this.globalPackagesDir : this.projectPackagesDir
    const root = coerceString(rootDir)
    if (!root) return
    if (!(await fileExists(root))) return

    const files = await walkForSkillMd(root)
    const affected = new Set()
    for (const filePath of files) {
      const ids = await this.refreshFile(scope, filePath)
      for (const id of ids) affected.add(id)
    }
    await this.reconcileSkillIds([...affected])
  }

  async dropScope(scope) {
    const affected = new Set()
    for (const [uri, entry] of this.sourcesByUri.entries()) {
      if (entry.scope !== scope) continue
      this.sourcesByUri.delete(uri)
      const skillId = entry.skillId
      affected.add(skillId)

      const byScope = this.bySkillId.get(skillId)
      if (byScope && byScope[scope] === uri) {
        delete byScope[scope]
        if (!byScope.builtin && !byScope.global && !byScope.project) this.bySkillId.delete(skillId)
      }
    }
    await this.reconcileSkillIds([...affected])
  }

  async refreshFile(scope, filePath) {
    const affected = []
    const abs = coerceString(filePath)
    if (!abs) return affected
    const uri = abs

    const previous = this.sourcesByUri.get(uri) || null
    const previousSkillId = previous ? previous.skillId : null

    const exists = await fileExists(abs)
    if (!exists) {
      if (previous) {
        this.sourcesByUri.delete(uri)
        const byScope = this.bySkillId.get(previous.skillId)
        if (byScope && byScope[scope] === uri) {
          delete byScope[scope]
          if (!byScope.builtin && !byScope.global && !byScope.project) this.bySkillId.delete(previous.skillId)
        }
        affected.push(previous.skillId)
      }
      return affected
    }

    let stat
    let text
    try {
      stat = await fsp.stat(abs)
      text = await fsp.readFile(abs, 'utf8')
    } catch (error) {
      const skillId = previousSkillId || stableInvalidId(scope, uri)
      this.setSourceEntry(uri, {
        scope,
        skillId,
        sourceHash: '',
        mtimeMs: 0,
        indexed: this.buildInvalidIndexedRow(scope, uri, '', skillId, null, {
          code: 'IO_ERROR',
          message: 'I/O error',
          details: { message: error?.message },
        }),
      })
      affected.push(skillId)
      return affected
    }

    const sourceHash = crypto.createHash('sha256').update(text).digest('hex')
    const mtimeMs = typeof stat.mtimeMs === 'number' ? stat.mtimeMs : Date.now()
    if (previous && previous.sourceHash === sourceHash) return affected

    const parsed = parseSkillFile(text)
    if (!parsed.ok) {
      const skillId = previousSkillId || stableInvalidId(scope, uri)
      this.setSourceEntry(uri, {
        scope,
        skillId,
        sourceHash,
        mtimeMs,
        indexed: this.buildInvalidIndexedRow(scope, uri, sourceHash, skillId, null, parsed.error),
      })
      affected.push(skillId)
      return affected
    }

    const derived = derivePackageMeta(scope === 'builtin' ? this.builtinPackagesDir : scope === 'global' ? this.globalPackagesDir : this.projectPackagesDir, abs)
    const skillId = parsed.data.id || stableInvalidId(scope, uri)
    const built = this.buildIndexedRow(scope, uri, sourceHash, derived.packageId || parsed.data.packageId, parsed.data)

    if (previousSkillId && previousSkillId !== skillId) affected.push(previousSkillId)
    affected.push(skillId)

    this.setSourceEntry(uri, { scope, skillId, sourceHash, mtimeMs, indexed: built })
    return affected
  }

  setSourceEntry(uri, entry) {
    const prev = this.sourcesByUri.get(uri) || null
    if (prev && prev.skillId !== entry.skillId) {
      const prevMap = this.bySkillId.get(prev.skillId)
      if (prevMap && prevMap[entry.scope] === uri) {
        delete prevMap[entry.scope]
        if (!prevMap.builtin && !prevMap.global && !prevMap.project) this.bySkillId.delete(prev.skillId)
      }
    }

    this.sourcesByUri.set(uri, entry)
    const map = this.bySkillId.get(entry.skillId) || {}

    const currentUri = map[entry.scope]
    if (!currentUri) {
      map[entry.scope] = uri
    } else if (currentUri !== uri) {
      const existing = this.sourcesByUri.get(currentUri)
      if (!existing || entry.mtimeMs >= existing.mtimeMs) {
        map[entry.scope] = uri
      }
    }

    this.bySkillId.set(entry.skillId, map)
  }

  buildInvalidIndexedRow(scope, sourceUri, sourceHash, skillId, fallbackName, error) {
    const baseName = coerceString(fallbackName) || path.basename(path.dirname(sourceUri)) || 'Invalid SKILL'
    const resolvedId = coerceString(skillId) || stableInvalidId(scope, sourceUri)
    return {
      id: resolvedId,
      name: baseName,
      description: null,
      tag: null,
      system_prompt: null,
      user_prompt_template: '',
      context_rules: buildDefaultContextRulesJson(),
      model: 'claude-3-5-sonnet-latest',
      is_builtin: scope === 'builtin' ? 1 : 0,
      source_uri: sourceUri,
      source_hash: coerceString(sourceHash) || '',
      version: null,
      scope,
      package_id: null,
      is_valid: 0,
      error_code: error?.code || 'INVALID_ARGUMENT',
      error_message: error?.message || 'Invalid SKILL.md',
    }
  }

  buildIndexedRow(scope, sourceUri, sourceHash, packageId, parsed) {
    const id = coerceString(parsed.id)
    const name = coerceString(parsed.name)
    const version = coerceString(parsed.version)
    const tags = Array.isArray(parsed.tags) ? parsed.tags : []
    const tag = tags.length > 0 ? coerceString(tags[0]) : null
    const model = coerceString(parsed.modelPreferred) || 'claude-3-5-sonnet-latest'
    const promptSystem = typeof parsed.prompt?.system === 'string' ? parsed.prompt.system : ''
    const promptUser = typeof parsed.prompt?.user === 'string' ? parsed.prompt.user : ''

    const maxTokens = typeof parsed.maxInstructionTokens === 'number' ? parsed.maxInstructionTokens : 5000
    const estimated = estimateTokensApproxV1(`${promptSystem}\n\n${promptUser}`)

    let isValid = true
    let errorCode = null
    let errorMessage = null

    if (!id || !name) {
      isValid = false
      errorCode = 'INVALID_ARGUMENT'
      errorMessage = 'Missing required fields (id/name)'
    } else if (!version || !isValidSemVer(version)) {
      isValid = false
      errorCode = 'INVALID_ARGUMENT'
      errorMessage = 'version must be valid SemVer'
    } else if (!tags || tags.length === 0) {
      isValid = false
      errorCode = 'INVALID_ARGUMENT'
      errorMessage = 'tags is required'
    } else if (!promptSystem.trim() || !promptUser.trim()) {
      isValid = false
      errorCode = 'INVALID_ARGUMENT'
      errorMessage = 'prompt.system and prompt.user are required'
    } else if (estimated > maxTokens) {
      isValid = false
      errorCode = 'INVALID_ARGUMENT'
      errorMessage = 'skill prompt exceeds instruction token budget'
    }

    return {
      id: id || stableInvalidId(scope, sourceUri),
      name: name || path.basename(path.dirname(sourceUri)) || 'SKILL',
      description: parsed.description || null,
      tag,
      system_prompt: promptSystem || null,
      user_prompt_template: promptUser || '',
      context_rules: buildDefaultContextRulesJson(),
      model,
      is_builtin: scope === 'builtin' ? 1 : 0,
      source_uri: sourceUri,
      source_hash: sourceHash,
      version: version || null,
      scope,
      package_id: packageId || null,
      is_valid: isValid ? 1 : 0,
      error_code: isValid ? null : errorCode,
      error_message: isValid ? null : errorMessage,
    }
  }

  async reconcileSkillIds(skillIds) {
    if (!this.db) return
    const list = Array.isArray(skillIds) ? skillIds.filter((id) => coerceString(id)) : []
    if (list.length === 0) return

    const now = nowIso()
    const tx = this.db.transaction(() => {
      for (const skillId of list) {
        const effective = this.resolveEffective(skillId)
        if (!effective) {
          if (this.effectiveUriBySkillId.has(skillId)) {
            this.stmtDelete.run(skillId)
            this.effectiveUriBySkillId.delete(skillId)
          }
          continue
        }

        const row = effective.indexed
        this.stmtUpsert.run({
          ...row,
          created_at: now,
          updated_at: now,
        })
        this.effectiveUriBySkillId.set(skillId, effective.sourceUri)
      }
    })

    try {
      tx()
      try {
        this.onIndexChanged?.({ skillIds: list, reason: 'reconcile' })
      } catch {
        // ignore
      }
    } catch (error) {
      this.logger?.warn?.('skills', 'db reconcile failed', { message: error?.message })
    }
  }

  resolveEffective(skillId) {
    const map = this.bySkillId.get(skillId)
    if (!map) return null

    const candidates = []
    for (const scope of ['builtin', 'global', 'project']) {
      const uri = map[scope]
      if (!uri) continue
      const entry = this.sourcesByUri.get(uri)
      if (!entry) continue
      candidates.push({ ...entry, sourceUri: uri })
    }

    if (candidates.length === 0) return null
    candidates.sort((a, b) => scopePriority(b.scope) - scopePriority(a.scope))
    return candidates[0]
  }
}

module.exports = { SkillIndexService }
