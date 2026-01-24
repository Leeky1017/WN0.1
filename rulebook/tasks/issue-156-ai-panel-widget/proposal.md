# Proposal: issue-156-ai-panel-widget

## Why
WriteNow 的核心价值在于「面向创作的 AI 交互」。Phase 2 已完成 Theia 后端的 RPC、SQLite、RAG 与 Embedding 迁移，但缺少用户侧的 AI 交互入口与流式生成体验，导致系统能力不可用且难以端到端验证。

## What Changes
- 在 `writenow-core` 后端新增 AI/Skills/Context 三个服务模块（从 Electron IPC 迁移），并扩展 `writenow-protocol` 提供可判定的 RPC 接口。
- 设计并实现 Theia 侧的流式响应适配（WebSocket 推送 delta；RPC 负责启动/停止/查询能力）。
- 在前端实现 Theia `ReactWidget` 形态的 AI Panel（右侧边栏），包含：对话历史、输入区、SKILL 选择器、流式输出、停止生成、与编辑器选区/应用结果集成、快捷键。
- 增补端到端 E2E 验证，覆盖：SKILL 列表、流式对话、取消、选区改写与应用。

## Impact
- Affected specs:
  - `openspec/specs/sprint-theia-migration/task_cards/p3/012-ai-panel-widget.md`
  - `openspec/specs/writenow-spec/spec.md`
- Affected code:
  - `writenow-theia/writenow-core/src/common/writenow-protocol.ts`
  - `writenow-theia/writenow-core/src/node/**`
  - `writenow-theia/writenow-core/src/browser/**`
- Breaking change: NO (新增能力；不保留双路径迁移)
- User benefit: 在 Theia 里获得完整的 AI 面板：可选择 SKILL、可流式生成、可取消、可与编辑器选区结合完成改写并应用结果。
