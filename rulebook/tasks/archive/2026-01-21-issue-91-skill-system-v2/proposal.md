# Proposal: issue-91-skill-system-v2

## Why
WriteNow 当前 SKILL（润色/扩写/精简）闭环已可用，但在“自定义/工程化/组合/多模型”方面存在结构性缺口：技能定义双源（前端常量 + DB upsert）易漂移、缺少版本/分发/升级机制、无法把多个 SKILL 组合成 workflow，也缺少对中低端模型的可用策略。本变更通过 Spec-first 的方式输出 SKILL System V2 的规范与拆解任务卡，确保后续实现可渐进落地且不破坏现有用户体验。

## What Changes
- 新增 OpenSpec：`openspec/specs/skill-system-v2/`（V2 需求、场景、设计与任务卡）
- 明确关键决策：`SKILL.md` 文件为 SSOT、DB 仅作运行时索引；引入 Skill Package、分层路由与版本演化策略
- 不修改现有功能与代码路径（本 PR 仅产出 spec/design/tasks）

## Impact
- Affected specs: `openspec/specs/skill-system-v2/spec.md`（新增）；引用并保持与 `openspec/specs/writenow-spec/spec.md` / Sprint specs 一致
- Affected code: None（实现将在后续任务卡中逐步交付）
- Breaking change: NO
- User benefit: 支持可分发/可升级/可组合/多模型兼容的 SKILL 体系，为“自定义技能库/市场/风格学习”铺路，同时避免双源漂移
