# Proposal: issue-113-theia-docs-sync

## Why
Theia 迁移已成为 WriteNow 的核心路线；且 Theia 迁移 Phase 0 PoC 已通过并合并（Issue #111，完成：2026-01-22）。
当前宪法级文档仍以“自建 Electron + React + TipTap”为主叙事，且入口分裂/层级不清/内容重复，容易造成规范漂移与交付不可追溯。
本变更用于重构文档层级与索引，并同步 writenow-spec 的架构与路线图状态，确保“实现状态 → 上游规范”持续一致。

## What Changes
- Phase 1：为根目录 `AGENTS.md` 增加“规范导航”（Agent 阅读顺序 1–5）与 docs 工程标准入口指针。
- Phase 2：精简根目录 `AGENTS.md`（≤150 行，仅保留宪法级约束），并新增“4) 状态同步（强制）”规则。
- Phase 3：更新 `openspec/specs/writenow-spec/spec.md`（系统架构/路线图）以反映 Theia 迁移决策与当前状态；在 `sprint-theia-migration` 增加“状态同步触发点”。
- Phase 4：去重 `openspec/AGENTS.md` 与根 `AGENTS.md` 的重复内容；更新 `openspec/project.md` 规范索引；扩展 `openspec-log-guard` 增加“完成 sprint 任务卡必须同步 writenow-spec”的门禁。

## Impact
- Affected specs:
  - `openspec/specs/writenow-spec/spec.md`
  - `openspec/specs/sprint-theia-migration/spec.md`
- Affected governance/docs:
  - `AGENTS.md`
  - `openspec/AGENTS.md`
  - `openspec/project.md`
  - `.github/workflows/openspec-log-guard.yml`
- Affected code: None（doc + workflow only）
- Breaking change: NO
- User benefit: 单一权威入口 + 明确迁移主线；规范可追溯、可验证；CI 护栏避免“任务完成但上游路线图未更新”的漂移。
