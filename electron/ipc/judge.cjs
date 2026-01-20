const path = require('path')
const fs = require('fs')
const { BrowserWindow } = require('electron')

const { createModelDownloader } = require('../lib/model-downloader.cjs')
const { runJsonPrompt } = require('../lib/llm-runtime.cjs')
const modelConfig = require('../lib/model-config.cjs')

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function coerceString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function coerceNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function sanitizeError(err) {
  if (err && typeof err === 'object' && err.ipcError && typeof err.ipcError === 'object') {
    return {
      code: err.ipcError.code,
      message: err.ipcError.message,
      details: err.ipcError.details,
      retryable: err.ipcError.retryable,
    }
  }

  const message = err && typeof err === 'object' && typeof err.message === 'string' ? err.message : String(err || '')
  return { code: 'UPSTREAM_ERROR', message: message || 'Upstream error' }
}

function getDefaultModelPath(app) {
  const baseDir = path.join(app.getPath('userData'), modelConfig.modelDir)
  return path.join(baseDir, modelConfig.defaultModel.filename)
}

function getConfiguredModelPath(config, app) {
  const envOverride = coerceString(process.env.WN_JUDGE_MODEL_PATH)
  if (envOverride) return envOverride
  const stored = config?.get?.('judge.modelPath')
  const storedPath = coerceString(stored)
  if (storedPath) return storedPath
  return getDefaultModelPath(app)
}

function registerJudgeIpcHandlers(ipcMain, options = {}) {
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)
  const logger = options.logger ?? null
  const config = options.config ?? null
  const app = options.app
  if (!app || typeof app.getPath !== 'function') throw new Error('registerJudgeIpcHandlers requires { app }')

  const getWindows = typeof options.getWindows === 'function' ? options.getWindows : () => BrowserWindow.getAllWindows()

  const modelDir = path.join(app.getPath('userData'), modelConfig.modelDir)
  const downloader = createModelDownloader({ logger, modelDir })

  function buildDefaultConstraints(scope, projectId) {
    const base = scope === 'project' ? `project:${projectId ?? 'unknown'}` : 'global'
    const makeRule = (type, level, config) => ({
      id: `${base}:${type}`,
      type,
      enabled: false,
      config,
      level,
      scope,
      ...(scope === 'project' ? { projectId } : {}),
    })

    return [
      makeRule('forbidden_words', 'error', { words: [] }),
      makeRule('word_count', 'warning', { min: undefined, max: undefined }),
      makeRule('format', 'warning', { mode: 'list_only' }),
      makeRule('terminology', 'warning', { terms: [] }),
      makeRule('tone', 'warning', { tone: '' }),
      makeRule('coverage', 'warning', { points: [] }),
    ]
  }

  function getDefaultConstraintsConfig() {
    return {
      version: 1,
      global: { l2Enabled: true, rules: buildDefaultConstraints('global') },
      projects: {},
    }
  }

  function getConstraintsConfig() {
    const stored = config?.get?.('constraints.config')
    if (!stored || typeof stored !== 'object') return getDefaultConstraintsConfig()
    const obj = stored
    const version = typeof obj.version === 'number' ? obj.version : 1
    const global = obj.global && typeof obj.global === 'object' ? obj.global : null
    const projects = obj.projects && typeof obj.projects === 'object' ? obj.projects : {}

    const globalRules = Array.isArray(global?.rules) ? global.rules : buildDefaultConstraints('global')
    const globalL2 = typeof global?.l2Enabled === 'boolean' ? global.l2Enabled : true

    return {
      version,
      global: { l2Enabled: globalL2, rules: globalRules },
      projects,
    }
  }

  function setConstraintsConfig(nextConfig) {
    if (!nextConfig || typeof nextConfig !== 'object') throw createIpcError('INVALID_ARGUMENT', 'Invalid constraints config')
    config?.set?.('constraints.config', nextConfig)
    return nextConfig
  }

  let state = {
    status: 'idle',
    model: {
      name: modelConfig.defaultModel.name,
      filename: modelConfig.defaultModel.filename,
      url: modelConfig.defaultModel.url,
      size: modelConfig.defaultModel.size,
    },
    modelPath: getConfiguredModelPath(config, app),
    progress: undefined,
    error: undefined,
  }

  function broadcast() {
    const windows = getWindows()
    for (const win of windows) {
      try {
        win.webContents?.send?.('judge:modelStateChanged', state)
      } catch {
        // ignore
      }
    }
  }

  function setState(patch) {
    state = { ...state, ...patch }
    broadcast()
  }

  let downloadPromise = null
  async function ensureDefaultModelDownloaded() {
    if (downloadPromise) return downloadPromise

    const target = getDefaultModelPath(app)
    if (fs.existsSync(target)) {
      setState({ status: 'downloaded', modelPath: target, progress: undefined, error: undefined })
      return { ready: true, path: target }
    }

    setState({ status: 'downloading', modelPath: target, progress: undefined, error: undefined })

    downloadPromise = downloader
      .ensureModel(modelConfig.defaultModel, {
        onProgress: (progress) => setState({ status: 'downloading', progress }),
      })
      .then((result) => {
        setState({ status: 'downloaded', modelPath: result.path, progress: undefined, error: undefined })
        return result
      })
      .catch((err) => {
        const error = sanitizeError(err)
        logger?.error?.('judge', 'model download failed', { code: error.code, message: error.message })
        setState({ status: 'error', error })
        throw err
      })
      .finally(() => {
        downloadPromise = null
      })

    return downloadPromise
  }

  handleInvoke('judge:model:getState', async () => {
    return state
  })

  handleInvoke('judge:model:ensure', async () => {
    const modelPath = getConfiguredModelPath(config, app)
    const defaultPath = getDefaultModelPath(app)

    if (modelPath === defaultPath) {
      const res = await ensureDefaultModelDownloaded()
      return { modelPath: res.path }
    }

    if (!fs.existsSync(modelPath)) {
      throw createIpcError('MODEL_NOT_READY', 'Configured modelPath does not exist', { modelPath })
    }

    setState({ status: 'downloaded', modelPath, progress: undefined, error: undefined })
    return { modelPath }
  })

  handleInvoke('judge:l2:prompt', async (_evt, payload) => {
    const prompt = coerceString(payload?.prompt)
    if (!prompt) throw createIpcError('INVALID_ARGUMENT', 'Prompt is required')

    const timeoutMs = coerceNumber(payload?.timeoutMs)
    const temperature = coerceNumber(payload?.temperature)
    const maxTokens = coerceNumber(payload?.maxTokens)
    const explicitModelPath = coerceString(payload?.modelPath)
    const modelPath = explicitModelPath || getConfiguredModelPath(config, app)
    const defaultPath = getDefaultModelPath(app)

    if (modelPath === defaultPath && !fs.existsSync(modelPath)) {
      ensureDefaultModelDownloaded().catch(() => undefined)
      throw createIpcError('MODEL_NOT_READY', 'Model is downloading', { state })
    }

    if (!fs.existsSync(modelPath)) {
      throw createIpcError('MODEL_NOT_READY', 'Model file not found', { modelPath })
    }

    const result = await runJsonPrompt({
      prompt,
      modelPath,
      timeoutMs: timeoutMs ?? undefined,
      temperature: temperature ?? undefined,
      maxTokens: maxTokens ?? undefined,
    })

    return { output: result.output, durationMs: result.durationMs, modelPath }
  })

  handleInvoke('constraints:get', async () => {
    return { config: getConstraintsConfig() }
  })

  handleInvoke('constraints:set', async (_evt, payload) => {
    const next = payload?.config
    const saved = setConstraintsConfig(next)
    return { saved: true, config: saved }
  })

  return {
    startBackgroundModelDownload: () => ensureDefaultModelDownloaded().catch(() => undefined),
  }
}

module.exports = { registerJudgeIpcHandlers }
