const path = require('path')
const fs = require('fs/promises')
const { app } = require('electron')

function getDocumentsDir() {
  return path.join(app.getPath('userData'), 'documents')
}

async function ensureDocumentsDir() {
  await fs.mkdir(getDocumentsDir(), { recursive: true })
}

function countWords(content) {
  if (!content) return 0
  return String(content).replace(/\s+/g, '').length
}

function resolveDocumentFilePath(relativePath) {
  if (typeof relativePath !== 'string') throw new Error('Invalid path')
  const trimmed = relativePath.trim()
  if (!trimmed) throw new Error('Invalid path')

  const normalized = path.normalize(trimmed).replace(/^([/\\])+/, '')
  const base = path.basename(normalized)
  if (normalized !== base) throw new Error('Invalid path')
  if (base === '.' || base === '..') throw new Error('Invalid path')
  if (!base.toLowerCase().endsWith('.md')) throw new Error('Only .md files are supported')

  const documentsDir = getDocumentsDir()
  const fullPath = path.resolve(path.join(documentsDir, base))
  const documentsResolved = path.resolve(documentsDir)
  if (fullPath !== documentsResolved && !fullPath.startsWith(documentsResolved + path.sep)) {
    throw new Error('Invalid path')
  }

  return { name: base, fullPath }
}

function sanitizeFileName(name) {
  const raw = typeof name === 'string' ? name : ''
  let base = raw.trim()
  if (!base) base = '未命名'
  base = path.basename(base)
  base = base.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
  base = base.replace(/\s+/g, ' ').trim()
  if (!base.toLowerCase().endsWith('.md')) base += '.md'
  return base
}

async function findAvailableFileName(fileName) {
  const ext = path.extname(fileName)
  const stem = path.basename(fileName, ext)

  let candidate = fileName
  for (let i = 1; i < 1000; i++) {
    const fullPath = path.join(getDocumentsDir(), candidate)
    try {
      await fs.access(fullPath)
      candidate = `${stem} (${i})${ext}`
    } catch {
      return candidate
    }
  }
  throw new Error('Unable to create file')
}

function getDefaultMarkdownContent(fileName) {
  const title = path.basename(fileName, path.extname(fileName))
  if (title === '欢迎使用') {
    return `# 欢迎使用 WriteNow

WriteNow 是一款本地优先的写作工具：文件保存在本机，可审计、可复现。

## 快速开始

- 点击左侧「+」新建文章
- 支持 Markdown 编辑，2 秒无操作自动保存

祝你写作愉快！
`
  }
  return `# ${title}\n\n`
}

function registerFileIpcHandlers(ipcMain, options = {}) {
  const log = typeof options.log === 'function' ? options.log : null

  ipcMain.handle('file:list', async () => {
    await ensureDocumentsDir()
    const dir = getDocumentsDir()
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const mdFiles = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))

    const items = await Promise.all(
      mdFiles.map(async (entry) => {
        const fullPath = path.join(dir, entry.name)
        const stat = await fs.stat(fullPath)
        const content = await fs.readFile(fullPath, 'utf8').catch(() => '')
        const createdAt = stat.birthtimeMs || stat.ctimeMs || stat.mtimeMs || Date.now()
        return {
          name: entry.name,
          path: entry.name,
          createdAt,
          wordCount: countWords(content),
        }
      })
    )

    items.sort((a, b) => b.createdAt - a.createdAt)
    return items
  })

  ipcMain.handle('file:read', async (_evt, payload) => {
    await ensureDocumentsDir()
    const { fullPath } = resolveDocumentFilePath(payload?.path)
    const content = await fs.readFile(fullPath, 'utf8')
    return { content }
  })

  ipcMain.handle('file:write', async (_evt, payload) => {
    await ensureDocumentsDir()
    const { fullPath } = resolveDocumentFilePath(payload?.path)
    const content = typeof payload?.content === 'string' ? payload.content : ''
    await fs.writeFile(fullPath, content, 'utf8')
    return { ok: true }
  })

  ipcMain.handle('file:create', async (_evt, payload) => {
    await ensureDocumentsDir()
    const safeName = sanitizeFileName(payload?.name)
    const fileName = await findAvailableFileName(safeName)
    const fullPath = path.join(getDocumentsDir(), fileName)
    const defaultContent = getDefaultMarkdownContent(fileName)

    await fs.writeFile(fullPath, defaultContent, { encoding: 'utf8', flag: 'wx' })
    log?.('[file:create] created:', fileName)
    return { name: fileName, path: fileName }
  })

  ipcMain.handle('file:delete', async (_evt, payload) => {
    await ensureDocumentsDir()
    const { fullPath, name } = resolveDocumentFilePath(payload?.path)
    await fs.unlink(fullPath)
    log?.('[file:delete] deleted:', name)
    return { ok: true }
  })
}

module.exports = { registerFileIpcHandlers }

