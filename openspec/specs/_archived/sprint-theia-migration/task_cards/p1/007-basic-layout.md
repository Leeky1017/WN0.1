# 007: Basic Layout + Branding（基础布局与品牌）

Status: done  
Issue: #137  
PR: https://github.com/Leeky1017/WN0.1/pull/138  
RUN_LOG: openspec/_ops/task_runs/ISSUE-137.md

## Context

迁移期 UI 不追求完整美术，但必须建立清晰的布局骨架与品牌入口，确保后续面板（AI/版本/知识图谱）有稳定插槽，且避免“默认 IDE 外观”误导用户心智。

## Requirements

- 配置应用品牌（名称/图标/基础主题入口/窗口标题等）。
- 配置基础布局：左侧导航/侧边栏、主编辑区、右侧面板区（为 AI/版本/知识图谱预留）。
- 明确并落地 widget 的挂载位置与可扩展策略（后续任务无需重排骨架）。

## Acceptance Criteria

- [x] 启动后布局骨架稳定：左侧区域、主编辑区、右侧面板区可见且可容纳后续 widget。
- [x] 品牌信息不再是 Theia 默认样式（至少名称/图标/标题可辨识）。
- [x] 为后续面板提供明确插槽与接线点（文档 + 代码结构）。

## Dependencies

- `004`
- `005`（裁剪后再确定布局最终形态）

## Estimated Effort

- M（1–2 天）
