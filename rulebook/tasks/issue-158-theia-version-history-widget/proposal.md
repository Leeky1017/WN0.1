# Proposal: issue-158-theia-version-history-widget

## Why
WriteNow 的核心差异化是“文字的 Git”。Theia 迁移 Phase 3 需要把版本历史能力迁移为 Theia Widget，并与 TipTap Editor + AI Panel 接线，确保用户可以回溯/对比/回滚 AI 修改，且失败路径可观测可重试。

## What Changes
- Backend：补齐版本快照创建的健壮性（当文章尚未被索引到 `articles` 表时，允许在显式 content 提供的前提下 upsert 文章记录，从而满足 `article_snapshots` 外键约束）。
- Frontend（Theia）：新增 Version History Widget（快照列表/详情/统一 diff/回滚）与 commands/contribution，并接入 ActiveEditorService。
- Editor：暴露最小 editor API（articleId + 全文 markdown getter/setter）用于版本历史与 AI apply 的快照/回滚。
- AI Panel：Apply 前/后自动写入版本快照（actor=auto/ai），让用户可 diff/rollback。

## Impact
- Affected specs:
  - openspec/specs/sprint-theia-migration/task_cards/p3/013-version-history-widget.md
  - openspec/specs/writenow-spec/spec.md
- Affected code:
  - writenow-theia/writenow-core/src/node/services/version-service.ts
  - writenow-theia/writenow-core/src/browser/version-history/**
  - writenow-theia/writenow-core/src/browser/ai-panel/ai-panel-widget.tsx
  - writenow-theia/writenow-core/src/browser/tiptap-markdown-editor-widget.tsx
- Breaking change: NO（新增 widget/command；既有 IPC channel 保持不变）
- User benefit: 版本历史可视化 + Diff + 回滚闭环，AI 修改默认可追溯可恢复。
