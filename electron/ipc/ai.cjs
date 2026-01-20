const Anthropic = require('@anthropic-ai/sdk')

const AI_STREAM_EVENT = 'ai:skill:stream'

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

function generateRunId() {
  const rand = Math.random().toString(16).slice(2, 10)
  return `ai_${Date.now()}_${rand}`
}

function tryParseJson(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function readSkillRow(db, skillId) {
  if (!db) throw new Error('readSkillRow requires db')
  const id = coerceString(skillId)
  if (!id) return null
  return db
    .prepare(
      `SELECT id, name, description, tag, system_prompt, user_prompt_template, context_rules, model, is_builtin, created_at, updated_at
       FROM skills
       WHERE id = ?`
    )
    .get(id)
}

function resolveAiProvider(config) {
  const configured = coerceString(config?.get?.('ai.provider'))
  const env = coerceString(process.env.WN_AI_PROVIDER)
  const provider = env || configured || 'anthropic'
  if (provider !== 'anthropic') {
    throw createIpcError('UNSUPPORTED', 'Unsupported AI provider', { provider })
  }
  return provider
}

function resolveAiBaseUrl(config) {
  const configured = coerceString(config?.get?.('ai.baseUrl'))
  const env = coerceString(process.env.WN_AI_BASE_URL) || coerceString(process.env.ANTHROPIC_BASE_URL)
  const baseUrl = env || configured || 'https://api.anthropic.com'
  return baseUrl
}

function resolveAiApiKey(config, logger) {
  const env = coerceString(process.env.WN_AI_API_KEY) || coerceString(process.env.ANTHROPIC_API_KEY)
  try {
    const secure = config?.getSecure?.('ai.apiKey')
    const value = coerceString(secure)
    if (value) return value
  } catch (error) {
    logger?.warn?.('ai', 'secure api key unavailable, fallback to env', { message: error?.message })
  }
  if (env) return env
  return null
}

function resolveNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function resolveMaxTokens(config, skillRow) {
  const env = resolveNumber(process.env.WN_AI_MAX_TOKENS)
  if (env && env > 0) return Math.floor(env)
  const configured = resolveNumber(config?.get?.('ai.maxTokens'))
  if (configured && configured > 0) return Math.floor(configured)
  const skill = resolveNumber(skillRow?.max_tokens)
  if (skill && skill > 0) return Math.floor(skill)
  return 1024
}

function resolveTemperature(config) {
  const env = resolveNumber(process.env.WN_AI_TEMPERATURE)
  if (env !== null) return Math.min(2, Math.max(0, env))
  const configured = resolveNumber(config?.get?.('ai.temperature'))
  if (configured !== null) return Math.min(2, Math.max(0, configured))
  return 0.4
}

function resolveTimeoutMs(config) {
  const env = resolveNumber(process.env.WN_AI_TIMEOUT_MS)
  if (env && env > 0) return Math.floor(env)
  const configured = resolveNumber(config?.get?.('ai.timeoutMs'))
  if (configured && configured > 0) return Math.floor(configured)
  return 10 * 60 * 1000
}

function resolveModel(config, skillRow) {
  const env = coerceString(process.env.WN_AI_MODEL)
  const configured = coerceString(config?.get?.('ai.model'))
  const skillModel = coerceString(skillRow?.model)
  return env || skillModel || configured || 'claude-3-5-sonnet-latest'
}

function readArticleContext(db, articleId) {
  const id = coerceString(articleId)
  if (!db || !id) return null

  const row = db.prepare('SELECT id, title, content, project_id FROM articles WHERE id = ?').get(id)
  if (!row) return null

  const content = typeof row.content === 'string' ? row.content : ''
  const title = typeof row.title === 'string' ? row.title : ''
  const projectId = typeof row.project_id === 'string' ? row.project_id : null

  return {
    articleId: id,
    title,
    projectId,
    content,
  }
}

function readProjectContext(db, projectId) {
  const id = coerceString(projectId)
  if (!db || !id) return null

  const row = db.prepare('SELECT id, name, style_guide FROM projects WHERE id = ?').get(id)
  if (!row) return null

  const styleGuide = typeof row.style_guide === 'string' && row.style_guide.trim() ? row.style_guide : null
  const name = typeof row.name === 'string' ? row.name : ''
  return { projectId: id, name, styleGuide }
}

function formatContextBlock(context) {
  if (!context) return ''
  const title = typeof context.title === 'string' && context.title.trim() ? context.title.trim() : null
  const content = typeof context.content === 'string' ? context.content : ''

  const excerpt = content.trim().slice(0, 3000)
  const parts = []
  if (title) parts.push(`Article title: ${title}`)
  if (excerpt) parts.push(`Article excerpt:\n${excerpt}`)
  return parts.length > 0 ? parts.join('\n\n') : ''
}

function renderTemplate(template, vars) {
  let result = typeof template === 'string' ? template : ''

  for (const [key, value] of Object.entries(vars)) {
    const open = `{{#${key}}}`
    const close = `{{/${key}}}`

    while (true) {
      const start = result.indexOf(open)
      const end = result.indexOf(close)
      if (start === -1 || end === -1 || end < start) break

      const inner = result.slice(start + open.length, end)
      const replacement = value ? inner : ''
      result = result.slice(0, start) + replacement + result.slice(end + close.length)
    }
  }

  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{{${key}}}`).join(value)
  }

  return result
}

function buildPrompt({ skillRow, inputText, articleContext, projectContext }) {
  const systemPrompt =
    typeof skillRow?.system_prompt === 'string' && skillRow.system_prompt.trim()
      ? skillRow.system_prompt.trim()
      : 'You are a careful writing assistant. Follow the output constraints strictly.'

  const template = typeof skillRow?.user_prompt_template === 'string' ? skillRow.user_prompt_template : ''
  const contextRules = tryParseJson(skillRow?.context_rules)

  const includeArticle = contextRules?.includeArticle !== false
  const includeStyleGuide = contextRules?.includeStyleGuide !== false

  const contextText = includeArticle ? formatContextBlock(articleContext) : ''
  const styleGuide =
    includeStyleGuide && typeof projectContext?.styleGuide === 'string' && projectContext.styleGuide.trim()
      ? projectContext.styleGuide.trim()
      : ''

  const prompt = renderTemplate(template, {
    text: inputText,
    context: contextText,
    styleGuide,
  })

  return {
    system: systemPrompt,
    user: prompt,
  }
}

function toStreamError(err) {
  if (!err || typeof err !== 'object') return { code: 'INTERNAL', message: 'Internal error' }

  const name = typeof err.name === 'string' ? err.name : ''

  if (name === 'APIUserAbortError') return { code: 'CANCELED', message: 'Canceled', details: { at: nowIso() } }
  if (name === 'RateLimitError') return { code: 'RATE_LIMITED', message: 'Rate limited', details: { at: nowIso() } }
  if (name === 'APIConnectionTimeoutError') return { code: 'TIMEOUT', message: 'Request timed out', details: { at: nowIso() } }
  if (name === 'AuthenticationError' || name === 'PermissionDeniedError') {
    return { code: 'PERMISSION_DENIED', message: 'Authentication failed', details: { at: nowIso() } }
  }

  const message = typeof err.message === 'string' && err.message.trim() ? err.message.trim() : 'Upstream error'
  const status = typeof err.status === 'number' ? err.status : null
  return { code: 'UPSTREAM_ERROR', message, details: status ? { status } : undefined }
}

function registerAiIpcHandlers(ipcMain, options = {}) {
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  const config = options.config ?? null
  const logger = options.logger ?? null
  const db = options.db ?? null

  const runs = new Map()

  function assertConfigured() {
    const provider = resolveAiProvider(config)
    const baseUrl = resolveAiBaseUrl(config)
    const apiKey = resolveAiApiKey(config, logger)
    if (!apiKey) throw createIpcError('INVALID_ARGUMENT', 'AI API key is not configured', { provider })
    return { provider, baseUrl, apiKey }
  }

  handleInvoke('ai:skill:run', async (evt, payload) => {
    const skillId = coerceString(payload?.skillId)
    if (!skillId) throw createIpcError('INVALID_ARGUMENT', 'Invalid skillId', { skillId: payload?.skillId })

    const inputText = typeof payload?.input?.text === 'string' ? payload.input.text : ''
    if (!inputText.trim()) throw createIpcError('INVALID_ARGUMENT', 'Input text is empty')

    const stream = payload?.stream !== false

    const skillRow = db ? readSkillRow(db, skillId) : null
    if (!skillRow) throw createIpcError('NOT_FOUND', 'Skill not found', { skillId })

    const articleId = coerceString(payload?.context?.articleId)
    const projectId = coerceString(payload?.context?.projectId)

    const articleContext = articleId ? readArticleContext(db, articleId) : null
    const resolvedProjectId = projectId || articleContext?.projectId || ''
    const projectContext = resolvedProjectId ? readProjectContext(db, resolvedProjectId) : null

    const ai = assertConfigured()
    const model = resolveModel(config, skillRow)
    const temperature = resolveTemperature(config)
    const maxTokens = resolveMaxTokens(config, skillRow)
    const timeoutMs = resolveTimeoutMs(config)

    const runId = generateRunId()
    const controller = new AbortController()
    runs.set(runId, { controller, status: 'streaming' })

    const sender = evt.sender

    const { system, user } = buildPrompt({
      skillRow,
      inputText,
      articleContext,
      projectContext,
    })

    logger?.info?.('ai', 'run start', { runId, skillId, model, baseUrl: ai.baseUrl })

    void (async () => {
      try {
        const client = new Anthropic({
          apiKey: ai.apiKey,
          baseURL: ai.baseUrl,
          timeout: timeoutMs,
        })

        if (stream) {
          const runner = client.messages.stream(
            {
              model,
              max_tokens: maxTokens,
              temperature,
              system,
              messages: [{ role: 'user', content: user }],
            },
            { signal: controller.signal }
          )

          let assembled = ''
          runner.on('text', (delta) => {
            if (typeof delta !== 'string' || !delta) return
            assembled += delta
            try {
              sender.send(AI_STREAM_EVENT, { type: 'delta', runId, text: delta })
            } catch {
              // ignore
            }
          })

          await runner.done()
          const finalText = coerceString(assembled) || coerceString(await runner.finalText().catch(() => ''))

          try {
            sender.send(AI_STREAM_EVENT, {
              type: 'done',
              runId,
              result: { text: finalText, meta: { provider: ai.provider, model } },
            })
          } catch {
            // ignore
          }
        } else {
          const resp = await client.messages.create(
            {
              model,
              max_tokens: maxTokens,
              temperature,
              system,
              messages: [{ role: 'user', content: user }],
            },
            { signal: controller.signal }
          )

          const blocks = Array.isArray(resp?.content) ? resp.content : []
          const text = blocks
            .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
            .map((b) => b.text)
            .join('')
            .trim()

          try {
            sender.send(AI_STREAM_EVENT, {
              type: 'done',
              runId,
              result: { text, meta: { provider: ai.provider, model } },
            })
          } catch {
            // ignore
          }
        }
      } catch (error) {
        const streamError = toStreamError(error)
        logger?.error?.('ai', 'run error', { runId, code: streamError.code, message: streamError.message })
        try {
          sender.send(AI_STREAM_EVENT, { type: 'error', runId, error: streamError })
        } catch {
          // ignore
        }
      } finally {
        runs.delete(runId)
      }
    })()

    return { runId, stream }
  })

  handleInvoke('ai:skill:cancel', async (_evt, payload) => {
    const runId = coerceString(payload?.runId)
    if (!runId) throw createIpcError('INVALID_ARGUMENT', 'Invalid runId', { runId: payload?.runId })

    const run = runs.get(runId)
    if (!run) throw createIpcError('NOT_FOUND', 'Run not found', { runId })
    if (run.status !== 'streaming') throw createIpcError('CONFLICT', 'Run is not cancelable', { runId, status: run.status })

    run.status = 'canceled'
    run.controller.abort()
    logger?.info?.('ai', 'run canceled', { runId })
    return { canceled: true }
  })
}

module.exports = { registerAiIpcHandlers, AI_STREAM_EVENT }
