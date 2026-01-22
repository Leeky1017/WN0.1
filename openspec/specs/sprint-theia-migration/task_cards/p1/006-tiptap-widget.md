# 006: TipTap Editor Widget（.md 绑定 + Save/Dirty）

## Context

PoC 通过后，需要把 TipTap 从“实验代码”升级为 Theia 内的正式 Editor Widget：可由 File Explorer 打开 `.md`、可保存、可展示 dirty 状态，并遵循统一的快捷键/命令策略。

## Requirements

- 将 PoC Editor Widget 结构化为可维护实现（widget/opener/contribution 拆分清晰）。
- 实现 `.md` 文件类型绑定（File Explorer 打开 `.md` 默认进入 TipTap）。
- 接入 Save/Dirty 生命周期（dirty 显示、保存成功清理、保存失败可重试且可观测）。
- 解决焦点/快捷键冲突（按 `design/tiptap-integration.md` 策略实现）。

## Acceptance Criteria

- [ ] `.md` 文件可通过 File Explorer 打开并在 TipTap 中编辑。
- [ ] dirty 状态与保存行为一致：修改后标记 dirty；保存成功清理；保存失败提示并保留 dirty。
- [ ] 快捷键冲突无高频 bug（至少覆盖：IME、Save、Undo/Redo、Esc、Cmd/Ctrl+K 的策略落地）。

## Dependencies

- `001`
- `004`
- `007`（布局插槽可并行，但最终需要承载 editor 区域）

## Estimated Effort

- L（3–5 天）

