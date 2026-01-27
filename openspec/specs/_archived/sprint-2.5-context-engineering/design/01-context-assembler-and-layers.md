# Design: ContextAssembler & Layered Context Model

## Layer Model

### Layer 1: Rules（always-on）

目标：让写作风格、术语与硬约束成为“稳定前缀”的一部分，提升一致性与 KV-Cache 命中。

推荐来源：
- `.writenow/rules/style.md`
- `.writenow/rules/terminology.json`
- `.writenow/rules/constraints.json`

### Layer 2: Settings（on-demand）

目标：只加载“此刻相关”的人物/世界观/时间线，避免把全量设定塞进上下文。

典型来源：
- `.writenow/characters/*.md`
- `.writenow/settings/*.md`

触发信号（Phase 1）：
- Immediate 文本中出现实体名（字符串匹配）
- 用户指令显式提到“某人物/某地点/某设定”

### Layer 3: Retrieved（dynamic）

目标：统一承接 Sprint 3 的 RAG 结果与历史摘要召回；本 Sprint 只定义接口与排序裁剪策略。

典型来源：
- RAG 召回的卡片/段落
- 相关历史对话摘要
- 相关章节/段落（未来扩展）

### Layer 4: Immediate（real-time）

目标：把用户“此刻”在编辑的上下文（选区/段落/前后文/指令）稳定注入。

## ContextChunk semantics

`ContextChunk` 的最小约束：
- `layer`：四层之一
- `source`：可追溯来源（文件路径/模块标识/对话 id）
- `content`：注入内容（必须可展示）
- `tokenCount`：可解释的估算或精确计数（由 TokenEstimator 提供）
- `priority`：同层内裁剪优先级（越高越不易被裁）

设计原则：
- chunk 必须是“语义边界”，裁剪只能以 chunk 为单位（除非执行可恢复压缩）。
- chunk 内容需要支持“红action”：对隐私信息按规则脱敏，但仍保留来源与结构。

## Assembly pipeline

### 1) Collect

按 Layer 顺序收集候选 chunks：
1. RulesLoader：一次预加载、变更触发刷新
2. SettingsLoader：基于实体/引用信号按需加载
3. RetrievedProvider：本 Sprint 仅定义接口（未来由 RAG/历史检索实现）
4. EditorContextStore：即时层拼装（选区 + 段落 + 前后文 + 指令）

### 2) Count

调用 `TokenEstimator` 为每个 chunk 计算 tokenCount，并构造：
- per-layer used/budget
- total used/limit

### 3) Enforce budget

把候选 chunks 交给 TokenBudgetManager：
- 输出裁剪后的 chunks（仍按 layer 与稳定顺序排序）
- 输出裁剪证据（删了什么、为什么、节省多少 token）

### 4) Render prompt

由 PromptTemplateSystem 渲染：
- `systemPrompt`：稳定前缀（skill 定义、输出格式、Rules）
- `userContent`：动态后缀（Settings/Retrieved/Immediate + 引用指针）

### 5) Return debug-friendly result

返回 `AssembledContext`：
- 供 AI 代理直接发送
- 供 ContextViewer 分层展示与证据展示

## Extension points

- `RetrievedProvider`: `retrieve(query, constraints) => ContextChunk[]`
- `SettingsResolver`: `resolve(editorContext) => { entities[], files[] }`
- `ConversationReferenceResolver`: 把“像上次那样”映射到对话摘要/策略 chunk

