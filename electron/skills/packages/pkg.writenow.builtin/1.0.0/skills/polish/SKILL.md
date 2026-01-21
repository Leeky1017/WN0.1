---
id: builtin:polish
name: 润色文本
description: 优化表达与用词一致性（不改变原意）
version: 1.0.0
tags: [rewrite]
kind: single
scope: builtin
packageId: pkg.writenow.builtin
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
    请对下面的文本进行润色，保持原意不变，提升表达、语气与节奏。

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
context:
  hints:
    maxInstructionTokens: 5000
---

## Intent

在不改变原意的前提下，提升文本的清晰度、节奏与用词一致性。
