const { DEFAULT_MODEL } = require('../lib/embedding-service.cjs')

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function resolveModel(model) {
  if (typeof model === 'undefined') return { id: DEFAULT_MODEL, name: 'text2vec-base-chinese' }
  if (model === 'text2vec-base-chinese') return { id: DEFAULT_MODEL, name: 'text2vec-base-chinese' }
  return null
}

function registerEmbeddingIpcHandlers(ipcMain, options = {}) {
  const embeddingService = options.embeddingService ?? null
  const vectorStore = options.vectorStore ?? null
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  handleInvoke('embedding:encode', async (_evt, payload) => {
    if (!embeddingService) throw createIpcError('MODEL_NOT_READY', 'Embedding service is not initialized')
    const texts = payload?.texts
    if (!Array.isArray(texts) || texts.length === 0) {
      throw createIpcError('INVALID_ARGUMENT', 'texts must be a non-empty array')
    }
    for (const text of texts) {
      if (typeof text !== 'string') throw createIpcError('INVALID_ARGUMENT', 'texts must be string[]')
    }

    const modelInfo = resolveModel(payload?.model)
    if (!modelInfo) throw createIpcError('INVALID_ARGUMENT', 'Unsupported model', { model: payload?.model })

    const result = await embeddingService.encode(texts, { model: modelInfo.id })
    return {
      model: modelInfo.name,
      dimension: result.dimension,
      vectors: result.vectors,
    }
  })

  handleInvoke('embedding:index', async (_evt, payload) => {
    if (!embeddingService) throw createIpcError('MODEL_NOT_READY', 'Embedding service is not initialized')
    if (!vectorStore) throw createIpcError('DB_ERROR', 'Vector store is not initialized')

    const namespace = payload?.namespace
    if (namespace !== 'articles') throw createIpcError('INVALID_ARGUMENT', 'Unsupported namespace', { namespace })

    const modelInfo = resolveModel(payload?.model)
    if (!modelInfo) throw createIpcError('INVALID_ARGUMENT', 'Unsupported model', { model: payload?.model })

    const items = payload?.items
    if (!Array.isArray(items) || items.length === 0) {
      throw createIpcError('INVALID_ARGUMENT', 'items must be a non-empty array')
    }

    const normalized = items.map((item) => ({
      id: typeof item?.id === 'string' ? item.id : '',
      text: typeof item?.text === 'string' ? item.text : '',
    }))
    for (const item of normalized) {
      if (!item.id) throw createIpcError('INVALID_ARGUMENT', 'item.id is required')
      if (!item.text) throw createIpcError('INVALID_ARGUMENT', 'item.text is required')
    }

    let dimension = null
    let indexedCount = 0

    const batchSize = 32
    for (let i = 0; i < normalized.length; i += batchSize) {
      const batch = normalized.slice(i, i + batchSize)
      const texts = batch.map((b) => b.text)
      const ids = batch.map((b) => b.id)

      const encoded = await embeddingService.encode(texts, { model: modelInfo.id })
      dimension = encoded.dimension
      vectorStore.ensureReady(dimension)

      vectorStore.upsertArticleEmbeddings(
        ids.map((id, idx) => ({
          id,
          embedding: encoded.vectors[idx],
        }))
      )

      indexedCount += batch.length
    }

    return {
      indexedCount,
      dimension: dimension ?? 0,
    }
  })
}

module.exports = { registerEmbeddingIpcHandlers }
