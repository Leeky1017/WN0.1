const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const { Readable } = require('stream')
const { finished } = require('stream/promises')
const crypto = require('crypto')

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function nowMs() {
  return Date.now()
}

function isValidSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value.trim())
}

async function safeStat(filePath) {
  try {
    return await fsp.stat(filePath)
  } catch {
    return null
  }
}

function toProgress({ transferred, total, startedAtMs, lastBytesPerSecond }) {
  const elapsedMs = Math.max(1, nowMs() - startedAtMs)
  const bytesPerSecond = Math.max(lastBytesPerSecond ?? 0, Math.round((transferred * 1000) / elapsedMs))
  const percent = total > 0 ? (transferred / total) * 100 : 0
  return { percent, transferred, total, bytesPerSecond }
}

function parseContentRange(rangeHeader) {
  if (typeof rangeHeader !== 'string') return null
  const match = rangeHeader.match(/^bytes\s+(\d+)-(\d+)\/(\d+|\*)$/i)
  if (!match) return null
  const start = Number(match[1])
  const end = Number(match[2])
  const total = match[3] === '*' ? null : Number(match[3])
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  if (total !== null && !Number.isFinite(total)) return null
  return { start, end, total }
}

async function computeSha256(filePath) {
  const hash = crypto.createHash('sha256')
  const stream = fs.createReadStream(filePath)
  stream.on('data', (chunk) => hash.update(chunk))
  await finished(stream)
  return hash.digest('hex')
}

async function getRemoteSize(url, signal) {
  const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal })
  if (res.ok) {
    const raw = res.headers.get('content-length')
    if (raw) {
      const total = Number(raw)
      return Number.isFinite(total) && total > 0 ? total : null
    }
  }

  const fallback = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: { Range: 'bytes=0-0' },
    signal,
  })
  const range = parseContentRange(fallback.headers.get('content-range'))
  if (range?.total) return range.total
  const raw = fallback.headers.get('content-length')
  if (raw) {
    const total = Number(raw)
    return Number.isFinite(total) && total > 0 ? total : null
  }
  return null
}

async function downloadWithResume({
  url,
  partialPath,
  totalBytes,
  onProgress,
  signal,
}) {
  const existing = await safeStat(partialPath)
  const existingBytes = existing ? existing.size : 0

  const res = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: existingBytes > 0 ? { Range: `bytes=${existingBytes}-` } : undefined,
    signal,
  })

  if (!res.ok) {
    throw createIpcError('UPSTREAM_ERROR', 'Failed to download model', { status: res.status })
  }

  const isPartial = res.status === 206
  if (existingBytes > 0 && !isPartial) {
    try {
      await fsp.truncate(partialPath, 0)
    } catch {
      // ignore
    }
  }

  const contentRange = parseContentRange(res.headers.get('content-range'))
  const remoteTotal = contentRange?.total ?? null
  const contentLengthRaw = res.headers.get('content-length')
  const contentLength = contentLengthRaw ? Number(contentLengthRaw) : null
  const expectedTotal = remoteTotal ?? totalBytes ?? (contentLength ? (isPartial ? existingBytes + contentLength : contentLength) : null)

  if (!res.body) {
    throw createIpcError('UPSTREAM_ERROR', 'Download response has no body')
  }

  const writeStream = fs.createWriteStream(partialPath, { flags: existingBytes > 0 && isPartial ? 'a' : 'w' })
  const startedAtMs = nowMs()
  let transferred = existingBytes > 0 && isPartial ? existingBytes : 0
  let lastBytesPerSecond = 0

  const nodeStream = Readable.fromWeb(res.body)
  nodeStream.on('data', (chunk) => {
    transferred += chunk.length
    if (typeof expectedTotal === 'number') {
      const progress = toProgress({ transferred, total: expectedTotal, startedAtMs, lastBytesPerSecond })
      lastBytesPerSecond = progress.bytesPerSecond
      onProgress?.(progress)
    } else {
      onProgress?.({ percent: 0, transferred, total: 0, bytesPerSecond: 0 })
    }
  })

  try {
    nodeStream.pipe(writeStream)
    await finished(writeStream)
  } catch (error) {
    try {
      writeStream.destroy()
    } catch {
      // ignore
    }
    if (signal?.aborted) throw createIpcError('CANCELED', 'Download canceled')
    throw error
  }

  return { transferred, total: expectedTotal }
}

async function validateModelFile({ filePath, expectedBytes, expectedSha256 }) {
  const stat = await safeStat(filePath)
  if (!stat || stat.size <= 0) return { ok: false, reason: 'empty' }
  if (typeof expectedBytes === 'number' && expectedBytes > 0 && stat.size !== expectedBytes) {
    return { ok: false, reason: 'size_mismatch', size: stat.size, expectedBytes }
  }
  if (isValidSha256(expectedSha256)) {
    const actual = await computeSha256(filePath)
    if (actual.toLowerCase() !== expectedSha256.toLowerCase()) {
      return { ok: false, reason: 'sha256_mismatch', sha256: actual, expectedSha256 }
    }
  }
  return { ok: true }
}

function createModelDownloader(options = {}) {
  const logger = options.logger ?? null
  const modelDir = typeof options.modelDir === 'string' && options.modelDir.trim() ? options.modelDir.trim() : null
  if (!modelDir) throw new Error('createModelDownloader requires { modelDir }')

  async function ensureModel(model, runtimeOptions = {}) {
    if (!model || typeof model !== 'object') {
      throw createIpcError('INVALID_ARGUMENT', 'Invalid model config')
    }

    const url = typeof model.url === 'string' ? model.url.trim() : ''
    const filename = typeof model.filename === 'string' ? model.filename.trim() : ''
    if (!url || !filename) throw createIpcError('INVALID_ARGUMENT', 'Invalid model config', { url, filename })

    await fsp.mkdir(modelDir, { recursive: true })

    const targetPath = path.join(modelDir, filename)
    const partialPath = `${targetPath}.part`

    const remoteSize = await getRemoteSize(url, runtimeOptions.signal).catch(() => null)
    const existing = await validateModelFile({
      filePath: targetPath,
      expectedBytes: remoteSize ?? undefined,
      expectedSha256: model.sha256,
    })
    if (existing.ok) return { ready: true, path: targetPath }

    const downloadResult = await downloadWithResume({
      url,
      partialPath,
      totalBytes: remoteSize ?? undefined,
      onProgress: runtimeOptions.onProgress,
      signal: runtimeOptions.signal,
    })

    const finalSize = downloadResult.total ?? remoteSize ?? undefined
    const validated = await validateModelFile({
      filePath: partialPath,
      expectedBytes: finalSize,
      expectedSha256: model.sha256,
    })

    if (!validated.ok) {
      logger?.error?.('model-downloader', 'validate failed', { reason: validated.reason, details: validated })
      try {
        await fsp.unlink(partialPath)
      } catch {
        // ignore
      }
      throw createIpcError('IO_ERROR', 'Model validation failed', validated)
    }

    await fsp.rename(partialPath, targetPath)
    return { ready: true, path: targetPath }
  }

  return { ensureModel }
}

module.exports = { createModelDownloader }
