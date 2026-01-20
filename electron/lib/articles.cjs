function toIsoNow() {
  return new Date().toISOString()
}

function countWords(content) {
  if (!content) return 0
  return String(content).replace(/\s+/g, '').length
}

function stripMarkdownTitle(raw) {
  const line = typeof raw === 'string' ? raw.trim() : ''
  if (!line) return null
  if (!line.startsWith('#')) return null
  const title = line.replace(/^#+\s*/, '').trim()
  return title || null
}

function extractFrontMatterLines(content) {
  const raw = typeof content === 'string' ? content : ''
  if (!raw.startsWith('---\n')) return null
  const endIndex = raw.indexOf('\n---', 4)
  if (endIndex === -1) return null
  const block = raw.slice(4, endIndex + 1)
  return block.split('\n')
}

function splitListValue(value) {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!trimmed) return []

  const normalized = trimmed.replace(/^\[/, '').replace(/\]$/, '')
  return normalized
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseFrontMatter(content) {
  const lines = extractFrontMatterLines(content)
  if (!lines) return { tags: [], characters: [], title: null }

  let currentListKey = null
  const tags = []
  const characters = []
  let title = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const listMatch = trimmed.match(/^-\s+(.+)$/)
    if (listMatch && currentListKey) {
      const value = listMatch[1].trim()
      if (!value) continue
      if (currentListKey === 'tags') tags.push(value)
      if (currentListKey === 'characters') characters.push(value)
      continue
    }

    currentListKey = null
    const keyMatch = trimmed.match(/^([a-zA-Z_]+)\s*:\s*(.*)$/)
    if (!keyMatch) continue

    const key = keyMatch[1]
    const rawValue = keyMatch[2]

    if (key === 'title') {
      title = rawValue.trim() || null
      continue
    }

    if (key === 'tags' || key === 'characters') {
      if (!rawValue.trim()) {
        currentListKey = key
        continue
      }
      const items = splitListValue(rawValue)
      if (key === 'tags') tags.push(...items)
      if (key === 'characters') characters.push(...items)
    }
  }

  return {
    title,
    tags: Array.from(new Set(tags)),
    characters: Array.from(new Set(characters)),
  }
}

function deriveTitle(fileName, content) {
  const base = typeof fileName === 'string' ? fileName.replace(/\.md$/i, '') : ''
  const { title: frontMatterTitle } = parseFrontMatter(content)
  if (frontMatterTitle) return frontMatterTitle

  const lines = typeof content === 'string' ? content.split('\n') : []
  for (const line of lines.slice(0, 20)) {
    const maybe = stripMarkdownTitle(line)
    if (maybe) return maybe
  }

  return base || 'Untitled'
}

function stringifyTokens(tokens) {
  if (!Array.isArray(tokens)) return ''
  return tokens.map((t) => String(t).trim()).filter(Boolean).join(' ')
}

function upsertArticle(db, input) {
  if (!db) throw new Error('upsertArticle requires db')
  const id = typeof input?.id === 'string' ? input.id : ''
  if (!id) throw new Error('upsertArticle requires { id }')

  const fileName = typeof input?.fileName === 'string' ? input.fileName : id
  const content = typeof input?.content === 'string' ? input.content : ''

  const meta = parseFrontMatter(content)
  const title = deriveTitle(fileName, content)
  const now = toIsoNow()

  const tags = stringifyTokens(meta.tags)
  const characters = stringifyTokens(meta.characters)

  const stmt = db.prepare(
    `INSERT INTO articles (id, title, content, characters, tags, format, workflow_stage, word_count, project_id, created_at, updated_at)
     VALUES (@id, @title, @content, @characters, @tags, 'markdown', 'draft', @word_count, NULL, @created_at, @updated_at)
     ON CONFLICT(id) DO UPDATE SET
       title=excluded.title,
       content=excluded.content,
       characters=excluded.characters,
       tags=excluded.tags,
       format=excluded.format,
       workflow_stage=excluded.workflow_stage,
       word_count=excluded.word_count,
       project_id=excluded.project_id,
       updated_at=excluded.updated_at`
  )

  stmt.run({
    id,
    title,
    content,
    characters,
    tags,
    word_count: countWords(content),
    created_at: now,
    updated_at: now,
  })

  return { id, title, tags, characters }
}

function deleteArticle(db, articleId) {
  if (!db) throw new Error('deleteArticle requires db')
  const id = typeof articleId === 'string' ? articleId : ''
  if (!id) throw new Error('deleteArticle requires articleId')
  db.prepare('DELETE FROM articles WHERE id = ?').run(id)
}

module.exports = { upsertArticle, deleteArticle, deriveTitle }

