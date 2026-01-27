## 1. Implementation
- [ ] 1.1 P1-001 Command Palette UI（Cmd/Ctrl+K）
  - [ ] 新增 `writenow-frontend/src/features/command-palette/CommandPalette.tsx`（presentational + glue；不在 UI 内直接调用 RPC）
  - [ ] `useCommandPaletteStore` 作为唯一 open/query/recent SSOT；提供稳定选择器：`cmdk` / `cmdk-input` / `cmdk-item-*`
  - [ ] 接入真实分组数据：
    - [ ] Recent：`useCommandPaletteStore().recent`（最多 12，去重/持久化）
    - [ ] Files：`invoke('file:list')`（通过 `useCommands(enabled)`）
    - [ ] Skills：`useAIStore().skills`（enabled + valid）
    - [ ] Commands：静态表（Toggle Focus/AI Panel/Open Settings/New File 等，避免过度抽象）
  - [ ] 执行行为闭环：
    - [ ] 选择 file：打开文件并聚焦 editor；写入 recent（type=file）
    - [ ] 选择 skill：切换选中 skill（必要时打开 AI 面板）；写入 recent（type=skill）
    - [ ] 选择 command：执行并写入 recent（type=command）
  - [ ] 快捷键：macOS `Cmd+K` / win+linux `Ctrl+K`（避免双绑定）

- [ ] 1.2 P1-002 Focus/Zen 模式（Cmd/Ctrl+\\）+ Esc 优先级
  - [ ] 在 `layoutStore` 增加 `focusMode: boolean`（持久化；禁止组件自建 isFocus）
  - [ ] AppShell 落地折叠规则：Focus 时隐藏 ActivityBar / Sidebar / AI Panel / Footer（按 `design/01-write-mode-ux.md`）
  - [ ] Focus HUD：`data-testid="wm-focus-hud"`（保留保存/字数/AI 状态等关键反馈）
  - [ ] `Esc` 优先级（写入代码注释 + E2E）：
    - [ ] 若 Review Mode 存在：Esc 先退出 Review（不应用修改）
    - [ ] 否则 AI 正在 running：Esc 取消 AI（第二次 Esc 再退出 Focus）
    - [ ] 否则 Focus 开启：Esc 退出 Focus
    - [ ] 否则 Esc 关闭 overlay（cmdk/settings/popover）

## 2. Testing
- [ ] 2.1 E2E：命令面板（打开 → 过滤/分组可见 → 选择文件 → editor 可输入）
- [ ] 2.2 E2E：Focus/Zen（切换 Focus → 侧栏/AI panel 隐藏 → 继续输入 → Esc 退出）
- [ ] 2.3 运行门禁并记录证据到 RUN_LOG：
  - [ ] `npm run lint`（writenow-frontend）
  - [ ] `npm test`（writenow-frontend）
  - [ ] `npm run test:e2e`（writenow-frontend）
  - [ ] `rulebook task validate issue-292-write-mode-ide-cmdk-focus`

## 3. Documentation
- [ ] 3.1 回填 task cards：验收标准打勾 + 元数据（Status/Issue/PR/RUN_LOG）
- [ ] 3.2 RUN_LOG 追加关键命令/关键输出/证据路径（只追加不回写）
