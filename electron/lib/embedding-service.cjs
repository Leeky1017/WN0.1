const path = require('path')
const { Worker } = require('worker_threads')

const DEFAULT_MODEL = 'shibing624/text2vec-base-chinese'

function toIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function getModelCacheDir(userDataDir) {
  const override = typeof process.env.WN_MODEL_CACHE_DIR === 'string' ? process.env.WN_MODEL_CACHE_DIR.trim() : ''
  if (override) return override
  return path.join(userDataDir, 'models')
}

class EmbeddingService {
  #logger
  #userDataDir
  #worker
  #seq
  #pending

  constructor(options = {}) {
    this.#logger = options.logger ?? null
    this.#userDataDir = typeof options.userDataDir === 'string' ? options.userDataDir : null
    this.#worker = null
    this.#seq = 0
    this.#pending = new Map()
  }

  #ensureWorker() {
    if (this.#worker) return this.#worker
    if (!this.#userDataDir) throw new Error('EmbeddingService requires userDataDir')

    const workerPath = path.join(__dirname, 'embedding-worker.cjs')
    const worker = new Worker(workerPath)
    worker.on('message', (message) => this.#onMessage(message))
    worker.on('error', (error) => this.#onWorkerError(error))
    worker.on('exit', (code) => this.#onWorkerExit(code))
    this.#worker = worker
    return worker
  }

  #onMessage(message) {
    const id = message?.id
    if (typeof id !== 'number') return
    const pending = this.#pending.get(id)
    if (!pending) return
    this.#pending.delete(id)
    clearTimeout(pending.timeout)

    if (message?.ok) pending.resolve(message.data)
    else pending.reject(message.error ?? new Error('Embedding worker error'))
  }

  #onWorkerError(error) {
    this.#logger?.error?.('embedding', 'worker error', { message: error?.message })
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timeout)
      pending.reject(error)
    }
    this.#pending.clear()
    this.#worker = null
  }

  #onWorkerExit(code) {
    this.#logger?.warn?.('embedding', 'worker exited', { code })
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timeout)
      pending.reject(new Error('Embedding worker exited'))
    }
    this.#pending.clear()
    this.#worker = null
  }

  #request(type, payload) {
    const worker = this.#ensureWorker()
    const requestId = (this.#seq += 1)
    return new Promise((resolve, reject) => {
      const envTimeout = typeof process.env.WN_EMBEDDING_TIMEOUT_MS === 'string' ? process.env.WN_EMBEDDING_TIMEOUT_MS.trim() : ''
      const parsed = envTimeout ? Number.parseInt(envTimeout, 10) : NaN
      const timeoutMs = Number.isFinite(parsed) ? Math.max(10_000, Math.min(600_000, parsed)) : 120_000
      const timeout = setTimeout(() => {
        this.#pending.delete(requestId)
        reject(toIpcError('TIMEOUT', 'Embedding request timed out', { timeoutMs }))
      }, timeoutMs)
      this.#pending.set(requestId, { resolve, reject, timeout })
      worker.postMessage({ id: requestId, type, payload })
    })
  }

  async encode(texts, options = {}) {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw toIpcError('INVALID_ARGUMENT', 'texts must be a non-empty array')
    }
    if (texts.length > 64) throw toIpcError('INVALID_ARGUMENT', 'texts is too large', { max: 64 })
    for (const text of texts) {
      if (typeof text !== 'string') throw toIpcError('INVALID_ARGUMENT', 'texts must be string[]')
    }

    const requestedModel = typeof options.model === 'string' ? options.model : DEFAULT_MODEL
    if (requestedModel !== DEFAULT_MODEL) throw toIpcError('INVALID_ARGUMENT', 'Unsupported model', { model: requestedModel })

    const runtimeOverride =
      process.env.WN_E2E === '1' && typeof process.env.WN_E2E_EMBEDDING_MODEL_ID === 'string'
        ? process.env.WN_E2E_EMBEDDING_MODEL_ID.trim()
        : ''
    const model = runtimeOverride || requestedModel

    const allowRemote = options.allowRemote ?? (process.env.WN_EMBEDDING_ALLOW_REMOTE !== '0')
    const cacheDir = getModelCacheDir(this.#userDataDir)

    try {
      return await this.#request('encode', { texts, model, cacheDir, allowRemote })
    } catch (error) {
      if (error?.ipcError?.code) throw error
      this.#logger?.error?.('embedding', 'encode failed', { message: error?.message })
      throw toIpcError('MODEL_NOT_READY', 'Embedding model is not ready', {
        model,
        cacheDir,
        allowRemote,
        recovery: 'Ensure the model is available in cacheDir, or enable downloads and retry.',
      })
    }
  }

  async close() {
    const worker = this.#worker
    this.#worker = null
    if (!worker) return
    try {
      await worker.terminate()
    } catch {
      // ignore
    }
  }
}

module.exports = { EmbeddingService, DEFAULT_MODEL }
