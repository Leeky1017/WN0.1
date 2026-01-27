# Delta Spec: sprint-write-mode-ide (Issue #292)

本任务实现并验收 `openspec/specs/sprint-write-mode-ide/spec.md` 的以下增量：

- Focus/Zen 子状态（L74–78）
- Command Palette 作为 Write Mode 第一入口（L96–112）

## Requirements

### R1. Command Palette MUST 可被键盘稳定打开并立即输入

- MUST 支持：macOS `Cmd+K` / win+linux `Ctrl+K` 打开命令面板。
- 打开后输入框 MUST 自动聚焦，用户无需鼠标即可输入过滤。
- 命令面板 MUST 提供稳定选择器：`data-testid="cmdk"` / `data-testid="cmdk-input"`。

### R2. Command Palette MUST 接入真实 Recent / Files / Skills / Commands

- Recent MUST 来自 `useCommandPaletteStore().recent`，且：
  - 同 `(type,id)` 去重；
  - 最多 12 条；
  - MUST 持久化，重启后仍可展示。
- Files MUST 来自真实后端 `invoke('file:list')`（禁止 stub）。
- Skills MUST 来自真实 skills 列表（`useAIStore().skills`，过滤 `enabled && valid`）。
- Commands MUST 为静态表（避免过度抽象），至少包含 Focus/Zen 与 AI 面板相关命令。

### R3. Focus/Zen MUST 为可持久化子状态并折叠非必要 UI

- Focus/Zen MUST 具备 SSOT：`focusMode: boolean`（建议持久化到 `layoutStore`）。
- Focus 开启时 MUST 隐藏非必要 UI（ActivityBar / Sidebar / AI Panel / Footer），并保留必要反馈（保存/字数/AI 状态）。
- MUST 提供稳定选择器：`data-testid="wm-focus-root"` / `data-testid="wm-focus-hud"`。

### R4. Esc 行为 MUST 遵守稳定优先级（可预测）

按优先级从高到低：

1) 若存在 Review 状态：Esc MUST 退出 Review（不应用修改）
2) 否则若 AI 正在运行：Esc MUST 取消 AI；再次 Esc 才允许退出 Focus
3) 否则若 Focus 开启：Esc MUST 退出 Focus
4) 否则：Esc MUST 关闭 overlays（cmdk/settings/popover）

## Scenarios

### S1. Cmd/Ctrl+K → 选择文件 → Editor 可输入

- WHEN 用户按下 `Cmd/Ctrl+K`
- THEN 命令面板打开且输入可立即键入
- AND THEN 用户选择某个文件项后，编辑器打开对应文件并进入可输入状态

### S2. Focus/Zen 切换与退出

- WHEN 用户按下 `Cmd/Ctrl+\\` 进入 Focus
- THEN 侧栏与 AI 面板不可见，且仍可连续输入
- AND THEN 用户按下 `Esc` 退出 Focus（若 AI 正在运行则先取消 AI）

