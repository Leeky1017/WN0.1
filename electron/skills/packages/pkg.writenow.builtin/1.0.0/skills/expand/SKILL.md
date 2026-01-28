---
id: builtin:expand
name: 扩写段落
description: 扩展细节描写（不新增与原文冲突的事实）
version: 1.0.0
tags: [rewrite]
kind: single
scope: builtin
packageId: pkg.writenow.builtin
context_rules:
  surrounding: 800
  user_preferences: true
  style_guide: true
  characters: true
  outline: false
  recent_summary: 3
  knowledge_graph: false
modelProfile:
  tier: high
  preferred: claude-3-5-sonnet-latest
output:
  format: plain_text
  constraints:
    - Output ONLY rewritten text
    - No explanations
    - No code blocks
prompt:
  system: |
    You are WriteNow's writing assistant.
    Follow the output constraints strictly:
    - Output ONLY the rewritten text that can directly replace the input.
    - No explanations, no headings, no code blocks.
  user: |
    请对下面的文本进行扩写：丰富细节、画面感与情绪，但不要添加与原文事实冲突的信息。

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
context:
  hints:
    maxInstructionTokens: 5000
---

## Intent

在不引入与原文冲突事实的前提下，补充细节与氛围，让画面更具体。
