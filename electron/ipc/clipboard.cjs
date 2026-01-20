const { clipboard } = require('electron')

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function coerceString(value) {
  return typeof value === 'string' ? value : ''
}

function enforceMaxSize(value, maxBytes) {
  const bytes = Buffer.byteLength(value, 'utf8')
  if (bytes <= maxBytes) return
  throw createIpcError('INVALID_ARGUMENT', 'Clipboard payload too large', { bytes, maxBytes })
}

function registerClipboardIpcHandlers(ipcMain, options = {}) {
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  handleInvoke('clipboard:writeText', async (_evt, payload) => {
    const text = coerceString(payload?.text)
    enforceMaxSize(text, 2 * 1024 * 1024)
    clipboard.writeText(text)
    return { written: true }
  })

  handleInvoke('clipboard:writeHtml', async (_evt, payload) => {
    const html = coerceString(payload?.html)
    const text = typeof payload?.text === 'string' ? payload.text : undefined
    enforceMaxSize(html, 2 * 1024 * 1024)
    clipboard.write({ html, text })
    return { written: true }
  })
}

module.exports = { registerClipboardIpcHandlers }

