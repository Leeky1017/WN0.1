# Proposal: issue-223-frontend-v2

## Why
- Sprint Frontend V2 要求从 Theia 前端解耦，交付一个独立的 `writenow-frontend/`（Vite + React + Tailwind + shadcn/ui + TipTap + FlexLayout）以获得更高的 UI 可控性与产品级体验。
- 当前仓库已有 Phase 0–1 的雏形实现，但存在规范偏离与潜在隐藏问题，需要系统性纠察并补齐 P2–P6（编辑器/AI/设置/版本历史/Electron 打包）能力，才能满足验收要求（Electron 运行 + AI 调用 + 文档编辑 + 主题切换）。

## What Changes
- 对 `writenow-frontend/` 进行 Phase 0–6 的增量实现与质量修复：
  - P0–P1：对齐锁定技术栈、完善 Design Tokens/主题、补齐 shadcn/ui 组件、修复 RPC/文件树/布局持久化并移除 stub 数据。
  - P2：迁移 TipTap 编辑器，完成多标签/分屏、自动保存/手动保存、工具栏（固定+浮动）、富文本/Markdown 双模式、导出与剪贴板适配。
  - P3：迁移 AI 面板（对话 + 流式输出 + 取消），重做 Cursor 风格 UI，实现 Diff 与斜杠命令。
  - P4：实现 cmdk 命令面板、设置面板与主题切换（含持久化）。
  - P5：实现版本历史（list/diff/restore）、Toast 通知（sonner）、快捷键系统。
  - P6：集成 electron-vite + 主进程启动 Theia 后端 + electron-builder 打包配置。
- 补齐 E2E 测试覆盖关键用户路径（真实 Electron + 真实持久化 + 真实 UI）。
- 更新 OpenSpec task cards checklist + RUN_LOG，确保交付链路可审计。

## Impact
- Affected specs:
  - `openspec/specs/sprint-frontend-v2/spec.md`
  - `openspec/specs/sprint-frontend-v2/task_cards/**`
- Affected code:
  - `writenow-frontend/**`
  - `writenow-theia/writenow-core/**`（仅在需要补齐 standalone bridge/AI streaming/导出等联动时变更）
- Breaking change: YES（独立前端替代 Theia 前端入口的演进方向；但本 PR 以新增/完善为主，不移除旧入口）
- User benefit:
  - 更稳定、更可控、更接近 Cursor/Linear 体验的创作 IDE；支持写作/AI/主题/导出/版本历史等核心流程。
