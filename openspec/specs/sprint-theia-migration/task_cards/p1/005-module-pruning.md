# 005: Module Pruning（裁剪非必要 IDE 模块）

## Context

WriteNow 的定位是“创作者的 IDE”，目标是精简但可靠。Theia 默认集成许多开发者 IDE 模块（调试器、终端、Git、语言服务器等），会增加包体、复杂度与故障面，且干扰 UX。

## Requirements

- 明确需要保留的最小模块集合（shell/layout、filesystem/workspace、commands/keybindings、preferences/storage）。
- 禁用/移除不需要的模块：调试器、终端、Git 面板、语言服务器、问题面板、任务运行器等。
- 验证裁剪后应用仍能稳定启动，且核心链路（打开文件、编辑、保存）不受影响。

## Acceptance Criteria

- [ ] 被裁剪模块清单明确且可追溯（配置/依赖层面可定位）。
- [ ] 裁剪后应用可启动且无明显 console error；核心工作流仍可用。
- [ ] 包体与启动速度（如有测量）有明确收益或至少不恶化；若无法测量需说明原因与后续补测计划。

## Dependencies

- `004`

## Estimated Effort

- M（1–2 天，取决于依赖树与 Theia bundling 约束）

