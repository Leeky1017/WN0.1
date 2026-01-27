# Proposal: issue-289-rulebook-archive

## Why
完成的 Rulebook task 若长期留在 active 目录会造成噪声与检索成本上升，也会让“当前在做什么”变得不清晰；需要把已完成任务归档到 `rulebook/tasks/archive/`，让活跃任务目录保持精简且可审计。

## What Changes
- 将 `rulebook/tasks/issue-281-write-mode-ssot/` 迁移到 `rulebook/tasks/archive/`（保留原始内容与证据）。
- 将 `rulebook/tasks/issue-287-write-mode-closeout/` 迁移到 `rulebook/tasks/archive/`（保留原始内容与证据）。
- 新增本任务的 RUN_LOG 与 Rulebook task 以记录归档操作与证据。

## Impact
- Affected specs: 无（仅 Rulebook task 目录结构）
- Affected code: 无
- Breaking change: NO
- User benefit: 降低任务目录噪声，提升治理与审计效率；active 目录更易用于“进行中工作”追踪。
