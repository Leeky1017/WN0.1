# Design: ConversationHistoryManager

## Goals

- 对话可恢复：完整对话落盘到 `.writenow/conversations/*.json`，索引可快速检索。
- Token 可控：注入上下文时默认只注入摘要，不注入全量对话。
- 学习信号可用：记录用户接受/拒绝偏好，为后续 Sprint 的体验增强做铺垫。

## Storage layout

推荐结构（与 spec 对齐）：
```
.writenow/conversations/
  index.json
  <conversation-id>.json
  <conversation-id>.json
```

### index.json (summary index)

建议字段（最小可用）：
- `id` / `articleId`
- `createdAt` / `updatedAt`
- `messageCount`
- `summary`（可注入）
- `keyTopics[]`
- `skillsUsed[]`
- `userPreferences.accepted[]` / `userPreferences.rejected[]`
- `fullPath`

### conversation file (full log)

建议字段：
- `id` / `articleId`
- `messages[]`（role, content, createdAt, skillId?）
- `events[]`（accept/reject/cancel/error 等行为证据）

## Summary generation

触发时机：
- 会话结束（用户关闭面板/切换文档/明确结束）
- 或消息数达到阈值（例如 20 条）且处于空闲状态

生成策略：
- 优先用同一 AI provider 生成结构化摘要（带 schema）
- 若 AI 不可用，降级为启发式摘要（提取最后 N 条 + 关键词），但必须在 index 标记 `summaryQuality=low`

## “像上次那样” retrieval

检索流程（Phase 1）：
1. 从用户消息中抽取引用信号（“像上次/之前那样/按上次风格”）
2. 基于 `articleId` 优先从 index 中选择最近对话
3. 选择 `summary` + `userPreferences` 注入 Retrieved 层（而不是覆盖 Rules）

要求：
- 必须在 TokenBudgetManager 的 Retrieved 预算内完成
- 必须能在 ContextViewer 展示“引用了哪次对话/哪段摘要”

