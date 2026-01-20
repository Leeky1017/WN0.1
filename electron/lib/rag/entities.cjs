const { stripFrontMatter } = require('./chunking.cjs')

function splitListValue(value) {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!trimmed) return []
  const normalized = trimmed.replace(/^\[/, '').replace(/\]$/, '')
  return normalized
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseCardFrontMatter(content) {
  const raw = typeof content === 'string' ? content : ''
  if (!raw.startsWith('---\n')) return null
  const endIndex = raw.indexOf('\n---', 4)
  if (endIndex === -1) return null
  const block = raw.slice(4, endIndex + 1)
  const lines = block.split('\n')

  let type = null
  let name = null
  const aliases = []
  let currentListKey = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const listMatch = trimmed.match(/^-\s+(.+)$/)
    if (listMatch && currentListKey === 'aliases') {
      const value = listMatch[1].trim()
      if (value) aliases.push(value)
      continue
    }

    currentListKey = null
    const keyMatch = trimmed.match(/^([a-zA-Z_]+)\s*:\s*(.*)$/)
    if (!keyMatch) continue

    const key = keyMatch[1]
    const rawValue = keyMatch[2].trim()

    if (key === 'type') {
      type = rawValue || null
      continue
    }

    if (key === 'name') {
      name = rawValue || null
      continue
    }

    if (key === 'aliases') {
      if (!rawValue) {
        currentListKey = 'aliases'
        continue
      }
      aliases.push(...splitListValue(rawValue))
    }
  }

  if (!type) return null
  if (type !== 'character' && type !== 'setting') return null

  return {
    type,
    name: name || null,
    aliases: Array.from(new Set(aliases)),
  }
}

function deriveEntityName(articleId, content) {
  const base = typeof articleId === 'string' ? articleId.replace(/\.md$/i, '') : ''
  const body = stripFrontMatter(content)
  const firstHeading = body
    .split('\n')
    .slice(0, 20)
    .map((line) => line.trim())
    .find((line) => line.startsWith('#'))
  if (firstHeading) {
    const name = firstHeading.replace(/^#+\s*/, '').trim()
    if (name) return name
  }
  return base || null
}

function parseEntityCard(articleId, content) {
  const meta = parseCardFrontMatter(content)
  if (!meta) return null

  const name = meta.name || deriveEntityName(articleId, content)
  if (!name) return null

  const body = stripFrontMatter(content).trim()
  const fullText = body ? `${name}\n\n${body}` : name

  return {
    id: `${meta.type}:${name}`,
    type: meta.type,
    name,
    aliases: meta.aliases,
    content: fullText,
    sourceArticleId: articleId,
  }
}

function extractExplicitMentions(text) {
  const input = typeof text === 'string' ? text : ''
  const matches = input.matchAll(/@([^\s@#，。！？,.!?;:()（）\n]{1,32})/g)
  const names = []
  for (const match of matches) {
    const name = match?.[1]?.trim()
    if (name) names.push(name)
  }
  return Array.from(new Set(names))
}

function containsEntity(text, entity) {
  const haystack = typeof text === 'string' ? text : ''
  if (!entity || typeof entity.name !== 'string') return false
  if (haystack.includes(entity.name)) return true
  if (Array.isArray(entity.aliases)) {
    for (const alias of entity.aliases) {
      if (typeof alias === 'string' && alias && haystack.includes(alias)) return true
    }
  }
  return false
}

module.exports = { parseEntityCard, extractExplicitMentions, containsEntity }

