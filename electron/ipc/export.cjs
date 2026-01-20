const fs = require('fs/promises')
const path = require('path')

const { BrowserWindow, app, dialog } = require('electron')
const MarkdownIt = require('markdown-it')

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function isE2E() {
  return process.env.WN_E2E === '1'
}

function shouldShowDialogs() {
  return !isE2E()
}

function coerceString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function sanitizeBaseName(name) {
  const raw = coerceString(name)
  let base = raw || '未命名'
  base = base.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
  base = base.replace(/\s+/g, ' ').trim()
  return base || '未命名'
}

function withExtension(baseName, ext) {
  const safeExt = coerceString(ext).replace(/^\./, '')
  if (!safeExt) return baseName
  if (baseName.toLowerCase().endsWith(`.${safeExt.toLowerCase()}`)) return baseName
  return `${baseName}.${safeExt}`
}

function getDefaultExportDir() {
  return path.join(app.getPath('userData'), 'exports')
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

function getParentWindow(evt) {
  try {
    return BrowserWindow.fromWebContents(evt.sender)
  } catch {
    return null
  }
}

function createMarkdownRenderer() {
  return new MarkdownIt({
    html: false,
    linkify: true,
    breaks: false,
    typographer: true,
  })
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderMarkdownToHtml({ title, content }) {
  const md = createMarkdownRenderer()
  const body = md.render(content)
  const safeTitle = escapeHtml(title)

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      :root { color-scheme: light; }
      html, body { margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; line-height: 1.65; color: #0b0d10; background: #ffffff; }
      main { padding: 48px 56px; max-width: 860px; margin: 0 auto; }
      h1, h2, h3, h4 { line-height: 1.25; margin: 1.2em 0 0.6em; }
      p { margin: 0.6em 0; }
      pre { background: #f6f8fa; padding: 12px 14px; border-radius: 8px; overflow: auto; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 0.95em; }
      blockquote { margin: 1em 0; padding: 0.2em 1em; border-left: 3px solid #d0d7de; color: #57606a; }
      a { color: #0969da; text-decoration: none; }
      a:hover { text-decoration: underline; }
      ul, ol { padding-left: 1.4em; }
      li { margin: 0.25em 0; }
      hr { border: none; border-top: 1px solid #d0d7de; margin: 1.5em 0; }
    </style>
  </head>
  <body>
    <main>
      ${body}
    </main>
  </body>
</html>`
}

async function writeExportFile(filePath, data) {
  try {
    await fs.writeFile(filePath, data)
  } catch (err) {
    const code = err && typeof err === 'object' ? err.code : null
    throw createIpcError('IO_ERROR', 'Failed to write export file', { path: filePath, cause: code || 'unknown' })
  }
}

async function pickSavePath({ evt, title, extension, filters }) {
  const baseName = sanitizeBaseName(title)
  const fileName = withExtension(baseName, extension)

  if (!shouldShowDialogs()) {
    const dir = getDefaultExportDir()
    await ensureDir(dir)
    return path.join(dir, fileName)
  }

  const win = getParentWindow(evt)
  const result = await dialog.showSaveDialog(win || undefined, {
    title: '导出',
    defaultPath: fileName,
    filters,
    properties: ['createDirectory', 'showOverwriteConfirmation'],
  })

  if (result.canceled || !result.filePath) {
    throw createIpcError('CANCELED', 'Canceled')
  }

  return result.filePath
}

async function exportMarkdown(evt, payload, logger) {
  const title = coerceString(payload?.title)
  const content = typeof payload?.content === 'string' ? payload.content : null
  if (!title) throw createIpcError('INVALID_ARGUMENT', 'Invalid title', { title: payload?.title })
  if (content === null) throw createIpcError('INVALID_ARGUMENT', 'Invalid content', { contentType: typeof payload?.content })

  const filePath = await pickSavePath({
    evt,
    title,
    extension: 'md',
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  })

  await writeExportFile(filePath, content)
  logger?.info?.('export', 'export markdown', { path: filePath })
  return { path: filePath }
}

async function exportDocx(evt, payload, logger) {
  const title = coerceString(payload?.title)
  const content = typeof payload?.content === 'string' ? payload.content : null
  if (!title) throw createIpcError('INVALID_ARGUMENT', 'Invalid title', { title: payload?.title })
  if (content === null) throw createIpcError('INVALID_ARGUMENT', 'Invalid content', { contentType: typeof payload?.content })

  const filePath = await pickSavePath({
    evt,
    title,
    extension: 'docx',
    filters: [{ name: 'Word', extensions: ['docx'] }],
  })

  const html = renderMarkdownToHtml({ title, content })
  const { default: htmlToDocx } = await import('html-to-docx')
  const buffer = await htmlToDocx(html)
  await writeExportFile(filePath, Buffer.from(buffer))
  logger?.info?.('export', 'export docx', { path: filePath })
  return { path: filePath }
}

async function exportPdf(evt, payload, logger) {
  const title = coerceString(payload?.title)
  const content = typeof payload?.content === 'string' ? payload.content : null
  if (!title) throw createIpcError('INVALID_ARGUMENT', 'Invalid title', { title: payload?.title })
  if (content === null) throw createIpcError('INVALID_ARGUMENT', 'Invalid content', { contentType: typeof payload?.content })

  const filePath = await pickSavePath({
    evt,
    title,
    extension: 'pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })

  const html = renderMarkdownToHtml({ title, content })
  const url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`

  const win = new BrowserWindow({
    width: 900,
    height: 1100,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  try {
    await win.loadURL(url)
    const pdf = await win.webContents.printToPDF({ printBackground: true })
    await writeExportFile(filePath, pdf)
    logger?.info?.('export', 'export pdf', { path: filePath })
    return { path: filePath }
  } finally {
    try {
      win.destroy()
    } catch {
      // ignore
    }
  }
}

function registerExportIpcHandlers(ipcMain, options = {}) {
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)
  const logger = options.logger ?? null

  handleInvoke('export:markdown', async (evt, payload) => exportMarkdown(evt, payload, logger))
  handleInvoke('export:docx', async (evt, payload) => exportDocx(evt, payload, logger))
  handleInvoke('export:pdf', async (evt, payload) => exportPdf(evt, payload, logger))
}

module.exports = { registerExportIpcHandlers }
