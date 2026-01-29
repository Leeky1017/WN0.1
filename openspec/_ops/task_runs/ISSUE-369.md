# ISSUE-369

- Issue: #369
- Branch: task/369-plan-spec-constraints
- PR: https://github.com/Leeky1017/WN0.1/pull/370

## Plan

- 添加"设计规范约束"章节（宪法级约束）
- 更新所有 todos，添加 DESIGN_SPEC.md 章节引用
- 添加验收标准模板

## Runs

### 2026-01-29 22:15 更新 plan 文件

- Command: `StrReplace` on `.cursor/plans/variant_设计落地_edd79d84.plan.md`
- Key changes:
  - 添加 `spec_authority: Variant/DESIGN_SPEC.md` 元数据
  - 添加"零、设计规范约束"章节（SSOT/必读前置/禁止事项/验收标准模板）
  - 更新 63 个 todos，每个都添加了 `| 规范: DESIGN_SPEC.md X.X` 引用
- Evidence: plan 文件已更新，agent 可明确知道参照哪个章节实现
