# Proposal: issue-134-tiptap-widget

## Why
Phase 1 需要把 PoC 中验证过的 TipTap Editor Widget 迁移到正式应用 `writenow-theia/`，并补齐 Save/Dirty、Markdown SSOT、快捷键分层路由与可观测失败语义，才能作为后续 editor/IPC/data 迁移的稳定基座。

## What Changes
- 将 PoC 代码（widget/factory/open handler）迁移到 `writenow-theia/writenow-core/src/browser/` 并按 `writenow-core` 模块结构注册。
- 在 `writenow-core/package.json` 增加 TipTap 相关依赖，并确保 Browser/Electron 目标可用。
- 实现 `.md` 文件类型绑定：File Explorer 双击 `.md` 默认以 TipTap widget 打开。
- 接入 Theia Saveable：dirty 标记、保存成功清理、保存失败提示且保持 dirty 允许重试。
- 落地 `openspec/specs/sprint-theia-migration/design/tiptap-integration.md` 的快捷键治理策略（保留快捷键优先 Theia，编辑语义优先 TipTap；IME composition 安全分支）。
- 更新 Sprint task card + RUN_LOG（含 Browser/Electron 实机验证证据）。

## Impact
- Affected specs:
  - `openspec/specs/sprint-theia-migration/design/tiptap-integration.md`
  - `openspec/specs/sprint-theia-migration/task_cards/p1/006-tiptap-widget.md`
- Affected code:
  - `writenow-theia/writenow-core/src/browser/*tiptap*`
  - `writenow-theia/writenow-core/package.json`
- Breaking change: NO
- User benefit: `.md` 文件获得可用的富文本编辑体验，同时保持 Markdown 作为唯一事实来源，并且 IDE 级保存/快捷键行为可预测。
