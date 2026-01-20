export type SkillTag = 'rewrite' | 'generate' | 'analyze' | 'assist';

export type SkillContextRules = {
  includeArticle: boolean;
  includeStyleGuide: boolean;
};

export type SkillOutputConstraints = {
  outputOnlyRewrittenText: true;
  forbidCodeBlock: true;
  forbidExplanations: true;
};

export type SkillDefinition = {
  id: string;
  name: string;
  description: string;
  tag: SkillTag;
  systemPrompt: string;
  userPromptTemplate: string;
  contextRules: SkillContextRules;
  outputConstraints: SkillOutputConstraints;
  model: string;
  isBuiltin: true;
};

const DEFAULT_OUTPUT_CONSTRAINTS: SkillOutputConstraints = {
  outputOnlyRewrittenText: true,
  forbidCodeBlock: true,
  forbidExplanations: true,
};

const DEFAULT_CONTEXT_RULES: SkillContextRules = {
  includeArticle: true,
  includeStyleGuide: true,
};

export const BUILTIN_SKILLS: readonly SkillDefinition[] = [
  {
    id: 'builtin:polish',
    name: '润色文本',
    description: '优化表达与用词一致性（不改变原意）',
    tag: 'rewrite',
    systemPrompt:
      "You are WriteNow's writing assistant. Follow output constraints strictly: output ONLY the rewritten text, no explanations, no code blocks.",
    userPromptTemplate: `请对下面的文本进行润色，保持原意不变，提升表达、语气与节奏。\n\n输出要求：\n- 只输出“润色后的文本本身”\n- 不要输出解释、总结、标题、列表序号或代码块\n- 尽量保留原有换行与 Markdown 语法（如有）\n\n上下文（仅供理解，不要复述）：\n{{context}}\n\n写作风格指南（仅供参考，不要复述）：\n{{styleGuide}}\n\n原文：\n{{text}}\n`,
    contextRules: DEFAULT_CONTEXT_RULES,
    outputConstraints: DEFAULT_OUTPUT_CONSTRAINTS,
    model: 'claude-3-5-sonnet-latest',
    isBuiltin: true,
  },
  {
    id: 'builtin:expand',
    name: '扩写段落',
    description: '扩展细节描写（不新增与原文冲突的事实）',
    tag: 'rewrite',
    systemPrompt:
      "You are WriteNow's writing assistant. Follow output constraints strictly: output ONLY the rewritten text, no explanations, no code blocks.",
    userPromptTemplate: `请对下面的文本进行扩写：丰富细节、画面感与情绪，但不要添加与原文事实冲突的信息。\n\n输出要求：\n- 只输出“扩写后的文本本身”\n- 不要输出解释、总结、标题、列表序号或代码块\n- 保持整体语义与叙事方向一致\n- 尽量保留原有换行与 Markdown 语法（如有）\n\n上下文（仅供理解，不要复述）：\n{{context}}\n\n写作风格指南（仅供参考，不要复述）：\n{{styleGuide}}\n\n原文：\n{{text}}\n`,
    contextRules: DEFAULT_CONTEXT_RULES,
    outputConstraints: DEFAULT_OUTPUT_CONSTRAINTS,
    model: 'claude-3-5-sonnet-latest',
    isBuiltin: true,
  },
  {
    id: 'builtin:condense',
    name: '精简段落',
    description: '删除冗余，保持信息不丢失',
    tag: 'rewrite',
    systemPrompt:
      "You are WriteNow's writing assistant. Follow output constraints strictly: output ONLY the rewritten text, no explanations, no code blocks.",
    userPromptTemplate: `请对下面的文本进行精简：删除冗余与重复表达，保持信息不丢失、语义不变。\n\n输出要求：\n- 只输出“精简后的文本本身”\n- 不要输出解释、总结、标题、列表序号或代码块\n- 尽量保留原有换行与 Markdown 语法（如有）\n\n上下文（仅供理解，不要复述）：\n{{context}}\n\n写作风格指南（仅供参考，不要复述）：\n{{styleGuide}}\n\n原文：\n{{text}}\n`,
    contextRules: DEFAULT_CONTEXT_RULES,
    outputConstraints: DEFAULT_OUTPUT_CONSTRAINTS,
    model: 'claude-3-5-sonnet-latest',
    isBuiltin: true,
  },
];

