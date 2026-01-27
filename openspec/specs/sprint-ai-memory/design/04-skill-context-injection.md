# SKILL 动态上下文注入（context_rules）

目标：让不同 SKILL “只拿它需要的上下文”，并把上下文组装规则从代码里的 if/else，变成 **SKILL 自描述的声明式契约**。

## 背景：Dynamic Context Discovery

写作 Agent 的成功关键不是“预加载一切”，而是：

- 初始上下文尽量少（稳定前缀）
- 让系统按 SKILL 声明按需加载（动态发现）
- 把长内容外置到文件（按需读取）

## SKILL 文件格式（建议扩展）

WriteNow 当前的 SKILL 定义使用 YAML frontmatter + `prompt.system/user` 模板（renderer 负责渲染，main 只接收完整 prompt 字符串）。

本 Sprint 提议在 frontmatter 中新增 `context_rules` 字段（JSON/YAML mapping），并将其持久化到 `skills.context_rules`（SQLite），供 renderer 的 ContextAssembler 使用。

### 示例：`context_rules`

```yaml
---
name: 润色文本
description: 优化表达和用词，使文字更加流畅

context_rules:
  surrounding: 500          # 前后各 N 字（单位：字符数）
  user_preferences: true    # 注入用户偏好
  style_guide: true         # 注入项目风格指南
  characters: false         # 是否需要人物卡
  recent_summary: 3         # 最近 N 次运行摘要

prompt:
  system: |
    你是写作助手。请按要求改写。
  user: |
    {{text}}
---
```

## context_rules 规范（建议）

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| surrounding | integer | 0 | 前后文注入预算（**单位固定为字符数：Unicode code points**，非 token） |
| user_preferences | boolean | false | 是否注入用户偏好 |
| style_guide | boolean | false | 是否注入项目风格指南 |
| characters | boolean | false | 是否需要人物/设定 |
| outline | boolean | false | 是否需要大纲位置/结构 |
| recent_summary | integer | 0 | 最近运行摘要条数（用于连续改写一致性） |
| knowledge_graph | boolean | false | 是否需要图谱证据（未来） |

约束（MUST）：

- `context_rules` 必须是 mapping（对象）；`integer` 字段必须是有限整数且 `>= 0`
- 所有字段必须确定性序列化（key 顺序固定、空白字符固定），避免 KV-cache 漂移
- **未知字段 MUST 返回 `INVALID_ARGUMENT`**（减少实现期歧义与静默降级）

## 来源引用格式（建议，必须去敏）

当注入来自文件/数据库时，建议在 prompt 与 run meta 中输出稳定引用，满足：

- **project-relative**：例如 `.writenow/style-guide.md`、`.writenow/characters/zhangsan.md`
- **禁止绝对路径**：不得包含 `/Users/...`、`C:\\...` 等机器路径（避免敏感信息与不可移植性）

示例：

```
ref:.writenow/style-guide.md
ref:.writenow/characters/zhangsan.md#L12-L58
```

## 注入矩阵（示例）

| SKILL 类型 | 注入内容（Layer） | 目标 Token 预算（建议） |
|-----------|-------------------|-------------------------|
| 润色/精简 | L2 用户偏好 + L3 风格指南 + L5 选区/前后文 | ~1500 |
| 扩写 | L3 大纲位置 + 人物设定 + L5 前后文 | ~3000 |
| 生成对话 | L3 场景人物设定 + 关系摘要 + L5 前文对话 | ~2500 |
| 一致性检查 | L4 全文摘要 + L5 查询点 +（未来）L3 图谱证据 | ~4000 |
| 续写 | L4 最近摘要 + L5 前文 2000 字 + L3 大纲后续 | ~3500 |

## 执行流（建议）

```
UI 选择 SKILL
  ↓
renderer: 读取 skill 定义（含 context_rules）
  ↓
renderer: ContextAssembler.selectContextForSkill(context_rules)
  ↓
renderer: buildStableSystemPrompt(layer0-5 + skill prompt + output format)
  ↓
renderer: invoke ai:skill:run(prompt.systemPrompt, prompt.userContent)
  ↓
main: 调用 LLM + stream 结果 + 记录 run meta
```

## 实现细节（任务卡落地建议）

### 1) skills.cjs：解析/校验/持久化

- 解析 SKILL.md frontmatter
- 校验 `context_rules` 的类型与字段（失败返回 `INVALID_ARGUMENT`）
- 将 `context_rules` 以 **稳定 JSON 字符串** 或结构化 JSON 存入 SQLite

### 2) renderer：ContextAssembler（新增/增强）

按 `context_rules` 聚合 Layer 数据：

- `surrounding`：从编辑器选区捕获前后文，按预算裁剪
- `user_preferences`：调用 `memory:*` 接口选择注入项
- `style_guide` / `characters`：按需读取文件（必要片段 + 引用）
- `recent_summary`：调用 `context:*` 获取 Compact 摘要

> 重要：ContextAssembler 输出必须是 **确定性可复现** 的（排序、截断策略一致）。

### 3) stable prompt builder（renderer）

将 Layer 0–5 组织为固定章节顺序（见 `02-kv-cache-optimization.md`），并将 skill-specific 指令作为“当前任务”或“输出格式”章节的一部分，避免每个 SKILL 重复定义完整系统模板。

## 验收点（建议）

- 规则正确性：不同 SKILL 的注入内容严格符合 context_rules
- 成本收益：对比“全量注入 vs 精准注入”的 token 使用
- 稳定性：同一静态条件下 stable prefix 字节级一致（snapshot）
- 错误语义：非法 context_rules 返回 `INVALID_ARGUMENT`；取消/超时可区分
