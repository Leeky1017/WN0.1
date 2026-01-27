# Proposal: issue-287-write-mode-closeout

## Why
PR `#286` 已合并并关闭 Issue `#281`，但 OpenSpec task cards 尚未回填完成状态与验收勾选，且 `writenow-spec` 的路线图未同步，会造成“实现已交付但规范漂移”的治理风险。

## What Changes
- 回填 `sprint-write-mode-ide` 的 P0-001 / P0-002 task cards：补齐 `Status/Issue/PR/RUN_LOG` 元信息，并将验收项从 `- [ ]` 更新为 `- [x]`。
- 同步更新 `openspec/specs/writenow-spec/spec.md` 的“当前状态/路线图”，明确 Write Mode SSOT 的完成事实与证据链接。

## Impact
- Affected specs:
  - `openspec/specs/sprint-write-mode-ide/task_cards/p0/P0-001-write-mode-ssot.md`
  - `openspec/specs/sprint-write-mode-ide/task_cards/p0/P0-002-save-status-ssot.md`
  - `openspec/specs/writenow-spec/spec.md`
- Affected code: 无（仅文档/治理同步）
- Breaking change: NO
- User benefit: 规范与实现一致，减少后续维护/交付歧义，并为审计与回归提供可追溯证据。
