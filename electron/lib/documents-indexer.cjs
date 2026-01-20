const fs = require('fs/promises')
const path = require('path')

const { upsertArticle, deleteArticle } = require('./articles.cjs')

async function listMarkdownFiles(documentsDir) {
  const entries = await fs.readdir(documentsDir, { withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
    .map((e) => e.name)
}

async function syncDocumentsToDatabase(db, documentsDir, logger) {
  if (!db) throw new Error('syncDocumentsToDatabase requires db')
  if (typeof documentsDir !== 'string' || !documentsDir.trim()) {
    throw new Error('syncDocumentsToDatabase requires documentsDir')
  }

  const fileNames = await listMarkdownFiles(documentsDir).catch((err) => {
    logger?.error?.('indexer', 'failed to read documents dir', { message: err?.message })
    throw err
  })

  for (const name of fileNames) {
    const fullPath = path.join(documentsDir, name)
    const content = await fs.readFile(fullPath, 'utf8').catch((err) => {
      logger?.warn?.('indexer', 'failed to read document', { name, message: err?.message })
      return null
    })
    if (content === null) continue

    try {
      upsertArticle(db, { id: name, fileName: name, content })
    } catch (err) {
      logger?.error?.('indexer', 'failed to upsert article', { name, message: err?.message })
    }
  }

  const existingRows = db.prepare("SELECT id FROM articles WHERE id LIKE '%.md'").all()
  const existingIds = existingRows
    .map((row) => (row && typeof row.id === 'string' ? row.id : null))
    .filter(Boolean)

  const fileSet = new Set(fileNames)
  for (const id of existingIds) {
    if (fileSet.has(id)) continue
    try {
      deleteArticle(db, id)
    } catch (err) {
      logger?.warn?.('indexer', 'failed to delete stale article', { id, message: err?.message })
    }
  }

  logger?.info?.('indexer', 'documents synced', { count: fileNames.length })
  return { count: fileNames.length }
}

module.exports = { syncDocumentsToDatabase }

