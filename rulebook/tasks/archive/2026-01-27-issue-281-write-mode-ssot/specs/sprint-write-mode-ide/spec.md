# sprint-write-mode-ide delta (ISSUE-281)

本任务为 `openspec/specs/sprint-write-mode-ide/spec.md` 的实现性增量说明，聚焦 Slot A：

- Task 2A.1：P0-001（Write Mode SSOT）
- Task 2A.2：P0-002（保存状态贯穿）

## Delta requirements

### D1: Write Mode 主路径必须移除 demo/stub（SSOT）

- **MUST** `writenow-frontend` 的主编辑画布使用 `TipTapEditor`，禁止 `components/editor/Editor.tsx`（contentEditable demo）进入主路径。
- **MUST** Explorer 使用真实 `file:*` 通道（至少 `file:list` + `file:read`），禁止静态 mock 列表作为主路径数据源。
- **MUST** AI Panel 连接真实编排（`features/ai-panel/useAISkill.ts`），禁止 demo `components/ai-panel/AIPanel.tsx` 继续作为主路径入口。

### D2: 保存/dirty/连接状态必须有唯一真相并贯穿 UI

- **MUST** 保存状态 SSOT：
  - 全局（当前文件）以 `statusBarStore.saveStatus` 为准：`unsaved | saving | saved | error`
  - per-file dirty/save 状态以 `editorFilesStore` 为准（用于 FileTree modified dot）
- **MUST** Header、StatusBar、FileTree 不得各自维护局部状态机（禁止双状态）。
- **MUST** 保存失败必须可观测：稳定 `error.code`（`IpcErrorCode`）+ 可理解 `error.message`，并提供重试入口，且不得卡死在 `saving`。
- **MUST** 连接断开时明确降级为“不可保存/只读”，不得 silent failure。

## Scenarios (acceptance-oriented)

### S1: 启动后进入可写状态（引用 `spec.md` L65-78）

- **WHEN** 用户进入 Write Mode
- **THEN** 画布存在可输入的 `data-testid="tiptap-editor"`
- **AND THEN** Explorer 展示真实 `file:list` 返回的文件（来自后端）

### S2: 保存状态稳定转换（引用 `spec.md` L144-157）

- **WHEN** 用户在 `tiptap-editor` 输入
- **THEN** UI MUST 从 `Unsaved → Saving → Saved` 稳定转换（Header/StatusBar 一致）
- **AND** 对应文件在 FileTree 显示 modified dot（dirty）并在保存成功后清除

### S3: 断连与失败语义

- **WHEN** 后端未连接/连接断开
- **THEN** UI MUST 显示“不可保存/只读”并阻止落盘调用；若发生保存失败，必须显示 `Error` 且可重试，且 pending 状态被清理

## Stable selectors

- `data-testid="tiptap-editor"`
- `data-testid="wm-save-indicator"`
- `data-testid="wm-file-tree"`
- `data-testid="ai-panel"`

