const Anthropic = require('@anthropic-ai/sdk')
const { randomUUID } = require('node:crypto')
const { incrementWritingStats, toLocalDateKey } = require('../lib/writing-stats.cjs')
const { selectMemoryForInjection, formatMemoryForPreferencesSection, ingestPreferenceSignals } = require('./memory.cjs')

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

function normalizeHttpBaseUrl(value) {
  const raw = coerceString(value)
  return raw ? raw.replace(/\/+$/, '') : ''
}

function resolveAiProxyEnabled(config) {
  const env = resolveBoolean(process.env.WN_AI_PROXY_ENABLED)
  if (env !== null) return env
  const configured = resolveBoolean(config?.get?.('ai.proxy.enabled'))
  if (configured !== null) return configured
  return false
}

function resolveAiProxyBaseUrl(config) {
  const env = normalizeHttpBaseUrl(process.env.WN_AI_PROXY_BASE_URL)
  const configured = normalizeHttpBaseUrl(config?.get?.('ai.proxy.baseUrl'))
  return env || configured || ''
}

function resolveAiProxyApiKey(config, logger) {
  const env = coerceString(process.env.WN_AI_PROXY_API_KEY)
  try {
    const secure = config?.getSecure?.('ai.proxy.apiKey')
    const value = coerceString(secure)
    if (value) return value
  } catch (error) {
    logger?.warn?.('ai', 'secure proxy api key unavailable, fallback to env', { message: error?.message })
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

function normalizeProjectId(value) {
  const id = coerceString(value)
  return id || null
}

function normalizeFeedbackAction(value) {
  const raw = coerceString(value)
  if (raw === 'accept' || raw === 'reject' || raw === 'partial') return raw
  return ''
}

function normalizeSignalArray(value) {
  if (!Array.isArray(value)) return []
  const out = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (!trimmed) continue
    out.push(trimmed)
  }
  return out
}

function extractFeedbackSignals(action, evidenceRef) {
  if (isRecord(evidenceRef) && isRecord(evidenceRef.signals)) {
    const signals = evidenceRef.signals
    const accepted = normalizeSignalArray(signals.accepted)
    const rejected = normalizeSignalArray(signals.rejected)
    return { accepted, rejected }
  }

  const single =
    typeof evidenceRef === 'string'
      ? evidenceRef.trim()
      : isRecord(evidenceRef) && typeof evidenceRef.signal === 'string'
        ? evidenceRef.signal.trim()
        : ''

  if (!single) return { accepted: [], rejected: [] }
  if (action === 'accept') return { accepted: [single], rejected: [] }
  if (action === 'reject') return { accepted: [], rejected: [single] }
  return { accepted: [], rejected: [] }
}

/**
 * Inject preferences into the stable system prompt.
 * Why: P1-001 requires "user preferences" to be present by default with deterministic formatting.
 */
function injectPreferencesIntoSystemPrompt(systemPrompt, preferencesText) {
  const system = typeof systemPrompt === 'string' ? systemPrompt : ''
  const block = typeof preferencesText === 'string' && preferencesText.trim() ? preferencesText : '(none)'

  const placeholders = ['{{WN_USER_PREFERENCES}}', '{{WN_PREFERENCES}}']
  for (const token of placeholders) {
    if (system.includes(token)) return system.split(token).join(block)
  }

  const headingRe = /^##\s*(用户偏好|User Preferences)\s*$/im
  if (!headingRe.test(system)) {
    return `${system}\n\n## 用户偏好\n${block}`
  }

  const lines = system.split('\n')
  const idx = lines.findIndex((line) => /^##\s*(用户偏好|User Preferences)\s*$/i.test(line.trim()))
  if (idx < 0) return `${system}\n\n## 用户偏好\n${block}`

  let end = lines.length
  for (let i = idx + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i].trim())) {
      end = i
      break
    }
  }

  const before = lines.slice(0, idx + 1)
  const after = lines.slice(end)
  return [...before, block, ...after].join('\n')
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

function isAbortError(err) {
  return Boolean(err && typeof err === 'object' && (err.name === 'AbortError' || err.code === 'ABORT_ERR'))
}

function createHttpError({ name, message, status, details }) {
  const error = new Error(message)
  error.name = name
  error.status = status
  if (typeof details !== 'undefined') error.details = details
  return error
}

async function readResponseTextSafe(resp) {
  try {
    const text = await resp.text()
    const trimmed = typeof text === 'string' ? text.trim() : ''
    return trimmed.length > 4096 ? `${trimmed.slice(0, 4096)}…` : trimmed
  } catch {
    return ''
  }
}

function toLiteLlmChatMessages(system, user) {
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

function createTimeoutController(timeoutMs) {
  const ms = typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) ? Math.floor(timeoutMs) : 0
  if (ms <= 0) return { controller: null, cancel: () => undefined }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('timeout')), ms)
  timer.unref?.()
  return { controller, cancel: () => clearTimeout(timer) }
}

function mergeAbortSignals(signals) {
  const list = Array.isArray(signals) ? signals.filter(Boolean) : []
  if (list.length === 0) return undefined
  if (list.length === 1) return list[0]
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
    return AbortSignal.any(list)
  }
  // Fallback: no merge support → best-effort (use first signal).
  return list[0]
}

async function toLiteLlmUpstreamError(resp) {
  const status = typeof resp?.status === 'number' ? resp.status : 0
  const text = await readResponseTextSafe(resp)

  let parsed = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = null
    }
  }

  const message =
    coerceString(parsed?.error?.message) ||
    coerceString(parsed?.message) ||
    (text ? text : `Upstream error (${status || 'unknown'})`)

  const name =
    status === 401 || status === 403
      ? 'AuthenticationError'
      : status === 429
        ? 'RateLimitError'
        : status === 408
          ? 'APIConnectionTimeoutError'
          : 'UpstreamError'

  return createHttpError({ name, message, status, details: status ? { status } : undefined })
}

async function litellmChatCompletion({ baseUrl, apiKey, payload, signal, timeoutMs }) {
  const timeout = createTimeoutController(timeoutMs)
  const mergedSignal = mergeAbortSignals([signal, timeout.controller?.signal])

  try {
    const resp = await fetch(`${normalizeHttpBaseUrl(baseUrl)}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: mergedSignal,
    })

    if (!resp.ok) throw await toLiteLlmUpstreamError(resp)

    const json = await resp.json().catch(() => null)
    const content = json?.choices?.[0]?.message?.content
    const text = typeof content === 'string' ? content.trim() : ''
    const usage = json?.usage ?? null
    return { text, usage }
  } catch (error) {
    if (isAbortError(error)) {
      if (timeout.controller?.signal.aborted) {
        const e = new Error('Request timed out')
        e.name = 'APIConnectionTimeoutError'
        throw e
      }
      const e = new Error('Canceled')
      e.name = 'APIUserAbortError'
      throw e
    }
    throw error
  } finally {
    timeout.cancel()
  }
}

async function litellmChatCompletionStream({ baseUrl, apiKey, payload, signal, timeoutMs, onDelta }) {
  const timeout = createTimeoutController(timeoutMs)
  const mergedSignal = mergeAbortSignals([signal, timeout.controller?.signal])
  const url = `${normalizeHttpBaseUrl(baseUrl)}/v1/chat/completions`

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ ...payload, stream: true }),
      signal: mergedSignal,
    })

    if (!resp.ok) throw await toLiteLlmUpstreamError(resp)
    if (!resp.body) throw createHttpError({ name: 'UpstreamError', message: 'Upstream stream body is empty', status: resp.status || 0 })

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    // Why: LiteLLM exposes OpenAI-compatible SSE streaming; parse "data: {json}" lines until "[DONE]".
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '')

      // Split on blank line boundaries (SSE event delimiter).
      while (true) {
        const idx = buffer.indexOf('\n\n')
        if (idx < 0) break
        const eventBlock = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)

        const lines = eventBlock.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const data = trimmed.slice('data:'.length).trim()
          if (!data) continue
          if (data === '[DONE]') return

          let json = null
          try {
            json = JSON.parse(data)
          } catch {
            json = null
          }

          const delta = json?.choices?.[0]?.delta?.content
          if (typeof delta === 'string' && delta) {
            try {
              onDelta(delta)
            } catch {
              // consumer error: ignore to keep stream alive
            }
          }
        }
      }
    }
  } catch (error) {
    if (isAbortError(error)) {
      if (timeout.controller?.signal.aborted) {
        const e = new Error('Request timed out')
        e.name = 'APIConnectionTimeoutError'
        throw e
      }
      const e = new Error('Canceled')
      e.name = 'APIUserAbortError'
      throw e
    }
    throw error
  } finally {
    timeout.cancel()
  }
}

function registerAiIpcHandlers(ipcMain, options = {}) {
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  const config = options.config ?? null
  const logger = options.logger ?? null
  const db = options.db ?? null

  const runs = new Map()
  const runLedger = new Map()

  function rememberRun(runId, record) {
    runLedger.set(runId, record)
    setTimeout(() => runLedger.delete(runId), 60 * 60 * 1000).unref?.()
  }

  function assertConfigured() {
    const proxyEnabled = resolveAiProxyEnabled(config)
    if (proxyEnabled) {
      const baseUrl = resolveAiProxyBaseUrl(config)
      if (!baseUrl) {
        throw createIpcError('INVALID_ARGUMENT', 'AI proxy baseUrl is not configured', { key: 'ai.proxy.baseUrl' })
      }
      const apiKey = resolveAiProxyApiKey(config, logger)
      return { transport: 'litellm', provider: 'litellm', baseUrl, apiKey, proxyEnabled: true }
    }

    const provider = resolveAiProvider(config)
    const baseUrl = resolveAiBaseUrl(config)
    const apiKey = resolveAiApiKey(config, logger)
    if (!apiKey) throw createIpcError('INVALID_ARGUMENT', 'AI API key is not configured', { provider })
    return { transport: 'direct', provider, baseUrl, apiKey, proxyEnabled: false }
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
    const contextProjectId = normalizeProjectId(payload?.context?.projectId)
    const injectedContextRules = isRecord(payload?.injected?.contextRules) ? payload.injected.contextRules : undefined
    const injectedRefs = normalizeInjectedRefs(payload?.injected?.refs)

    const injectedMemoryProvided = Array.isArray(payload?.injected?.memory) ? payload.injected.memory : []
    let injectedMemory = injectedMemoryProvided
    if (injectedMemory.length === 0 && db) {
      try {
        const selection = selectMemoryForInjection({ db, config, projectId: contextProjectId ?? undefined })
        injectedMemory = selection.items
      } catch (error) {
        logger?.warn?.('ai', 'auto memory injection failed', { skillId, message: error?.message })
        injectedMemory = []
      }
    }

    const preferencesText = formatMemoryForPreferencesSection(injectedMemory)
    const system = injectPreferencesIntoSystemPrompt(requirePromptString(prompt?.systemPrompt, 'prompt.systemPrompt'), preferencesText)
    const user = requirePromptString(prompt?.userContent, 'prompt.userContent')
    const prefixHash = fnv1a32Hex(system)
    const stablePrefixHash = prefixHash
    const promptHash = fnv1a32Hex(`${system}\n\n---\n\n${user}`)

    const ai = assertConfigured()
    const model = resolveModel(config, skillRow)
    const temperature = resolveTemperature(config)
    const maxTokens = resolveMaxTokens(config, skillRow)
    const timeoutMs = resolveTimeoutMs(config)
    const promptCachingEnabled = resolvePromptCachingEnabled(config)

    const runId = generateRunId()
    const controller = new AbortController()
    runs.set(runId, { controller, status: 'streaming' })
    rememberRun(runId, {
      runId,
      skillId,
      projectId: contextProjectId,
      startedAt: nowIso(),
      injected: { memory: injectedMemory, refs: injectedRefs, ...(injectedContextRules ? { contextRules: injectedContextRules } : {}) },
      prompt: { stablePrefixHash, promptHash },
    })

    const sender = evt.sender

    logger?.info?.('ai', 'run start', {
      runId,
      skillId,
      model,
      transport: ai.transport,
      baseUrl: ai.baseUrl,
      proxyEnabled: ai.proxyEnabled,
      promptHash,
      stablePrefixHash,
      promptCachingEnabled,
    })

    if (db) {
      try {
        incrementWritingStats(db, toLocalDateKey(), { skillsUsed: 1 })
      } catch (error) {
        logger?.error?.('stats', 'skills_used increment failed', { skillId, message: error?.message })
      }
    }

    void (async () => {
      try {
        if (ai.transport === 'litellm') {
          const payload = {
            model,
            max_tokens: maxTokens,
            temperature,
            messages: toLiteLlmChatMessages(system, user),
          }

          if (stream) {
            let assembled = ''
            await litellmChatCompletionStream({
              baseUrl: ai.baseUrl,
              apiKey: ai.apiKey,
              payload,
              signal: controller.signal,
              timeoutMs,
              onDelta: (delta) => {
                if (typeof delta !== 'string' || !delta) return
                assembled += delta
                try {
                  sender.send(AI_STREAM_EVENT, { type: 'delta', runId, text: delta })
                } catch (error) {
                  logger?.debug?.('ai', 'stream delta send failed', { runId, message: error?.message })
                }
              },
            })

            const finalText = coerceString(assembled)
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
            const resp = await litellmChatCompletion({
              baseUrl: ai.baseUrl,
              apiKey: ai.apiKey,
              payload,
              signal: controller.signal,
              timeoutMs,
            })

            try {
              sender.send(AI_STREAM_EVENT, {
                type: 'done',
                runId,
                result: { text: coerceString(resp?.text), meta: { provider: ai.provider, model } },
              })
            } catch (error) {
              logger?.debug?.('ai', 'non-stream done send failed', { runId, message: error?.message })
            }
          }

          return
        }

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
        const record = runLedger.get(runId)
        if (record) record.completedAt = nowIso()
      }
    })()

    return {
      runId,
      stream,
      injected: { memory: injectedMemory, refs: injectedRefs, ...(injectedContextRules ? { contextRules: injectedContextRules } : {}) },
      prompt: { prefixHash, stablePrefixHash, promptHash },
    }
  })

  handleInvoke('ai:skill:feedback', async (_evt, payload) => {
    if (!db) throw createIpcError('DB_ERROR', 'Database is not ready')
    const database = db

    const runId = coerceString(payload?.runId)
    if (!runId) throw createIpcError('INVALID_ARGUMENT', 'runId is required')

    const action = normalizeFeedbackAction(payload?.action)
    if (!action) throw createIpcError('INVALID_ARGUMENT', 'Invalid action', { action: payload?.action })

    const record = runLedger.get(runId)
    if (!record) throw createIpcError('NOT_FOUND', 'Run not found', { runId })

    const projectId = normalizeProjectId(payload?.projectId) ?? record.projectId
    if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required')

    const evidenceRef = typeof payload?.evidenceRef === 'undefined' ? null : payload.evidenceRef
    let evidenceJson = null
    if (evidenceRef !== null) {
      try {
        evidenceJson = JSON.stringify(evidenceRef)
      } catch (error) {
        throw createIpcError('INVALID_ARGUMENT', 'evidenceRef must be JSON-serializable', {
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const feedbackId = randomUUID()
    const createdAt = nowIso()

    try {
      database
        .prepare(
          `INSERT INTO skill_run_feedback (id, run_id, project_id, skill_id, action, evidence_ref, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(feedbackId, runId, projectId, record.skillId, action, evidenceJson, createdAt)
    } catch (error) {
      logger?.error?.('ai', 'feedback insert failed', { runId, message: error?.message })
      throw createIpcError('DB_ERROR', 'Failed to record feedback', { message: error?.message })
    }

    let learned = []
    let ignored = 0
    if (action === 'accept' || action === 'reject') {
      const signals = extractFeedbackSignals(action, evidenceRef)
      const ingested = ingestPreferenceSignals({
        db: database,
        config,
        logger,
        payload: { projectId, signals },
      })
      learned = Array.isArray(ingested?.learned) ? ingested.learned : []
      ignored = typeof ingested?.ignored === 'number' && Number.isFinite(ingested.ignored) ? ingested.ignored : 0
    }

    return { recorded: true, feedbackId, learned, ignored }
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

  // ─────────────────────────────────────────────────────────────────────────────
  // AI Proxy Settings (optional LiteLLM integration)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Read current AI Proxy settings.
   * Why: Allow Settings UI to display proxy configuration status.
   */
  handleInvoke('ai:proxy:settings:get', async () => {
    const enabled = resolveAiProxyEnabled(config)
    const baseUrl = resolveAiProxyBaseUrl(config)
    const apiKey = resolveAiProxyApiKey(config, logger)
    return {
      settings: {
        enabled,
        baseUrl,
        apiKey: apiKey ? '••••••••' : '',
        hasApiKey: Boolean(apiKey),
      },
    }
  })

  /**
   * Update AI Proxy settings.
   * Why: Allow Settings UI to configure proxy without environment variables.
   */
  handleInvoke('ai:proxy:settings:update', async (_evt, payload) => {
    if (!config) throw createIpcError('INTERNAL', 'Config is not available')

    const enabledPatch = typeof payload?.enabled === 'boolean' ? payload.enabled : undefined
    const baseUrlPatch = typeof payload?.baseUrl === 'string' ? payload.baseUrl : undefined
    const apiKeyPatch = typeof payload?.apiKey === 'string' ? payload.apiKey : undefined

    // Apply patches
    if (enabledPatch !== undefined) {
      config.set('ai.proxy.enabled', enabledPatch)
    }
    if (baseUrlPatch !== undefined) {
      config.set('ai.proxy.baseUrl', normalizeHttpBaseUrl(baseUrlPatch))
    }
    if (apiKeyPatch !== undefined) {
      // Use secure storage if available
      if (typeof config.setSecure === 'function') {
        try {
          config.setSecure('ai.proxy.apiKey', apiKeyPatch)
        } catch (error) {
          logger?.warn?.('ai', 'secure storage unavailable, falling back to regular config', { message: error?.message })
          config.set('ai.proxy.apiKey', apiKeyPatch)
        }
      } else {
        config.set('ai.proxy.apiKey', apiKeyPatch)
      }
    }

    // Re-read and return current state
    const enabled = resolveAiProxyEnabled(config)
    const baseUrl = resolveAiProxyBaseUrl(config)
    const apiKey = resolveAiProxyApiKey(config, logger)

    logger?.info?.('ai', 'proxy settings updated', { enabled, baseUrl: baseUrl || '(empty)', hasApiKey: Boolean(apiKey) })

    return {
      settings: {
        enabled,
        baseUrl,
        apiKey: apiKey ? '••••••••' : '',
        hasApiKey: Boolean(apiKey),
      },
    }
  })

  /**
   * Test AI Proxy connection by listing available models.
   * Why: Allow users to verify proxy configuration before enabling.
   */
  handleInvoke('ai:proxy:test', async (_evt, payload) => {
    const baseUrl = normalizeHttpBaseUrl(payload?.baseUrl)
    if (!baseUrl) throw createIpcError('INVALID_ARGUMENT', 'baseUrl is required')

    const apiKey = coerceString(payload?.apiKey)
    const modelsUrl = `${baseUrl}/v1/models`

    try {
      const headers = { 'content-type': 'application/json' }
      if (apiKey) headers.authorization = `Bearer ${apiKey}`

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      const res = await fetch(modelsUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        return {
          success: false,
          message: `HTTP ${res.status}: ${text.slice(0, 200) || res.statusText}`,
        }
      }

      const json = await res.json().catch(() => null)
      const models = Array.isArray(json?.data) ? json.data.map((m) => m?.id || '').filter(Boolean).slice(0, 20) : []

      return {
        success: true,
        message: `连接成功，共 ${models.length} 个模型可用`,
        models,
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        return { success: false, message: '连接超时（10秒）' }
      }
      return { success: false, message: error?.message || '连接失败' }
    }
  })
}

module.exports = { registerAiIpcHandlers, AI_STREAM_EVENT }
