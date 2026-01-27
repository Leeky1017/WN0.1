# P1-001: Command Palette UI（Cmd/Ctrl+K）接入真实 recent/files/skills

Status: done  
Issue: #292  
PR: https://github.com/Leeky1017/WN0.1/pull/295  
RUN_LOG: openspec/_ops/task_runs/ISSUE-292.md

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P1-001 |
| Phase | P1 - Write Mode UX / 交互模型 |
| 优先级 | P0 |
| 状态 | Done |
| 依赖 | P0-001 |

## 必读前置（执行前必须阅读）

- [x] `openspec/specs/sprint-write-mode-ide/spec.md`（Command Palette Requirement）
- [x] `design/01-write-mode-ux.md`（命令面板 IA/快捷键策略）
- [x] `design/03-quality-gates.md`（E2E 断言：Cmd/Ctrl+K 可用）
- [x] 现有实现资产：
  - [x] `writenow-frontend/src/stores/commandPaletteStore.ts`
  - [x] `writenow-frontend/src/features/command-palette/useCommands.ts`

## 目标

用最低成本建立“统一入口”，减少按钮散落导致的不可发现与维护成本：

1) Cmd/Ctrl+K 打开命令面板（可输入检索）
2) 支持 Recent / Files / Skills / Commands 四组
3) 选择项可执行：打开文件 / 运行 skill / 执行命令

## 任务清单

- [x] 1) 新增 CommandPalette 组件（UI）
  - [x] 路径建议：`writenow-frontend/src/features/command-palette/CommandPalette.tsx`
  - [x] 只做 presentational + glue；数据来自 store/hook（避免 UI 内部调用 RPC）
- [x] 2) 接入 open/query 状态（SSOT）
  - [x] 使用 `useCommandPaletteStore` 作为唯一 open/query 来源
  - [x] Esc 关闭（遵守 `design/01` 的 Esc 优先级）
- [x] 3) 接入数据分组（真实数据）
  - [x] Recent：`useCommandPaletteStore().recent`（最多 12，已实现去重/持久化）
  - [x] Files：`useCommands(enabled).files`（来自 `invoke('file:list')`）
  - [x] Skills：`useCommands(enabled).skills`（来自 `useAIStore().skills`）
  - [x] Commands：静态表（写在代码里，避免过度抽象）
- [x] 4) 执行行为（最小闭环）
  - [x] 选择 file：打开文件并聚焦 editor；写入 recent（type=file）
  - [x] 选择 skill：切换选中 skill 或触发 run（根据 UX 设计）；写入 recent（type=skill）
  - [x] 选择 command：执行（toggle Focus、toggle AI panel、New File、Open Settings...）；写入 recent（type=command）
- [x] 5) 快捷键（跨平台一致）
  - [x] macOS：`Cmd+K`
  - [x] win/linux：`Ctrl+K`
  - [x] 若已有 hotkey 系统，必须复用并避免双绑定
- [x] 6) 稳定选择器（E2E）
  - [x] `data-testid="cmdk"`（root）
  - [x] `data-testid="cmdk-input"`
  - [x] item 选择器稳定（避免依赖 DOM 结构）

## 验收标准

- [x] `Cmd/Ctrl+K` 可稳定打开命令面板并输入过滤
- [x] Recent 可持久化（重启后仍展示）
- [x] 选择文件后，编辑器打开并可输入（焦点在 editor）
- [x] 至少 1 条 E2E 覆盖命令面板（打开 → 选择文件 → 输入 → 保存状态变化）

## 产出

- `writenow-frontend/src/features/command-palette/CommandPalette.tsx`
- `writenow-frontend/src/features/command-palette/useCommands.ts`（必要时扩展 commands 组）
- `writenow-frontend/src/stores/commandPaletteStore.ts`（若需扩展：最近项 label 规则）

