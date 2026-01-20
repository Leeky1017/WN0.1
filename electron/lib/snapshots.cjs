const path = require('path')
const fs = require('fs/promises')
const { app } = require('electron')

function getSnapshotsDir() {
  return path.join(app.getPath('userData'), 'snapshots')
}

async function ensureSnapshotsDir() {
  await fs.mkdir(getSnapshotsDir(), { recursive: true })
}

function sanitizeSnapshotPrefix(docName) {
  const raw = typeof docName === 'string' ? docName : ''
  let base = raw.trim()
  base = path.basename(base)
  base = base.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
  return base
}

function formatSnapshotTimestamp(ts) {
  return new Date(ts).toISOString().replace(/[:.]/g, '-')
}

function buildSnapshotFileName(docName, createdAt) {
  const safeDocName = sanitizeSnapshotPrefix(docName)
  const stamp = formatSnapshotTimestamp(createdAt)
  const rand = Math.random().toString(16).slice(2, 10)
  return `${safeDocName}__${stamp}__${rand}.json`
}

function isSnapshotFile(fileName) {
  return typeof fileName === 'string' && fileName.toLowerCase().endsWith('.json')
}

function buildSnapshotModel(fileName, payload) {
  const id = fileName
  const docPath = payload?.path
  const createdAt = payload?.createdAt
  const reason = payload?.reason
  const content = payload?.content

  if (typeof docPath !== 'string') return null
  if (typeof createdAt !== 'number') return null
  if (reason !== 'auto' && reason !== 'manual') return null
  if (typeof content !== 'string') return null

  return { id, path: docPath, createdAt, reason, content }
}

async function pruneSnapshotsForPrefix(prefix, maxKeep) {
  const dir = getSnapshotsDir()
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = entries
    .filter((e) => e.isFile() && isSnapshotFile(e.name) && e.name.startsWith(prefix))
    .map((e) => e.name)

  const items = await Promise.all(
    files.map(async (name) => {
      const stat = await fs.stat(path.join(dir, name))
      return { name, mtimeMs: stat.mtimeMs }
    })
  )

  items.sort((a, b) => b.mtimeMs - a.mtimeMs)
  const toDelete = items.slice(Math.max(0, maxKeep))
  await Promise.all(
    toDelete.map(async (item) => {
      try {
        await fs.unlink(path.join(dir, item.name))
      } catch {
        // ignore
      }
    })
  )
}

async function writeSnapshot({ docName, docPath, content, reason = 'auto', maxKeep = 50 }) {
  await ensureSnapshotsDir()

  const createdAt = Date.now()
  const fileName = buildSnapshotFileName(docName, createdAt)
  const dir = getSnapshotsDir()

  const payload = {
    version: 1,
    path: docPath,
    createdAt,
    reason,
    content,
  }

  await fs.writeFile(path.join(dir, fileName), JSON.stringify(payload), 'utf8')

  const prefix = `${sanitizeSnapshotPrefix(docName)}__`
  await pruneSnapshotsForPrefix(prefix, maxKeep)

  return { snapshotId: fileName }
}

async function readLatestSnapshot({ docName } = {}) {
  await ensureSnapshotsDir()
  const dir = getSnapshotsDir()
  const prefix = typeof docName === 'string' && docName.trim() ? `${sanitizeSnapshotPrefix(docName)}__` : null

  const entries = await fs.readdir(dir, { withFileTypes: true })
  const candidateNames = entries
    .filter((e) => e.isFile() && isSnapshotFile(e.name))
    .map((e) => e.name)
    .filter((name) => (prefix ? name.startsWith(prefix) : true))

  if (candidateNames.length === 0) return null

  const items = await Promise.all(
    candidateNames.map(async (name) => {
      const stat = await fs.stat(path.join(dir, name))
      return { name, mtimeMs: stat.mtimeMs }
    })
  )

  items.sort((a, b) => b.mtimeMs - a.mtimeMs)
  const latest = items[0]

  try {
    const raw = await fs.readFile(path.join(dir, latest.name), 'utf8')
    const parsed = JSON.parse(raw)
    return buildSnapshotModel(latest.name, parsed)
  } catch {
    return null
  }
}

module.exports = { writeSnapshot, readLatestSnapshot }

