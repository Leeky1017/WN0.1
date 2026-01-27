const Anthropic = require('@anthropic-ai/sdk')
const { incrementWritingStats, toLocalDateKey } = require('../lib/writing-stats.cjs')

const AI_STREAM_EVENT = 'ai:skill:stream'

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function coerceString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Ensures prompt fields are strings without mutating the content.
 * Why: renderer is the SSOT for ContextAssembler output; main must not trim/normalize prompt bytes.
 */
function requirePromptString(value, fieldName) {
  if (typeof value !== 'string') throw createIpcError('INVALID_ARGUMENT', `Invalid ${fieldName}`, { fieldName })
  if (!value.trim()) throw createIpcError('INVALID_ARGUMENT', `${fieldName} is empty`, { fieldName })
  return value
}

function nowIso() {
  return new Date().toISOString()
}

function generateRunId() {
  const rand = Math.random().toString(16).slice(2, 10)
  return `ai_${Date.now()}_${rand}`
}

function fnv1a32Hex(text) {
  const raw = typeof text === 'string' ? text : ''
  let hash = 0x811c9dc5
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function readSkillRow(db, skillId) {
  if (!db) throw new Error('readSkillRow requires db')
  const id = coerceString(skillId)
  if (!id) return null
  return db
    .prepare(
      `SELECT id, name, description, tag, system_prompt, user_prompt_template, context_rules, model, is_builtin,
              enabled, is_valid, error_code, error_message, created_at, updated_at
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

function resolveBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value !== 0
  if (typeof value === 'string') {
    const raw = value.trim().toLowerCase()
    if (raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on') return true
    if (raw === 'false' || raw === '0' || raw === 'no' || raw === 'off') return false
  }
  return null
}

function resolvePromptCachingEnabled(config) {
  const env = resolveBoolean(process.env.WN_AI_PROMPT_CACHING_ENABLED)
  if (env !== null) return env
  const configured = resolveBoolean(config?.get?.('ai.promptCaching.enabled'))
  if (configured !== null) return configured
  return true
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

function shouldFallbackPromptCaching(err) {
  if (!err || typeof err !== 'object') return false
  const status = typeof err.status === 'number' ? err.status : null
  if (status !== 400) return false
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return message.includes('cache_control') || message.includes('cache control') || message.includes('system')
}

function toUsageSummary(usage) {
  if (!usage || typeof usage !== 'object') return null
  const record = usage
  const keys = [
    'input_tokens',
    'output_tokens',
    'cache_creation_input_tokens',
    'cache_read_input_tokens',
    'cache_creation_output_tokens',
    'cache_read_output_tokens',
  ]
  const out = {}
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = value
  }
  return Object.keys(out).length > 0 ? out : null
}

/**
 * Why: injected refs are used for audit/debug; they MUST NOT leak absolute machine paths.
 * Failure: invalid refs MUST surface as INVALID_ARGUMENT (do not silently drop).
 */
function normalizeInjectedRefs(value) {
  if (!Array.isArray(value)) return []
  const normalized = []
  const seen = new Set()
  for (const raw of value) {
    if (typeof raw !== 'string') continue
    const trimmed = raw.trim().replace(/\\/g, '/')
    if (!trimmed) continue
    if (trimmed.startsWith('/') || trimmed.startsWith('\\\\') || /^[a-zA-Z]:\//.test(trimmed) || /^[a-zA-Z]:\\/.test(raw)) {
      throw createIpcError('INVALID_ARGUMENT', 'injected.refs MUST be project-relative (no absolute paths)', { ref: raw })
    }
    if (trimmed.includes('://') || trimmed.startsWith('file:')) {
      throw createIpcError('INVALID_ARGUMENT', 'injected.refs MUST be project-relative (no URLs)', { ref: raw })
    }
    if (seen.has(trimmed)) continue
    seen.add(trimmed)
    normalized.push(trimmed)
  }
  normalized.sort((a, b) => a.localeCompare(b))
  return normalized
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
    if (skillRow.enabled === 0) throw createIpcError('CONFLICT', 'Skill is disabled', { skillId })
    if (skillRow.is_valid === 0) {
      throw createIpcError('INVALID_ARGUMENT', 'Skill is invalid', {
        skillId,
        error: { code: coerceString(skillRow.error_code) || 'INVALID_ARGUMENT', message: coerceString(skillRow.error_message) || 'Invalid skill' },
      })
    }

    const prompt = payload?.prompt
    const system = requirePromptString(prompt?.systemPrompt, 'prompt.systemPrompt')
    const user = requirePromptString(prompt?.userContent, 'prompt.userContent')
    const prefixHash = fnv1a32Hex(system)
    const stablePrefixHash = prefixHash
    const promptHash = fnv1a32Hex(`${system}\n\n---\n\n${user}`)

    const injectedMemory = Array.isArray(payload?.injected?.memory) ? payload.injected.memory : []
    const injectedRefs = normalizeInjectedRefs(payload?.injected?.refs)
    const injectedContextRules = isRecord(payload?.injected?.contextRules) ? payload.injected.contextRules : undefined

    const ai = assertConfigured()
    const model = resolveModel(config, skillRow)
    const temperature = resolveTemperature(config)
    const maxTokens = resolveMaxTokens(config, skillRow)
    const timeoutMs = resolveTimeoutMs(config)
    const promptCachingEnabled = resolvePromptCachingEnabled(config)

    const runId = generateRunId()
    const controller = new AbortController()
    runs.set(runId, { controller, status: 'streaming' })

    const sender = evt.sender

    logger?.info?.('ai', 'run start', { runId, skillId, model, baseUrl: ai.baseUrl, promptHash, stablePrefixHash, promptCachingEnabled })

    if (db) {
      try {
        incrementWritingStats(db, toLocalDateKey(), { skillsUsed: 1 })
      } catch (error) {
        logger?.error?.('stats', 'skills_used increment failed', { skillId, message: error?.message })
      }
    }

    void (async () => {
      try {
        const client = new Anthropic({
          apiKey: ai.apiKey,
          baseURL: ai.baseUrl,
          timeout: timeoutMs,
        })

        if (stream) {
          const request = {
            model,
            max_tokens: maxTokens,
            temperature,
            system: promptCachingEnabled
              ? [
                  {
                    type: 'text',
                    text: system,
                    cache_control: { type: 'ephemeral' },
                  },
                ]
              : system,
            messages: [{ role: 'user', content: user }],
          }

          let runner
          try {
            runner = client.messages.stream(request, { signal: controller.signal })
          } catch (error) {
            if (promptCachingEnabled && !controller.signal.aborted && shouldFallbackPromptCaching(error)) {
              logger?.warn?.('ai', 'prompt caching fallback (stream)', { runId, message: error?.message })
              runner = client.messages.stream({ ...request, system }, { signal: controller.signal })
            } else {
              throw error
            }
          }

          let assembled = ''
          runner.on('text', (delta) => {
            if (typeof delta !== 'string' || !delta) return
            assembled += delta
            try {
              sender.send(AI_STREAM_EVENT, { type: 'delta', runId, text: delta })
            } catch (error) {
              logger?.debug?.('ai', 'stream delta send failed', { runId, message: error?.message })
            }
          })

          await runner.done()
          const usage =
            typeof runner.finalMessage === 'function'
              ? await runner
                  .finalMessage()
                  .then((m) => toUsageSummary(m?.usage))
                  .catch(() => null)
              : null
          const finalText = coerceString(assembled) || coerceString(await runner.finalText().catch(() => ''))

          if (usage) logger?.info?.('ai', 'run usage', { runId, ...usage })

          try {
            sender.send(AI_STREAM_EVENT, {
              type: 'done',
              runId,
              result: { text: finalText, meta: { provider: ai.provider, model } },
            })
          } catch (error) {
            logger?.debug?.('ai', 'stream done send failed', { runId, message: error?.message })
          }
        } else {
          const request = {
            model,
            max_tokens: maxTokens,
            temperature,
            system: promptCachingEnabled
              ? [
                  {
                    type: 'text',
                    text: system,
                    cache_control: { type: 'ephemeral' },
                  },
                ]
              : system,
            messages: [{ role: 'user', content: user }],
          }

          let resp
          try {
            resp = await client.messages.create(request, { signal: controller.signal })
          } catch (error) {
            if (promptCachingEnabled && !controller.signal.aborted && shouldFallbackPromptCaching(error)) {
              logger?.warn?.('ai', 'prompt caching fallback (non-stream)', { runId, message: error?.message })
              resp = await client.messages.create({ ...request, system }, { signal: controller.signal })
            } else {
              throw error
            }
          }

          const blocks = Array.isArray(resp?.content) ? resp.content : []
          const text = blocks
            .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
            .map((b) => b.text)
            .join('')
            .trim()

          const usage = toUsageSummary(resp?.usage)
          if (usage) logger?.info?.('ai', 'run usage', { runId, ...usage })

          try {
            sender.send(AI_STREAM_EVENT, {
              type: 'done',
              runId,
              result: { text, meta: { provider: ai.provider, model } },
            })
          } catch (error) {
            logger?.debug?.('ai', 'non-stream done send failed', { runId, message: error?.message })
          }
        }
      } catch (error) {
        const streamError = toStreamError(error)
        logger?.error?.('ai', 'run error', { runId, code: streamError.code, message: streamError.message })
        try {
          sender.send(AI_STREAM_EVENT, { type: 'error', runId, error: streamError })
        } catch (sendError) {
          logger?.debug?.('ai', 'stream error send failed', { runId, message: sendError?.message })
        }
      } finally {
        runs.delete(runId)
      }
    })()

    return {
      runId,
      stream,
      injected: { memory: injectedMemory, refs: injectedRefs, ...(injectedContextRules ? { contextRules: injectedContextRules } : {}) },
      prompt: { prefixHash, stablePrefixHash, promptHash },
    }
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
