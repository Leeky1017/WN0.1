const { parentPort } = require('worker_threads')
const fs = require('fs/promises')
const http = require('http')
const https = require('https')
const path = require('path')
const { URL } = require('url')

const TEXT2VEC_MODEL_ID = 'shibing624/text2vec-base-chinese'

let extractor = null
let extractorModel = null
let extractorCacheDir = null
let transformerEnv = null
let transformerPipeline = null

class SimpleHeaders {
  #map

  constructor(raw = {}) {
    this.#map = new Map()
    for (const [key, value] of Object.entries(raw)) {
      const lower = String(key).toLowerCase()
      if (Array.isArray(value)) this.#map.set(lower, value.map((v) => String(v)).join(', '))
      else if (typeof value === 'string') this.#map.set(lower, value)
      else if (typeof value === 'number') this.#map.set(lower, String(value))
    }
  }

  get(name) {
    if (!name) return null
    return this.#map.get(String(name).toLowerCase()) ?? null
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldRetryRequest(error) {
  const code = error && typeof error === 'object' ? String(error.code || '') : ''
  return code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'EAI_AGAIN'
}

async function fetchOnce(urlString, init = {}, redirectsLeft = 8) {
  const parsed = new URL(urlString)
  const lib = parsed.protocol === 'https:' ? https : http
  const method = typeof init.method === 'string' ? init.method.toUpperCase() : 'GET'
  const timeoutMs = typeof init.timeoutMs === 'number' ? init.timeoutMs : 300_000
  const headers = init.headers && typeof init.headers === 'object' ? { ...init.headers } : {}
  if (!headers['user-agent'] && !headers['User-Agent']) headers['user-agent'] = 'WriteNow-EmbeddingWorker'

  return new Promise((resolve, reject) => {
    const req = lib.request(
      parsed,
      {
        method,
        headers,
      },
      (res) => {
        const status = typeof res.statusCode === 'number' ? res.statusCode : 0
        const location = typeof res.headers?.location === 'string' ? res.headers.location : ''
        if ([301, 302, 303, 307, 308].includes(status) && location && redirectsLeft > 0) {
          res.resume()
          const nextUrl = new URL(location, parsed).toString()
          fetchOnce(nextUrl, { ...init, method: status === 303 ? 'GET' : method }, redirectsLeft - 1)
            .then(resolve)
            .catch(reject)
          return
        }

        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          const buffer = Buffer.concat(chunks)
          resolve({
            status,
            ok: status >= 200 && status < 300,
            headers: new SimpleHeaders(res.headers),
            arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
            text: async () => buffer.toString('utf8'),
            json: async () => JSON.parse(buffer.toString('utf8')),
          })
        })
      }
    )

    req.setTimeout(timeoutMs, () => {
      req.destroy(Object.assign(new Error('Request timed out'), { code: 'ETIMEDOUT' }))
    })

    req.on('error', reject)

    if (typeof init.body === 'string' || Buffer.isBuffer(init.body)) req.write(init.body)
    req.end()
  })
}

async function nodeFetch(input, init = {}) {
  const retries = typeof init.retries === 'number' ? Math.max(0, Math.min(5, init.retries)) : 2
  const urlString = input && typeof input === 'object' && typeof input.url === 'string' ? input.url : String(input)
  let lastError = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetchOnce(urlString, init, 8)
    } catch (error) {
      lastError = error
      if (!shouldRetryRequest(error) || attempt === retries) throw error
      await sleep(500 * (attempt + 1))
    }
  }

  throw lastError ?? new Error('fetch failed')
}

global.fetch = nodeFetch

async function loadTransformers() {
  if (transformerEnv && transformerPipeline) return { env: transformerEnv, pipeline: transformerPipeline }

  const mod = await import('@xenova/transformers')
  transformerEnv = mod.env
  transformerPipeline = mod.pipeline
  return { env: transformerEnv, pipeline: transformerPipeline }
}

function toError(code, message, details) {
  return { ipcError: { code, message, details } }
}

function getRemoteHost() {
  const override = typeof process.env.WN_HF_REMOTE_HOST === 'string' ? process.env.WN_HF_REMOTE_HOST.trim() : ''
  if (override) return override.endsWith('/') ? override : `${override}/`
  return 'https://huggingface.co/'
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function downloadTo(url, outPath) {
  const response = await fetch(url, { timeoutMs: 600_000, retries: 3 })
  if (!response.ok) {
    throw new Error(`download failed: ${response.status} ${url}`)
  }
  const buf = Buffer.from(await response.arrayBuffer())
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, buf)
}

async function ensureText2VecAssets(model, cacheDir, allowRemote) {
  const baseDir = path.join(cacheDir, model)
  const remoteHost = getRemoteHost()
  const baseUrl = `${remoteHost}${model}/resolve/main/`
  const required = [
    { url: `${baseUrl}config.json`, out: path.join(baseDir, 'config.json') },
    // Prefer ONNX-exported tokenizer_config.json because sentence-transformers repos may omit `model_max_length` at root.
    { url: `${baseUrl}onnx/tokenizer_config.json`, out: path.join(baseDir, 'tokenizer_config.json') },
    // The upstream repo stores `tokenizer.json` under `onnx/` (sentence-transformers layout).
    // transformers.js requires `tokenizer.json` at the root of the model directory.
    { url: `${baseUrl}onnx/tokenizer.json`, out: path.join(baseDir, 'tokenizer.json') },
    { url: `${baseUrl}onnx/special_tokens_map.json`, out: path.join(baseDir, 'special_tokens_map.json') },
    { url: `${baseUrl}onnx/vocab.txt`, out: path.join(baseDir, 'vocab.txt') },
    // Quantized ONNX model (smaller, compatible with ORT CPU execution provider).
    { url: `${baseUrl}onnx/model_qint8_avx512_vnni.onnx`, out: path.join(baseDir, 'onnx', 'model_qint8_avx512_vnni.onnx') },
  ]

  for (const file of required) {
    const exists = await fileExists(file.out)
    if (exists) {
      if (file.out.endsWith(`${path.sep}tokenizer_config.json`)) {
        const raw = await fs.readFile(file.out, 'utf8').catch(() => null)
        if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw)
            if (typeof parsed?.model_max_length === 'number') continue
          } catch {
            // fall through
          }
        }
      } else {
        continue
      }
    }
    if (!allowRemote) {
      throw toError('MODEL_NOT_READY', 'Embedding model assets are missing', {
        model,
        missing: path.relative(cacheDir, file.out),
        cacheDir,
        recovery: 'Enable downloads (WN_EMBEDDING_ALLOW_REMOTE=1) to initialize the model, then retry offline.',
      })
    }
    try {
      await downloadTo(file.url, file.out)
    } catch (error) {
      const hfPrimary = 'https://huggingface.co/'
      const hfMirror = 'https://hf-mirror.com/'
      if (remoteHost === hfPrimary) {
        const mirrorUrl = file.url.replace(hfPrimary, hfMirror)
        await downloadTo(mirrorUrl, file.out)
      } else {
        throw error
      }
    }
  }
}

async function getExtractor(model, cacheDir, allowRemote) {
  if (extractor && extractorModel === model && extractorCacheDir === cacheDir) return extractor

  const { env, pipeline } = await loadTransformers()

  if (env && typeof env === 'object') {
    try {
      env.cacheDir = cacheDir
      env.localModelPath = cacheDir
      env.allowRemoteModels = Boolean(allowRemote)
      env.allowLocalModels = true
      env.remoteHost = getRemoteHost()
    } catch {
      // ignore
    }
  }

  let next = null
  if (model === TEXT2VEC_MODEL_ID) {
    await ensureText2VecAssets(model, cacheDir, allowRemote)
    next = await pipeline('feature-extraction', model, {
      quantized: false,
      cache_dir: cacheDir,
      local_files_only: !allowRemote,
      model_file_name: 'model_qint8_avx512_vnni',
    })
  } else {
    try {
      next = await pipeline('feature-extraction', model, {
        quantized: true,
        cache_dir: cacheDir,
        local_files_only: !allowRemote,
      })
    } catch {
      next = await pipeline('feature-extraction', model, {
        cache_dir: cacheDir,
        local_files_only: !allowRemote,
      })
    }
  }

  extractor = next
  extractorModel = model
  extractorCacheDir = cacheDir
  return extractor
}

async function encode(payload) {
  const model = payload?.model
  const cacheDir = payload?.cacheDir
  const allowRemote = payload?.allowRemote
  const texts = payload?.texts

  if (!Array.isArray(texts) || texts.length === 0) {
    throw toError('INVALID_ARGUMENT', 'texts must be a non-empty array')
  }
  for (const text of texts) {
    if (typeof text !== 'string') throw toError('INVALID_ARGUMENT', 'texts must be string[]')
  }
  if (typeof model !== 'string' || typeof cacheDir !== 'string') {
    throw toError('INVALID_ARGUMENT', 'model/cacheDir is required')
  }

  let output = null
  try {
    const fn = await getExtractor(model, cacheDir, allowRemote)
    output = await fn(texts, { pooling: 'mean', normalize: true })
  } catch (error) {
    const ipcError = error?.ipcError
    if (ipcError && typeof ipcError.code === 'string' && typeof ipcError.message === 'string') throw error
    throw toError('MODEL_NOT_READY', 'Embedding model is not ready', {
      model,
      cacheDir,
      allowRemote: Boolean(allowRemote),
      message: error?.message,
      recovery: allowRemote
        ? 'Ensure network access is available to download the model, or prewarm the cache and retry offline.'
        : 'Enable downloads (WN_EMBEDDING_ALLOW_REMOTE=1) to initialize the model, then retry offline.',
    })
  }

  const data = output?.data
  const dims = Array.isArray(output?.dims) ? output.dims : null

  if (!data || typeof data.length !== 'number') throw new Error('Unexpected embedding output')

  const dimension = dims && dims.length >= 2 ? dims[dims.length - 1] : null
  const inferredDim = typeof dimension === 'number' && dimension > 0 ? dimension : Math.floor(data.length / texts.length)
  if (!inferredDim || inferredDim <= 0) throw new Error('Unable to infer embedding dimension')

  const vectors = []
  for (let i = 0; i < texts.length; i += 1) {
    const start = i * inferredDim
    const end = start + inferredDim
    const slice = data.slice(start, end)
    vectors.push(Array.from(slice))
  }

  return { model, dimension: inferredDim, vectors }
}

parentPort?.on('message', async (message) => {
  const id = message?.id
  const type = message?.type
  if (typeof id !== 'number' || typeof type !== 'string') return

  try {
    if (type === 'encode') {
      const data = await encode(message.payload)
      parentPort?.postMessage({ id, ok: true, data })
      return
    }
    parentPort?.postMessage({ id, ok: false, error: toError('INVALID_ARGUMENT', 'Unknown request type', { type }) })
  } catch (error) {
    const ipcError = error?.ipcError
    if (ipcError && typeof ipcError.code === 'string' && typeof ipcError.message === 'string') {
      parentPort?.postMessage({ id, ok: false, error })
      return
    }
    parentPort?.postMessage({ id, ok: false, error: toError('INTERNAL', 'Embedding worker failed', { message: error?.message }) })
  }
})
