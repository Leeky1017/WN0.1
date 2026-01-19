# Proposal: Sprint 2 AI - Judge Layer（元语言约束系统）补充规格

## Goal
为 Sprint 2 AI 规格补充 “Judge Layer（元语言约束系统）” 模块，定义可插拔的约束检查架构（L1 代码检查 + L2 本地小模型检查），并明确 Diff 集成与可配置/持久化要求，为后续 Writing Contract 产品化奠定基础。

## Scope
- Append the provided Judge Layer requirements to `openspec/specs/sprint-2-ai/spec.md`.
- Keep OpenSpec strict validation passing.

## Non-Goals
- Implement Judge 层代码、UI、模型下载器或数据库 schema（本次仅补充规格）。

