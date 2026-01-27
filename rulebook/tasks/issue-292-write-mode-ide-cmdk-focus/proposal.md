# Proposal: issue-292-write-mode-ide-cmdk-focus

## Why
Write Mode 的键盘主路径需要“统一入口”（Command Palette）与“稳定可退出”的沉浸子状态（Focus/Zen）。
当前仓库已具备真实 `file:*` / skills 数据链路与 recent store，但缺少可用的 cmdk UI 与 Focus/Zen 的 SSOT + `Esc` 优先级，
导致功能不可发现、状态不稳定且难以用真实 E2E 验收。

## What Changes
- 新增 `CommandPalette` UI：接入真实 recent/files/skills，并提供最小命令集（含 Focus/Zen 与 AI 面板切换）。
- 新增/收口全局快捷键与 `Esc` 优先级：`Cmd/Ctrl+K` 打开 cmdk；`Cmd/Ctrl+\\` 切换 Focus/Zen；`Esc` 按设计文档规则处理。
- 在 `layoutStore` 增加 `focusMode`（持久化）并在 `AppShell` 落地侧栏/工具栏折叠与 Focus HUD。
- 补齐稳定 `data-testid`，新增 Playwright E2E 覆盖 cmdk 与 Focus/Zen 主路径。

## Impact
- Affected specs:
  - `openspec/specs/sprint-write-mode-ide/spec.md`
  - `openspec/specs/sprint-write-mode-ide/task_cards/p1/P1-001-command-palette-ui.md`
  - `openspec/specs/sprint-write-mode-ide/task_cards/p1/P1-002-focus-zen-mode.md`
- Affected code:
  - `writenow-frontend/src/features/command-palette/CommandPalette.tsx`
  - `writenow-frontend/src/features/command-palette/useCommands.ts`
  - `writenow-frontend/src/stores/commandPaletteStore.ts`
  - `writenow-frontend/src/stores/layoutStore.ts`
  - `writenow-frontend/src/components/layout/AppShell.tsx`（以及必要的 layout 组件）
  - `tests/e2e/*`（新增/更新）
- Breaking change: NO
- User benefit: 以键盘优先完成“打开命令面板→打开文件/运行技能→连续输入→保存/退出 Focus”的写作闭环，且状态可测可回归。
