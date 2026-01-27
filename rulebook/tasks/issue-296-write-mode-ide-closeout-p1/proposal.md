# Proposal: issue-296-write-mode-ide-closeout-p1

## Why
P1-001 / P1-002 的实现已在 #292/#295 合并，但对应 task cards 仍处于 Planned，且缺少可追溯链接与路线图同步。
按治理约束（OpenSpec SSOT + sprint task card closeout），必须补齐“验收勾选 + 元信息 + writenow-spec 进度同步”，避免文档与实现漂移。

## What Changes
- 回填 `sprint-write-mode-ide` 的 P1-001 / P1-002 task cards：勾选清单与验收标准，并补齐 Status/Issue/PR/RUN_LOG。
- 更新 `openspec/specs/writenow-spec/spec.md`：同步当前状态/路线图进度，反映 P1-001/002 已完成（以 #292/#295 为证据）。
- 标记并收口对应 Rulebook task（本任务）。

## Impact
- Affected specs:
  - `openspec/specs/sprint-write-mode-ide/task_cards/p1/P1-001-command-palette-ui.md`
  - `openspec/specs/sprint-write-mode-ide/task_cards/p1/P1-002-focus-zen-mode.md`
  - `openspec/specs/writenow-spec/spec.md`
- Affected code: 文档与元数据更新（无功能代码变更）
- Breaking change: NO
- User benefit: 让“实现状态”在 OpenSpec 体系内可查、可审计、可回归（避免只靠记忆或 PR 列表追踪进度）。
