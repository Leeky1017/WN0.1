const fs = require('fs')

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function nowMs() {
  return Date.now()
}

let llamaModulePromise = null
async function loadLlamaModule() {
  if (llamaModulePromise) return llamaModulePromise
  llamaModulePromise = import('node-llama-cpp')
  return llamaModulePromise
}

let llamaInstancePromise = null
async function getLlamaInstance() {
  if (llamaInstancePromise) return llamaInstancePromise
  llamaInstancePromise = loadLlamaModule().then((mod) => mod.getLlama())
  return llamaInstancePromise
}

let cached = {
  modelPath: null,
  model: null,
  grammarJson: null,
}

async function ensureModelLoaded(modelPath) {
  if (cached.model && cached.modelPath === modelPath) return cached.model

  if (typeof modelPath !== 'string' || !modelPath.trim()) {
    throw createIpcError('INVALID_ARGUMENT', 'Invalid modelPath', { modelPath })
  }
  if (!fs.existsSync(modelPath)) {
    throw createIpcError('MODEL_NOT_READY', 'Model file not found', { modelPath })
  }

  const llama = await getLlamaInstance()
  const model = await llama.loadModel({ modelPath })
  const grammarJson = await llama.getGrammarFor('json')

  cached = { modelPath, model, grammarJson }
  return model
}

async function runJsonPrompt(options = {}) {
  const prompt = typeof options.prompt === 'string' ? options.prompt : ''
  if (!prompt.trim()) throw createIpcError('INVALID_ARGUMENT', 'Prompt is required')

  const modelPath = typeof options.modelPath === 'string' ? options.modelPath.trim() : ''
  if (!modelPath) throw createIpcError('INVALID_ARGUMENT', 'modelPath is required')

  const timeoutMsRaw = typeof options.timeoutMs === 'number' ? options.timeoutMs : null
  const timeoutMs = timeoutMsRaw && Number.isFinite(timeoutMsRaw) && timeoutMsRaw > 0 ? Math.floor(timeoutMsRaw) : 3000

  const temperatureRaw = typeof options.temperature === 'number' ? options.temperature : null
  const temperature =
    temperatureRaw !== null && Number.isFinite(temperatureRaw) && temperatureRaw >= 0 ? Math.min(2, Math.max(0, temperatureRaw)) : 0.2

  const maxTokensRaw = typeof options.maxTokens === 'number' ? options.maxTokens : null
  const maxTokens = maxTokensRaw && Number.isFinite(maxTokensRaw) && maxTokensRaw > 0 ? Math.floor(maxTokensRaw) : 256

  const startedAt = nowMs()
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), timeoutMs)

  try {
    const model = await ensureModelLoaded(modelPath)
    const mod = await loadLlamaModule()
    const context = await model.createContext()
    const session = new mod.LlamaChatSession({ contextSequence: context.getSequence() })

    const output = await session.prompt(prompt, {
      grammar: cached.grammarJson,
      maxTokens,
      temperature,
      stopOnAbortSignal: true,
      signal: abortController.signal,
    })

    return { output: String(output ?? ''), durationMs: nowMs() - startedAt }
  } catch (err) {
    if (abortController.signal.aborted) {
      throw createIpcError('TIMEOUT', 'L2 inference timed out', { timeoutMs })
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = { runJsonPrompt }

