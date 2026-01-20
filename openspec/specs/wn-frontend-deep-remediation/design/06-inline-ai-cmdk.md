# Design: Inline AI (Cmd/Ctrl+K)

## UX Contract

- 用户在编辑器内触发 `Cmd/Ctrl+K`，出现一个“贴近光标”的轻量输入框。
- 目标是减少“写字区 ↔ 聊天区”视线切换成本，让 AI 更像编辑器的一个工具而非另一个应用。

## Key Interactions

- `Cmd/Ctrl+K`: open
- `Esc`: close
- `Enter`: submit
- `↑/↓`: 选择快捷操作（续写/润色/翻译/解释）

## Result Application

- 结果必须可确认：插入/替换/取消
- 结果必须可撤销（Undo）并生成版本快照（与现有版本系统一致）

## Failure Modes

- 网络失败/取消：不改变正文；给出可理解错误与重试
- 上下文过大：必须提示并允许用户缩小范围（例如“仅选区/段落”）

