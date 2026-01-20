function stripFrontMatter(content) {
  const raw = typeof content === 'string' ? content : ''
  if (!raw.startsWith('---\n')) return raw
  const endIndex = raw.indexOf('\n---', 4)
  if (endIndex === -1) return raw
  const after = raw.indexOf('\n', endIndex + 4)
  return after === -1 ? '' : raw.slice(after + 1)
}

function normalizeParagraph(text) {
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (!trimmed) return null
  return trimmed.replace(/\s+\n/g, '\n').trim()
}

function chunkMarkdownToParagraphs(content) {
  const withoutFrontMatter = stripFrontMatter(content)
  const parts = withoutFrontMatter.split(/\n{2,}/)
  const chunks = []
  for (const part of parts) {
    const normalized = normalizeParagraph(part)
    if (!normalized) continue
    chunks.push(normalized)
  }
  return chunks
}

module.exports = { chunkMarkdownToParagraphs, stripFrontMatter }

