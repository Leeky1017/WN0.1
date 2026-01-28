/**
 * ContextAssembler (Standalone frontend)
 * Why: Skills MUST declare what context they need (`context_rules`) so we only inject relevant context and keep
 * the stable prefix (Layer 0–3) byte-stable for KV-cache reuse / provider prompt caching.
 */
 
import type { Editor } from '@tiptap/core'
 
import type {
  AiSkillRunRequest,
  IpcError,
  OutlineNode,
  SkillFileDefinition,
  UserMemory,
} from '@/types/ipc-generated'
import { invokeSafe } from '@/lib/rpc'
 
const CONTEXT_RULE_KEYS = [
  'surrounding',
  'user_preferences',
  'style_guide',
  'characters',
  'outline',
  'recent_summary',
  'knowledge_graph',
] as const
 
type ContextRuleKey = (typeof CONTEXT_RULE_KEYS)[number]
 
export type ContextRules = Readonly<{
  surrounding: number
  user_preferences: boolean
  style_guide: boolean
  characters: boolean
  outline: boolean
  recent_summary: number
  knowledge_graph: boolean
}>
 
type PromptTemplate = { system: string; user: string }
 
export class ContextAssemblerError extends Error {
  readonly code: IpcError['code']
  readonly details?: unknown
  readonly retryable?: boolean
 
  constructor(code: IpcError['code'], message: string, details?: unknown) {
    super(message)
    this.name = 'ContextAssemblerError'
    this.code = code
    this.details = details
  }
}
 
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
 
function coerceString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}
 
function normalizeNewlines(text: string): string {
  return (typeof text === 'string' ? text : '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}
 
function buildDefaultContextRules(): ContextRules {
  return {
    surrounding: 0,
    user_preferences: false,
    style_guide: false,
    characters: false,
    outline: false,
    recent_summary: 0,
    knowledge_graph: false,
  }
}
 
function normalizeNonNegativeInt(value: unknown, field: string, key: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new ContextAssemblerError('INVALID_ARGUMENT', `Invalid ${field}.${key}`, { field, key, value })
  }
  return value
}
 
function normalizeBoolean(value: unknown, field: string, key: string): boolean {
  if (typeof value !== 'boolean') {
    throw new ContextAssemblerError('INVALID_ARGUMENT', `Invalid ${field}.${key}`, { field, key, value })
  }
  return value
}
 
/**
 * Why: Context injection must be deterministic and auditable; unknown fields are rejected to avoid silent drift.
 * Failure: Invalid rules must surface as INVALID_ARGUMENT.
 */
function normalizeContextRules(value: unknown): { rules: ContextRules; json: string } {
  const field = 'context_rules'
 
  if (typeof value === 'undefined' || value === null) {
    const rules = buildDefaultContextRules()
    const ordered = Object.fromEntries(CONTEXT_RULE_KEYS.map((k) => [k, rules[k]])) as Record<ContextRuleKey, unknown>
    return { rules, json: JSON.stringify(ordered) }
  }
 
  if (!isRecord(value)) {
    throw new ContextAssemblerError('INVALID_ARGUMENT', `${field} must be a mapping`, { field, value })
  }
 
  const unknownKeys = Object.keys(value).filter((k) => !CONTEXT_RULE_KEYS.includes(k as ContextRuleKey))
  if (unknownKeys.length > 0) {
    throw new ContextAssemblerError('INVALID_ARGUMENT', `Unknown ${field} fields`, { field, unknownKeys })
  }
 
  const merged = { ...buildDefaultContextRules() }
 
  if (Object.prototype.hasOwnProperty.call(value, 'surrounding')) {
    merged.surrounding = normalizeNonNegativeInt(value.surrounding, field, 'surrounding')
  }
  if (Object.prototype.hasOwnProperty.call(value, 'recent_summary')) {
    merged.recent_summary = normalizeNonNegativeInt(value.recent_summary, field, 'recent_summary')
  }
  for (const key of ['user_preferences', 'style_guide', 'characters', 'outline', 'knowledge_graph'] as const) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      merged[key] = normalizeBoolean(value[key], field, key)
    }
  }
 
  const ordered = Object.fromEntries(CONTEXT_RULE_KEYS.map((k) => [k, merged[k]])) as Record<ContextRuleKey, unknown>
  return { rules: merged, json: JSON.stringify(ordered) }
}
 
function getPromptTemplate(definition: SkillFileDefinition | undefined): PromptTemplate {
  const fm = definition?.frontmatter
  if (!isRecord(fm)) throw new ContextAssemblerError('INVALID_ARGUMENT', 'Skill frontmatter is missing')
 
  const prompt = fm['prompt']
  if (!isRecord(prompt)) throw new ContextAssemblerError('INVALID_ARGUMENT', 'Skill prompt template is missing')
 
  const system = prompt['system']
  const user = prompt['user']
  if (typeof system !== 'string' || typeof user !== 'string') {
    throw new ContextAssemblerError('INVALID_ARGUMENT', 'Skill prompt must contain prompt.system and prompt.user')
  }
  return { system, user }
}
 
function renderSections(template: string, vars: Record<string, string | undefined>): string {
  return template.replace(/{{#([a-zA-Z0-9_]+)}}([\s\S]*?){{\/\1}}/g, (_m, rawKey, body) => {
    const key = String(rawKey)
    const value = vars[key]
    if (!value || !value.trim()) return ''
    return body
  })
}
 
function renderVariables(template: string, vars: Record<string, string | undefined>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_m, rawKey) => {
    const key = String(rawKey)
    const value = vars[key]
    return typeof value === 'string' ? value : ''
  })
}
 
function renderUserTemplate(userTemplate: string, vars: Record<string, string | undefined>): string {
  const normalized = normalizeNewlines(userTemplate)
  const rendered = renderVariables(renderSections(normalized, vars), vars).trim()
  if (!rendered) throw new ContextAssemblerError('INVALID_ARGUMENT', 'Rendered userContent is empty')
  return rendered
}
 
function sliceFirstCodePoints(text: string, n: number): string {
  if (n <= 0) return ''
  return Array.from(text).slice(0, n).join('')
}
 
function sliceLastCodePoints(text: string, n: number): string {
  if (n <= 0) return ''
  const arr = Array.from(text)
  return arr.slice(Math.max(0, arr.length - n)).join('')
}
 
function clampCodePoints(text: string, max: number): string {
  const value = normalizeNewlines(text).trim()
  if (max <= 0) return ''
  const arr = Array.from(value)
  if (arr.length <= max) return value
  if (max === 1) return '…'
  return `${arr.slice(0, Math.max(0, max - 1)).join('')}…`
}
 
function trimStartToBoundary(text: string): string {
  const value = normalizeNewlines(text)
  const para = value.indexOf('\n\n')
  if (para >= 0) return value.slice(para + 2).trimStart()
  const boundaries = ['。', '！', '？', '.', '!', '?', ';', '；']
  let idx = -1
  for (const b of boundaries) {
    const pos = value.indexOf(b)
    if (pos >= 0 && (idx === -1 || pos < idx)) idx = pos
  }
  if (idx >= 0) return value.slice(idx + 1).trimStart()
  return value
}
 
function trimEndToBoundary(text: string): string {
  const value = normalizeNewlines(text)
  const para = value.lastIndexOf('\n\n')
  if (para >= 0) return value.slice(0, para).trimEnd()
  const boundaries = ['。', '！', '？', '.', '!', '?', ';', '；']
  let idx = -1
  for (const b of boundaries) {
    const pos = value.lastIndexOf(b)
    if (pos >= 0 && pos > idx) idx = pos
  }
  if (idx >= 0) return value.slice(0, idx + 1).trimEnd()
  return value
}
 
function formatMemoryForPrompt(items: readonly UserMemory[]): string {
  if (!Array.isArray(items) || items.length === 0) return '(none)'
  return items
    .map((item) => {
      const scope = item.projectId ? 'project' : 'global'
      const content = normalizeNewlines(item.content).trim()
      return content ? `- [${item.type}/${item.origin}/${scope}] ${content}` : ''
    })
    .filter(Boolean)
    .join('\n')
    .trim()
}
 
function formatOutlineForPrompt(outline: readonly OutlineNode[] | null): string {
  if (!Array.isArray(outline) || outline.length === 0) return '(none)'
  const lines: string[] = []
  for (const node of outline) {
    const title = coerceString(node.title) || '(untitled)'
    const level = typeof node.level === 'number' && Number.isFinite(node.level) ? Math.max(0, Math.floor(node.level)) : 0
    const indent = '  '.repeat(Math.min(6, level))
    lines.push(`${indent}- ${title}`)
  }
  return lines.join('\n').trim()
}
 
function buildStableSystemPrompt(args: {
  layer0: string
  skillId: string
  projectId: string | null
  articleId: string | null
  contextRulesJson: string
  contextRules: ContextRules
  hasSelection: boolean
  preferences: readonly UserMemory[]
  styleGuide: { ref: string; content: string } | null
  characters: readonly { ref: string; content: string }[]
  outlineText: string | null
}): string {
  const parts: string[] = []
  parts.push('## 角色与行为约束')
  parts.push(normalizeNewlines(args.layer0).trimEnd() || '(empty)')
  parts.push('')
  parts.push('## 会话信息')
  parts.push(`- skillId: ${args.skillId}`)
  parts.push(`- projectId: ${args.projectId ?? '(none)'}`)
  parts.push(`- articleId: ${args.articleId ?? '(none)'}`)
  parts.push(
    `- capabilities: ${JSON.stringify({
      project: Boolean(args.projectId),
      article: Boolean(args.articleId),
      selection: args.hasSelection,
    })}`,
  )
  parts.push(`- context_rules: ${args.contextRulesJson}`)
  parts.push('')
  parts.push('## 用户偏好')
  if (!args.contextRules.user_preferences) {
    parts.push('(masked: context_rules.user_preferences=false)')
  } else if (!args.projectId) {
    parts.push('(unavailable: no projectId)')
  } else {
    parts.push(formatMemoryForPrompt(args.preferences))
  }
  parts.push('')
  parts.push('## 项目设定')
  parts.push('### 写作风格指南')
  if (!args.contextRules.style_guide) {
    parts.push('(masked: context_rules.style_guide=false)')
  } else if (!args.projectId) {
    parts.push('(unavailable: no projectId)')
  } else if (args.styleGuide) {
    parts.push(`ref:${args.styleGuide.ref}`)
    parts.push(normalizeNewlines(args.styleGuide.content).trimEnd())
  } else {
    parts.push('(none)')
  }
  parts.push('')
  parts.push('### 人物设定')
  if (!args.contextRules.characters) {
    parts.push('(masked: context_rules.characters=false)')
  } else if (!args.projectId) {
    parts.push('(unavailable: no projectId)')
  } else if (Array.isArray(args.characters) && args.characters.length > 0) {
    for (const file of [...args.characters].sort((a, b) => a.ref.localeCompare(b.ref))) {
      parts.push(`ref:${file.ref}`)
      parts.push(normalizeNewlines(file.content).trimEnd())
      parts.push('')
    }
    while (parts.length > 0 && parts[parts.length - 1] === '') parts.pop()
  } else {
    parts.push('(none)')
  }
  parts.push('')
  parts.push('### 大纲')
  if (!args.contextRules.outline) {
    parts.push('(masked: context_rules.outline=false)')
  } else if (!args.projectId || !args.articleId) {
    parts.push('(unavailable: missing projectId/articleId)')
  } else {
    parts.push(args.outlineText ? normalizeNewlines(args.outlineText).trimEnd() : '(none)')
  }
  return parts.join('\n').trimEnd()
}
 
function buildUserContent(args: { recentSummary: string; currentContext: string; outputFormat: string }): string {
  return [
    '## 最近摘要',
    args.recentSummary.trim() ? args.recentSummary.trimEnd() : '(none)',
    '',
    '## 当前上下文',
    args.currentContext.trim() ? args.currentContext.trimEnd() : '(none)',
    '',
    '## 输出格式',
    args.outputFormat.trim() ? args.outputFormat.trimEnd() : '(none)',
  ].join('\n')
}
 
function normalizeInjectedRefs(value: readonly string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of value) {
    if (typeof raw !== 'string') continue
    const trimmed = raw.trim().replace(/\\/g, '/')
    if (!trimmed) continue
    if (
      trimmed.startsWith('/') ||
      trimmed.startsWith('\\\\') ||
      /^[a-zA-Z]:\//.test(trimmed) ||
      /^[a-zA-Z]:\\/.test(raw)
    ) {
      throw new ContextAssemblerError('INVALID_ARGUMENT', 'injected.refs MUST be project-relative (no absolute paths)', {
        ref: raw,
      })
    }
    if (trimmed.includes('://') || trimmed.startsWith('file:')) {
      throw new ContextAssemblerError('INVALID_ARGUMENT', 'injected.refs MUST be project-relative (no URLs)', { ref: raw })
    }
    if (seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  out.sort((a, b) => a.localeCompare(b))
  return out
}
 
export type AssembleSkillRunInput = {
  skillId: string
  definition: SkillFileDefinition
  text: string
  instruction: string
  selection: { from: number; to: number } | null
  editor: Editor | null
  projectId?: string
  articleId?: string
}
 
/**
 * Build the full `AiSkillRunRequest` including stable prefix + deterministic injections.
 */
export async function assembleSkillRunRequest(input: AssembleSkillRunInput): Promise<AiSkillRunRequest> {
  const template = getPromptTemplate(input.definition)
  if (!template.system.trim() || !template.user.trim()) {
    throw new ContextAssemblerError('INVALID_ARGUMENT', 'Skill prompt is invalid')
  }
 
  const fm = input.definition.frontmatter
  const context = normalizeContextRules(isRecord(fm) ? fm['context_rules'] : undefined)
  const contextRules = context.rules
  const projectId = coerceString(input.projectId) || null
  const articleId = coerceString(input.articleId) || null
  const hasSelection = Boolean(input.selection)
 
  const injectedRefs: string[] = []
  let injectedMemory: UserMemory[] = []
  let styleGuide: { ref: string; content: string } | null = null
  let characters: Array<{ ref: string; content: string }> = []
  let outlineText: string | null = null
 
  if (contextRules.user_preferences && projectId) {
    const mem = await invokeSafe('memory:injection:preview', { projectId })
    injectedMemory = Array.isArray(mem?.injected?.memory) ? mem!.injected.memory : []
  }
 
  if (contextRules.style_guide && projectId) {
    const res = await invokeSafe('context:writenow:rules:get', { projectId })
    const fragments = Array.isArray(res?.fragments) ? res!.fragments : []
    const style = fragments.find((f) => f.kind === 'style')
    const relPath = coerceString(style?.path)
    if (relPath && typeof style?.content === 'string') {
      const ref = `.writenow/${relPath}`
      styleGuide = { ref, content: clampCodePoints(style.content, 2400) }
      injectedRefs.push(ref)
    }
  }
 
  if (contextRules.characters && projectId) {
    const listRes = await invokeSafe('context:writenow:settings:list', { projectId })
    const all = Array.isArray(listRes?.characters) ? listRes!.characters.map(coerceString).filter(Boolean) : []
    all.sort((a, b) => a.localeCompare(b))
    const selected = all.slice(0, 20)
    if (selected.length > 0) {
      const readRes = await invokeSafe('context:writenow:settings:read', { projectId, characters: selected })
      const files = Array.isArray(readRes?.files) ? readRes!.files : []
      characters = files
        .map((f) => {
          const relPath = coerceString((f as { path?: unknown }).path)
          const content = typeof (f as { content?: unknown }).content === 'string' ? (f as { content: string }).content : ''
          if (!relPath || !content.trim()) return null
          return { ref: `.writenow/${relPath}`, content: clampCodePoints(content, 1800) }
        })
        .filter((v): v is { ref: string; content: string } => Boolean(v))
      characters.sort((a, b) => a.ref.localeCompare(b.ref))
      for (const file of characters) injectedRefs.push(file.ref)
    }
  }
 
  if (contextRules.outline && projectId && articleId) {
    const outlineRes = await invokeSafe('outline:get', { projectId, articleId })
    outlineText = formatOutlineForPrompt(outlineRes?.outline ?? null)
  }
 
  let recentSummary = ''
  if (contextRules.recent_summary <= 0) {
    recentSummary = '(masked: context_rules.recent_summary=0)'
  } else if (!projectId) {
    recentSummary = '(unavailable: no projectId)'
  } else {
    const res = await invokeSafe('context:writenow:conversations:list', {
      projectId,
      ...(articleId ? { articleId } : {}),
      limit: contextRules.recent_summary,
    })
    const items = Array.isArray(res?.items) ? res!.items : []
    const lines = items.slice(0, contextRules.recent_summary).map((item) => {
      const summary = coerceString(item.summary) || '(empty)'
      const quality = coerceString(item.summaryQuality) || 'placeholder'
      const updatedAt = coerceString(item.updatedAt)
      const fullPath = coerceString(item.fullPath)
      if (fullPath) {
        // Why: Keep E2E/auditability via injected.refs; MUST be project-relative and never leak machine paths.
        injectedRefs.push(`.writenow/${fullPath}`)
      }
      return `- ${updatedAt ? `[${updatedAt}] ` : ''}[${quality}] ${summary}`
    })
    recentSummary = lines.length > 0 ? lines.join('\n') : '(none)'
  }
 
  let surrounding = ''
  if (contextRules.surrounding > 0) {
    if (!input.selection || !input.editor) {
      surrounding = '(unavailable: no selection)'
    } else {
      const doc = input.editor.state.doc
      const docSize = doc.content.size
      const from = Math.max(0, Math.min(input.selection.from, docSize))
      const to = Math.max(from, Math.min(input.selection.to, docSize))
 
      const beforeFull = doc.textBetween(0, from, '\n')
      const afterFull = doc.textBetween(to, docSize, '\n')
 
      const beforeRaw = sliceLastCodePoints(beforeFull, contextRules.surrounding)
      const afterRaw = sliceFirstCodePoints(afterFull, contextRules.surrounding)
      const before = trimStartToBoundary(beforeRaw)
      const after = trimEndToBoundary(afterRaw)
 
      surrounding = [
        `surrounding: each side <= ${contextRules.surrounding} code points (paragraph boundary preferred)`,
        '--- before ---',
        before.trim() ? before : '(empty)',
        '--- after ---',
        after.trim() ? after : '(empty)',
      ].join('\n')
    }
  }
 
  let ragContext = ''
  if (contextRules.knowledge_graph) {
    const ragRes = await invokeSafe('rag:retrieve', {
      queryText: input.text.slice(0, 2000),
      budget: { maxChunks: 2, maxChars: 1200, maxCharacters: 3, maxSettings: 3, cursor: '0' },
    })
    if (ragRes) {
      const parts: string[] = []
      const passages = Array.isArray(ragRes.passages) ? ragRes.passages : []
      const includeCharacters = contextRules.characters
      const includeSettings = contextRules.characters
      const chars = includeCharacters && Array.isArray(ragRes.characters) ? ragRes.characters : []
      const settings = includeSettings && Array.isArray(ragRes.settings) ? ragRes.settings : []
 
      if (passages.length > 0) {
        parts.push('Passages:')
        for (const passage of passages.slice(0, 5)) {
          const title = coerceString(passage.title) || coerceString(passage.articleId) || 'Document'
          const content = coerceString(passage.content)
          if (!content) continue
          parts.push(`- ${title} (#${passage.idx}): ${content}`)
        }
      }
 
      if (chars.length > 0) {
        parts.push('Characters:')
        for (const card of chars.slice(0, 5)) {
          const name = coerceString(card.name)
          const content = coerceString(card.content)
          if (!name || !content) continue
          parts.push(`- ${name}: ${content}`)
        }
      }
 
      if (settings.length > 0) {
        parts.push('Settings:')
        for (const card of settings.slice(0, 5)) {
          const name = coerceString(card.name)
          const content = coerceString(card.content)
          if (!name || !content) continue
          parts.push(`- ${name}: ${content}`)
        }
      }
 
      ragContext = parts.join('\n').trim()
    }
  }
 
  let kgContext = ''
  if (contextRules.knowledge_graph && projectId) {
    const kgRes = await invokeSafe('kg:graph:get', { projectId })
    const entities = Array.isArray(kgRes?.entities) ? kgRes!.entities : []
    const relations = Array.isArray(kgRes?.relations) ? kgRes!.relations : []
 
    const haystack = input.text.trim()
    if (haystack) {
      const matches = entities.filter((e) => {
        const name = coerceString(e.name)
        return name.length >= 2 && haystack.includes(name)
      })
 
      if (matches.length > 0) {
        const limited = matches.slice(0, 8)
        const includedIds = new Set(limited.map((e) => e.id))
        const idToName = new Map(limited.map((e) => [e.id, coerceString(e.name)] as const))
 
        const edgeLines: string[] = []
        for (const rel of relations) {
          if (!includedIds.has(rel.fromEntityId) || !includedIds.has(rel.toEntityId)) continue
          const fromName = idToName.get(rel.fromEntityId) ?? rel.fromEntityId
          const toName = idToName.get(rel.toEntityId) ?? rel.toEntityId
          const type = coerceString(rel.type) || 'related_to'
          edgeLines.push(`- ${fromName} -[${type}]-> ${toName}`)
        }
 
        const parts: string[] = []
        parts.push('Knowledge Graph:')
        parts.push('Entities:')
        for (const entity of limited) {
          const type = coerceString(entity.type) || 'Entity'
          const name = coerceString(entity.name) || '(unnamed)'
          const desc = coerceString(entity.description)
          parts.push(`- [${type}] ${name}${desc ? `: ${desc}` : ''}`)
        }
        if (edgeLines.length > 0) {
          parts.push('Relations:')
          parts.push(...edgeLines.slice(0, 12))
        }
        kgContext = parts.join('\n').trim()
      }
    }
  }
 
  const contextCombined = [input.instruction, surrounding, ragContext, kgContext]
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n\n')
 
  const renderedUserPrompt = renderUserTemplate(template.user, {
    text: input.text,
    context: contextCombined,
    styleGuide: '',
  })
 
  const output = isRecord(fm) ? fm['output'] : null
  const outputFormat = isRecord(output) && typeof output['format'] === 'string' ? output['format'] : ''
  const constraintsRaw = isRecord(output) ? output['constraints'] : []
  const outputConstraints = Array.isArray(constraintsRaw) ? constraintsRaw.map(coerceString).filter(Boolean) : []
  const outputFormatText = [
    outputFormat ? `format: ${outputFormat}` : 'format: (unspecified)',
    outputConstraints.length > 0 ? 'constraints:' : 'constraints: (none)',
    ...outputConstraints.map((c) => `- ${c}`),
  ].join('\n')
 
  const systemPrompt = buildStableSystemPrompt({
    layer0: template.system,
    skillId: input.skillId,
    projectId,
    articleId,
    contextRulesJson: context.json,
    contextRules,
    hasSelection,
    preferences: injectedMemory,
    styleGuide,
    characters,
    outlineText,
  })
 
  const userContent = buildUserContent({
    recentSummary,
    currentContext: renderedUserPrompt,
    outputFormat: outputFormatText,
  })
 
  const refs = normalizeInjectedRefs(injectedRefs)
 
  return {
    skillId: input.skillId,
    input: { text: input.text, language: 'zh-CN' },
    ...(projectId || articleId ? { context: { ...(projectId ? { projectId } : {}), ...(articleId ? { articleId } : {}) } } : {}),
    stream: true,
    prompt: { systemPrompt, userContent },
    injected: { memory: injectedMemory, refs, contextRules },
  }
}

