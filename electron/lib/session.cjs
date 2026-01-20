const path = require('path')
const fs = require('fs/promises')
const fsSync = require('fs')
const { app } = require('electron')

let sessionState = {
  initialized: false,
  uncleanExitDetected: false,
  startedAt: 0,
}

function getSessionLockPath() {
  return path.join(app.getPath('userData'), 'session.lock')
}

async function initSessionLock(options = {}) {
  const log = typeof options.log === 'function' ? options.log : null
  const lockPath = getSessionLockPath()

  const uncleanExitDetected = fsSync.existsSync(lockPath)
  const startedAt = Date.now()

  const payload = {
    pid: process.pid,
    startedAt,
  }

  await fs.writeFile(lockPath, JSON.stringify(payload), 'utf8')
  sessionState = { initialized: true, uncleanExitDetected, startedAt }

  log?.('[session] lock created', { uncleanExitDetected })
  return sessionState
}

async function clearSessionLock(options = {}) {
  const log = typeof options.log === 'function' ? options.log : null
  const lockPath = getSessionLockPath()
  try {
    await fs.unlink(lockPath)
    log?.('[session] lock removed')
  } catch {
    // ignore
  }
}

function getSessionStatus() {
  return { uncleanExitDetected: sessionState.uncleanExitDetected }
}

module.exports = { initSessionLock, clearSessionLock, getSessionStatus }

