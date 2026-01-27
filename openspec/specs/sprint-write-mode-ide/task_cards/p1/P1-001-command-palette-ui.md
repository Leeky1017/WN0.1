# P1-001: Command Palette UI（Cmd/Ctrl+K）接入真实 recent/files/skills

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P1-001 |
| Phase | P1 - Write Mode UX / 交互模型 |
| 优先级 | P0 |
| 状态 | Planned |
| 依赖 | P0-001 |

## 必读前置（执行前必须阅读）

- [ ] `openspec/specs/sprint-write-mode-ide/spec.md`（Command Palette Requirement）
- [ ] `design/01-write-mode-ux.md`（命令面板 IA/快捷键策略）
- [ ] `design/03-quality-gates.md`（E2E 断言：Cmd/Ctrl+K 可用）
- [ ] 现有实现资产：
  - [ ] `writenow-frontend/src/stores/commandPaletteStore.ts`
  - [ ] `writenow-frontend/src/features/command-palette/useCommands.ts`

## 目标

用最低成本建立“统一入口”，减少按钮散落导致的不可发现与维护成本：

1) Cmd/Ctrl+K 打开命令面板（可输入检索）
2) 支持 Recent / Files / Skills / Commands 四组
3) 选择项可执行：打开文件 / 运行 skill / 执行命令

## 任务清单

- [ ] 1) 新增 CommandPalette 组件（UI）
  - [ ] 路径建议：`writenow-frontend/src/features/command-palette/CommandPalette.tsx`
  - [ ] 只做 presentational + glue；数据来自 store/hook（避免 UI 内部调用 RPC）
- [ ] 2) 接入 open/query 状态（SSOT）
  - [ ] 使用 `useCommandPaletteStore` 作为唯一 open/query 来源
  - [ ] Esc 关闭（遵守 `design/01` 的 Esc 优先级）
- [ ] 3) 接入数据分组（真实数据）
  - [ ] Recent：`useCommandPaletteStore().recent`（最多 12，已实现去重/持久化）
  - [ ] Files：`useCommands(enabled).files`（来自 `invoke('file:list')`）
  - [ ] Skills：`useCommands(enabled).skills`（来自 `useAIStore().skills`）
  - [ ] Commands：静态表（写在代码里，避免过度抽象）
- [ ] 4) 执行行为（最小闭环）
  - [ ] 选择 file：打开文件并聚焦 editor；写入 recent（type=file）
  - [ ] 选择 skill：切换选中 skill 或触发 run（根据 UX 设计）；写入 recent（type=skill）
  - [ ] 选择 command：执行（toggle Focus、toggle AI panel、New File、Open Settings...）；写入 recent（type=command）
- [ ] 5) 快捷键（跨平台一致）
  - [ ] macOS：`Cmd+K`
  - [ ] win/linux：`Ctrl+K`
  - [ ] 若已有 hotkey 系统，必须复用并避免双绑定
- [ ] 6) 稳定选择器（E2E）
  - [ ] `data-testid="cmdk"`（root）
  - [ ] `data-testid="cmdk-input"`
  - [ ] item 选择器稳定（避免依赖 DOM 结构）

## 验收标准

- [ ] `Cmd/Ctrl+K` 可稳定打开命令面板并输入过滤
- [ ] Recent 可持久化（重启后仍展示）
- [ ] 选择文件后，编辑器打开并可输入（焦点在 editor）
- [ ] 至少 1 条 E2E 覆盖命令面板（打开 → 选择文件 → 输入 → 保存状态变化）

## 产出

- `writenow-frontend/src/features/command-palette/CommandPalette.tsx`
- `writenow-frontend/src/features/command-palette/useCommands.ts`（必要时扩展 commands 组）
- `writenow-frontend/src/stores/commandPaletteStore.ts`（若需扩展：最近项 label 规则）

