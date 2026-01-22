# TipTap Integration: Focus + Shortcut + Save/Dirty

> Why: TipTap/ProseMirror 自带输入与快捷键体系；Theia 也有全局命令与快捷键注册。迁移能否成功，取决于两者是否能在“焦点 + 快捷键 + 保存/脏态”上稳定协作且可解释。

## Goals

- 在 Theia 中提供 TipTap Editor Widget，用于打开与编辑 `.md` 文件。
- Markdown 作为 SSOT：磁盘文件内容为权威，TipTap 仅是视图/交互层。
- 建立可解释、可调试、可扩展的快捷键冲突治理策略。
- 接入 Theia 的 Save/Dirty 生命周期：状态一致、失败可观测、可恢复。

## Focus Model

### Context Keys（建议集中定义）

示例（命名可调整，但必须集中管理）：

- `writenow.editorFocus`：active TipTap editor 是否拥有焦点
- `writenow.editorMode`：`markdown` | `richtext`（若保留双模式）
- `writenow.editorReadonly`：是否只读

### Focus lifecycle

- editor mount 时注册 DOM focus/blur 监听与 widget-level focus tracker。
- focus 时设置 context keys，并发布 active editor id（用于命令 handler 定位目标 editor）。
- blur 时清理 `writenow.editorFocus`（注意 editor 间快速切换，避免抖动）。
- 多 editor 同时打开时，仅 active editor 允许断言 focus context keys。

## Shortcut Routing Policy（分层路由）

### Ownership rules

- **Theia-owned（全局命令）**：保存、打开、搜索、命令面板、导航、布局切换等。
- **TipTap-owned（编辑语义）**：文本输入、格式化、段落操作等。
- **Shared（桥接命令）**：Save/Undo/Redo 等“既是编辑器语义又是 IDE 语义”的命令必须显式桥接（一个 command id，一套可解释策略）。

### Resolution order (recommended)

1) 在 editor keydown 时，先检查是否命中 **Theia 保留快捷键**（见下）。
2) 命中则执行 Theia command，并 `preventDefault()`（避免双触发）。
3) 否则交给 TipTap/ProseMirror keymap 处理。

这确保全局快捷键在 editor 聚焦时仍可工作，同时不牺牲编辑器内部快捷键体验。

### Reserved shortcuts（示例）

建议至少保留给 Theia（即使 editor 聚焦）：

- `Ctrl/Cmd+S` 保存
- `Ctrl/Cmd+P` Quick Open（如启用）
- `Ctrl/Cmd+Shift+P` Command Palette
- `Ctrl/Cmd+F` 查找
- `Ctrl/Cmd+Shift+F` 全局搜索（如启用）
- `Esc` 关闭浮层/退出模式（需定义优先级）

`Ctrl/Cmd+K` 的归属必须由产品/UX 决策（命令面板 vs 内联 AI），并在 PoC 中验证其可实现性。

## Composition and IME Safety

- IME composition 期间，除保留快捷键外不应拦截 keydown（避免中文输入丢字/卡死）。
- editor 应显式暴露 composition 状态，供 keybinding resolver 做安全分支。

## Save + Dirty Lifecycle

### Saveable integration

TipTap Editor Widget 必须实现/适配 Theia 的 Saveable/dirty 机制：

- dirty：由 TipTap transaction 驱动，但必须节流/合并（避免每个字符触发昂贵的 UI/状态更新）。
- save：通过 Theia 文件系统 API 写回 markdown；保存成功清理 dirty；保存失败必须返回明确错误并保留 dirty 以允许重试。

### Failure semantics (must be observable)

- 写盘失败：必须以可读错误提示 + 稳定错误码暴露给 UI（禁止 silent failure）。
- 取消/超时：如果保存支持取消/超时，必须区分状态并清理 pending。

## Implementation Notes（治理要求）

- 禁止隐式注入：CommandRegistry/KeybindingRegistry/ContextKeyService 等依赖必须通过构造参数/props 显式传入（符合 `AGENTS.md`）。
- 所有 editor-specific command 也应注册为 Theia command（即使 handler 最终委托给 TipTap），避免出现“只有编辑器知道的黑箱快捷键”。

## Test Matrix (PoC 必测)

- 焦点：editor → sidebar → editor 的 context keys 更新正确。
- 快捷键：`Ctrl/Cmd+S` 在 editor 内触发保存；bold/italic 等编辑器快捷键仍有效。
- IME：composition 输入不被全局快捷键打断（除保留快捷键外）。

