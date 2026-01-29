# Design：writenow-frontend 差距补全（总览）

## Goals

- 把“后端已有但前端无入口/不可发现”的差距，系统性补齐到 `writenow-frontend/`（Write Mode SSOT）。
- 以 **P0 先行**：优先补齐差异化能力的入口（知识图谱/人物/约束/Judge/上下文调试/大纲编辑）。
- 所有新增能力都必须满足：真实 RPC（standalone-rpc）+ 可判定失败语义 + 真实 E2E。

## Non-goals

- 不替换锁定技术栈；不引入第二套前端/双入口（见 repo-root `AGENTS.md`）。
- 默认不新增后端能力；本阶段以“暴露既有通道”为主（若发现契约缺失/bug，必须另建 issue）。

## Problem Statement

最严重问题不是“缺功能”，而是“**后端能力不可用**”：

- 后端（standalone-rpc）已提供：`kg:*`、`character:*`、`constraints:*`、`judge:*`、`context:writenow:*`、`skill:write`、`embedding:index` 等通道
- 但 `writenow-frontend` 缺少对应 UI 入口或只做了部分实现，导致用户无法使用或难以发现

这会直接削弱 WriteNow 的差异化（见 `openspec/specs/writenow-spec/spec.md`）。

## Scope & Surfaces（落点）

### 主要落点：`writenow-frontend/`

- 导航：`src/components/layout/activity-bar.tsx`、`src/stores/layoutStore.ts`、`src/components/layout/AppShell.tsx`
- 面板：`src/features/*/*Panel.tsx`
- 调用契约：`writenow-frontend/src/lib/rpc/api.ts`（`invoke()` / Envelope） + `writenow-frontend/src/types/ipc-generated.ts`
- 质量：`writenow-frontend/tests/e2e/**`（Playwright 真实 E2E）

### 依赖（只引用，不在本 spec 重复定义）

- IPC Envelope/错误码：`openspec/specs/api-contract/spec.md`
- 记忆/上下文工程：`openspec/specs/sprint-ai-memory/spec.md`
- 产品差异化与路线图：`openspec/specs/writenow-spec/spec.md`

## Priority Strategy

- **P0（最高 ROI）**：后端已有但前端无入口/只读 → 补 UI 入口 + 最小可用交互
- **P1**：完善闭环（自定义技能/对话管理/记忆学习与预览/Judge 设置/编辑器手感）
- **P2–P3**：专业写作能力（索引维护/Corkboard/目标/时间线）——可能触及新增存储与数据模型，需要明确拆分与单独 issue

## Current Baseline（现状快照）

> 这不是“验收声明”，仅用于对齐当前代码基线，避免 spec 与实现脱节。

- Search 面板已支持全文/语义模式，但仍缺少“索引/模型未就绪”的可恢复引导与更强的定位能力
- Outline 面板支持展示与导航，但整体为只读（`outline:save` 未接入交互）
- Memory 面板已具备 CRUD 与注入开关，但缺少“偏好学习触发”的闭环入口
- Skills 面板可查看/启用/禁用，但缺少 `skill:write` 的创建/编辑入口

