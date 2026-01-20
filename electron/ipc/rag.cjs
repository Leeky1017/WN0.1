const { retrieveRagContext } = require('../lib/rag/retrieval.cjs')

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function registerRagIpcHandlers(ipcMain, options = {}) {
  const db = options.db ?? null
  const logger = options.logger ?? null
  const embeddingService = options.embeddingService ?? null
  const vectorStore = options.vectorStore ?? null
  const ragIndexer = options.ragIndexer ?? null
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  handleInvoke('rag:retrieve', async (_evt, payload) => {
    const queryText = typeof payload?.queryText === 'string' ? payload.queryText : ''
    if (!queryText.trim()) throw createIpcError('INVALID_ARGUMENT', 'queryText is required')

    if (process.env.WN_E2E === '1') {
      try {
        await ragIndexer?.flush?.()
      } catch (e) {
        logger?.warn?.('rag', 'flush skipped', { message: e?.message })
      }
    }

    return retrieveRagContext({
      db,
      logger,
      embeddingService,
      vectorStore,
      queryText,
      budget: payload?.budget,
    })
  })
}

module.exports = { registerRagIpcHandlers }
