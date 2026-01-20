function nowIso() {
  return new Date().toISOString()
}

function buildContextRulesJson() {
  return JSON.stringify({
    includeArticle: true,
    includeStyleGuide: true,
  })
}

function getBuiltinSkills() {
  const contextRules = buildContextRulesJson()
  const systemPrompt = `You are WriteNow's writing assistant.
Follow the output constraints strictly:
- Output ONLY the rewritten text that can directly replace the input.
- No explanations, no headings, no code blocks.`

  return [
    {
      id: 'builtin:polish',
      name: '润色文本',
      description: '优化表达与用词一致性（不改变原意）',
      tag: 'rewrite',
      system_prompt: systemPrompt,
      user_prompt_template: `请对下面的文本进行润色，保持原意不变，提升表达、语气与节奏。

输出要求：
- 只输出“润色后的文本本身”
- 不要输出解释、总结、标题、列表序号或代码块
- 尽量保留原有换行与 Markdown 语法（如有）

{{#context}}
上下文（仅供理解，不要复述）：
{{context}}
{{/context}}

{{#styleGuide}}
写作风格指南（仅供参考，不要复述）：
{{styleGuide}}
{{/styleGuide}}

原文：
{{text}}
`,
      context_rules: contextRules,
      model: 'claude-3-5-sonnet-latest',
    },
    {
      id: 'builtin:expand',
      name: '扩写段落',
      description: '扩展细节描写（不新增与原文冲突的事实）',
      tag: 'rewrite',
      system_prompt: systemPrompt,
      user_prompt_template: `请对下面的文本进行扩写：丰富细节、画面感与情绪，但不要添加与原文事实冲突的信息。

输出要求：
- 只输出“扩写后的文本本身”
- 不要输出解释、总结、标题、列表序号或代码块
- 保持整体语义与叙事方向一致
- 尽量保留原有换行与 Markdown 语法（如有）

{{#context}}
上下文（仅供理解，不要复述）：
{{context}}
{{/context}}

{{#styleGuide}}
写作风格指南（仅供参考，不要复述）：
{{styleGuide}}
{{/styleGuide}}

原文：
{{text}}
`,
      context_rules: contextRules,
      model: 'claude-3-5-sonnet-latest',
    },
    {
      id: 'builtin:condense',
      name: '精简段落',
      description: '删除冗余，保持信息不丢失',
      tag: 'rewrite',
      system_prompt: systemPrompt,
      user_prompt_template: `请对下面的文本进行精简：删除冗余与重复表达，保持信息不丢失、语义不变。

输出要求：
- 只输出“精简后的文本本身”
- 不要输出解释、总结、标题、列表序号或代码块
- 尽量保留原有换行与 Markdown 语法（如有）

{{#context}}
上下文（仅供理解，不要复述）：
{{context}}
{{/context}}

{{#styleGuide}}
写作风格指南（仅供参考，不要复述）：
{{styleGuide}}
{{/styleGuide}}

原文：
{{text}}
`,
      context_rules: contextRules,
      model: 'claude-3-5-sonnet-latest',
    },
  ]
}

function ensureBuiltinSkills(db, logger) {
  if (!db) throw new Error('ensureBuiltinSkills requires db')

  const now = nowIso()
  const skills = getBuiltinSkills()

  const stmt = db.prepare(
    `INSERT INTO skills (id, name, description, tag, system_prompt, user_prompt_template, context_rules, model, is_builtin, created_at, updated_at)
     VALUES (@id, @name, @description, @tag, @system_prompt, @user_prompt_template, @context_rules, @model, 1, @created_at, @updated_at)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name,
       description=excluded.description,
       tag=excluded.tag,
       system_prompt=excluded.system_prompt,
       user_prompt_template=excluded.user_prompt_template,
       context_rules=excluded.context_rules,
       model=excluded.model,
       is_builtin=1,
       updated_at=excluded.updated_at`
  )

  const tx = db.transaction(() => {
    for (const skill of skills) {
      stmt.run({
        ...skill,
        created_at: now,
        updated_at: now,
      })
    }
  })

  try {
    tx()
    logger?.info?.('skills', 'builtin ensured', { count: skills.length })
  } catch (error) {
    logger?.error?.('skills', 'ensure builtin failed', { message: error?.message })
    throw error
  }
}

module.exports = { ensureBuiltinSkills }

