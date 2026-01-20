const fs = require('fs')
const path = require('path')

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024
const DEFAULT_MAX_FILES = 5

function safeJson(details) {
  if (typeof details === 'undefined') return null
  if (details === null) return 'null'
  try {
    return JSON.stringify(details)
  } catch {
    return '"[unserializable]"'
  }
}

function formatLine(level, moduleName, message, details) {
  const iso = new Date().toISOString()
  const upper = String(level).toUpperCase()
  const json = safeJson(details)
  return `[${iso}] [${upper}] [${moduleName}] ${message}${json ? ` ${json}` : ''}\n`
}

function rotateFiles(logFilePath, maxFiles) {
  const oldest = `${logFilePath}.${maxFiles}`
  try {
    if (fs.existsSync(oldest)) fs.unlinkSync(oldest)
  } catch {
    // ignore
  }

  for (let i = maxFiles - 1; i >= 1; i -= 1) {
    const src = `${logFilePath}.${i}`
    const dst = `${logFilePath}.${i + 1}`
    try {
      if (fs.existsSync(src)) fs.renameSync(src, dst)
    } catch {
      // ignore
    }
  }

  try {
    if (fs.existsSync(logFilePath)) fs.renameSync(logFilePath, `${logFilePath}.1`)
  } catch {
    // ignore
  }
}

function createWriteStream(logFilePath) {
  return fs.createWriteStream(logFilePath, { flags: 'a' })
}

function getFileSize(logFilePath) {
  try {
    return fs.statSync(logFilePath).size
  } catch {
    return 0
  }
}

function createLogger(options = {}) {
  const logsDir = typeof options.logsDir === 'string' ? options.logsDir : process.cwd()
  const logFilePath = typeof options.logFilePath === 'string' ? options.logFilePath : path.join(logsDir, 'main.log')
  const maxBytes = typeof options.maxBytes === 'number' ? options.maxBytes : DEFAULT_MAX_BYTES
  const maxFiles = typeof options.maxFiles === 'number' ? options.maxFiles : DEFAULT_MAX_FILES
  const isDev = Boolean(options.isDev)

  fs.mkdirSync(path.dirname(logFilePath), { recursive: true })

  let stream = createWriteStream(logFilePath)
  let currentSize = getFileSize(logFilePath)

  function write(level, moduleName, message, details) {
    const line = formatLine(level, moduleName, message, details)

    if (isDev) {
      try {
        // eslint-disable-next-line no-console
        console.log(line.trimEnd())
      } catch {
        // ignore
      }
    }

    try {
      const bytes = Buffer.byteLength(line, 'utf8')
      if (currentSize + bytes > maxBytes) {
        try {
          stream.end()
        } catch {
          // ignore
        }
        rotateFiles(logFilePath, maxFiles)
        stream = createWriteStream(logFilePath)
        currentSize = 0
      }
      stream.write(line)
      currentSize += bytes
    } catch {
      // ignore
    }
  }

  return {
    debug: (moduleName, message, details) => write('debug', moduleName, message, details),
    info: (moduleName, message, details) => write('info', moduleName, message, details),
    warn: (moduleName, message, details) => write('warn', moduleName, message, details),
    error: (moduleName, message, details) => write('error', moduleName, message, details),
    flush: () =>
      new Promise((resolve) => {
        try {
          stream.write('', resolve)
        } catch {
          resolve()
        }
      }),
    close: () =>
      new Promise((resolve) => {
        try {
          stream.end(resolve)
        } catch {
          resolve()
        }
      }),
    getLogFilePath: () => logFilePath,
  }
}

module.exports = { createLogger }

