# Proposal: issue-277-sprint-write-mode-ide

## Why
WN 当前最核心的交付目标是“IDE Write Mode（写作主路径）”—— 性能/体验优先、低维护成本、可控 AI、绝不丢稿。
但现状缺少一份可执行、可验收的单一事实来源（spec-first）：Write Mode 的形态、交互模型、性能预算、E2E 门禁、以及“删旧保新”的迁移规则没有被系统化沉淀，导致实现阶段容易漂移/返工。

## What Changes
- 新增 `openspec/specs/sprint-write-mode-ide/spec.md`：Write Mode 的 Requirements + Scenarios（MUST/SHOULD）
- 新增 `openspec/specs/sprint-write-mode-ide/design/*`：UX/性能/门禁/迁移/打包的详细设计与执行策略（强调单链路与可观测）
- 新增 `openspec/specs/sprint-write-mode-ide/task_cards/*`：按 P0–P3 分期的任务卡（元信息/前置/目标/清单/验收/产出）
- 新增/更新 `openspec/_ops/task_runs/ISSUE-277.md`：本次交付 Run Log（命令 + 关键输出 + 证据）

## Impact
- Affected specs: `openspec/specs/sprint-write-mode-ide/**`
- Affected code: None（docs-only）
- Breaking change: NO
- User benefit: Write Mode 的“功能与形态”可被统一验收；用 E2E/预算/契约/删除点把高质量变成默认结果，显著降低长期维护成本与返工成本
