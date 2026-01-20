# Spec Delta: wn-frontend-deep-remediation (Issue #34)

## Purpose

本任务新增一份跨 Sprint 的前端深度修复规范，用于把审计反馈（设计系统/布局/编辑器/AI 面板/性能/i18n/质量门禁）转化为可验证的 Requirements + Scenarios，并产出可执行任务卡片。

规范 SSOT：

- `openspec/specs/wn-frontend-deep-remediation/spec.md`

## Requirements (Index)

下列 Requirement ID 以 canonical spec 为准（本文件仅作为 Rulebook 任务内的索引与证据锚点）：

- `FROTNEND-DS-001` 设计 Token SSOT（Primitive→Semantic→Component）
- `FROTNEND-DS-002` 禁止硬编码颜色/未定义 `wn-*`
- `FROTNEND-DS-003` `src/components/wn/` 封装层与统一 API
- `FROTNEND-LAYOUT-001` 消除“三明治陷阱”，四栏贯穿布局 + 可拖拽持久化
- `FROTNEND-LAYOUT-002` 单一超细 StatusBar + 渐进披露
- `FROTNEND-EDITOR-001` 单行 TabToolbar + 真多标签
- `FROTNEND-EDITOR-002` Markdown 预览全保真 + 性能策略 + 滚动同步
- `FROTNEND-EDITOR-003` Split 可拖拽分割线 + 小屏降级
- `FROTNEND-EDITOR-004` 字体模式切换 + 行号低干扰
- `FROTNEND-AI-001` AI 面板响应式 + 专业对话层级
- `FROTNEND-AI-002` SKILL 顶部 Dock + 折叠/自定义
- `FROTNEND-AI-003` 编辑上下文感知 + 会话持久化
- `FROTNEND-AI-004` 内联 AI（Cmd/Ctrl+K）+ 可控应用/可撤销
- `FROTNEND-SIDEBAR-001` 内联新建 + 全文/语义搜索入口
- `FROTNEND-FLOW-001` Typewriter/Focus/Zen 心流保护
- `FROTNEND-TECH-001` autosave debounce + i18n 全覆盖门禁
- `FROTNEND-QUALITY-001` E2E + 视觉回归 + 手动矩阵门禁

