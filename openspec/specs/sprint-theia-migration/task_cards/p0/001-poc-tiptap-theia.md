# 001: PoC — Theia + TipTap（输入/焦点/快捷键）

Status: done  
Issue: #111  
PR: https://github.com/Leeky1017/WN0.1/pull/112  
RUN_LOG: openspec/_ops/task_runs/ISSUE-111.md

## Context

WriteNow 的核心体验依赖 TipTap/ProseMirror 编辑器；Theia 的核心体验依赖 Command/Keybinding/Shell。两者的事件与快捷键体系若无法协作，将直接否决迁移路线或迫使放弃 TipTap。

## Requirements

- 在 Theia 前端实现一个最小 TipTap Editor Widget（仅需支持编辑 markdown 文本）。
- 建立并实现“分层快捷键路由”策略（编辑器内 vs 全局命令）。
- 覆盖关键路径验证：输入法（中文 IME）、焦点切换、`Ctrl/Cmd+S`、`Ctrl/Cmd+Z`、`Ctrl/Cmd+Shift+Z`、`Esc`、`Ctrl/Cmd+K`。
- 输出 PoC 记录：结论、已知限制、失败语义、推荐实现策略（写入本 Sprint 设计文档或附加 PoC README）。

## Acceptance Criteria

- [x] 在 Theia 中能打开一个测试 `.md` 文件并进行输入（含中文输入法），不会出现卡死/丢字/焦点抖动。
- [x] `Ctrl/Cmd+S` 能触发保存且不会重复触发；保存成功后 dirty 状态清理。
- [x] `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z` 在编辑器聚焦时正确 Undo/Redo；编辑器失焦时不影响 Theia 全局快捷键体系。
- [x] 明确 `Ctrl/Cmd+K` 的归属与策略（全局命令面板 vs 编辑器内联 AI），并有可解释的实现方式。
- [x] PoC 代码与复现步骤可在本地一键运行（README/命令），并记录关键观察点。

## Dependencies

- 无（P0 起点）

## Estimated Effort

- M（2–3 天，取决于 Theia opener/widget 接线与快捷键冲突复杂度）
