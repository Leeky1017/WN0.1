# Proposal: issue-51-sprint-2b-judge-layer

## Why
Sprint 2 Stage B 需要在 SKILL 生成后对建议稿做可配置约束检查（元语言 Judge Layer），把“写作规范”变成用户可见、可控、可追溯的决策依据，并为后续 Writing Contract 产品化打基础。

## What Changes
- 新增 Judge Layer：统一输入规则与输出违规项，支持 L1（纯代码）+ L2（本地小模型）可插拔组合。
- 新增约束配置：全局/项目级规则管理，持久化到 settings，并按“项目覆盖全局”生效。
- DiffView 集成违规高亮与汇总，保证低打扰但可见。
- 新增 E2E 覆盖：约束配置 → 生成 Diff → 违规可见。

## Impact
- Affected specs: `openspec/specs/sprint-2-ai/spec.md`
- Affected code: `src/lib/judge/**`, `src/types/constraints.ts`, `electron/lib/model-downloader.cjs`, `electron/lib/llm-runtime.cjs`, `src/components/AI/DiffView.tsx`, `src/components/sidebar-views/SettingsView.tsx`
- Breaking change: NO
- User benefit: 生成内容可自动检查禁用词/字数/格式/术语与语气/覆盖率，违规在 Diff 中直观可见，减少返工与“盲接受”风险。
