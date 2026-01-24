# Theia Migration / Version History Widget — Spec Delta

## Purpose

在 Theia 迁移 Phase 3 中交付“版本历史（文字的 Git）”的最小闭环：快照列表、内容预览、Diff 对比与回滚，并与 TipTap Editor + AI Panel 接线，确保 AI 修改可追溯可恢复。

## Requirements

### Requirement: The system MUST show snapshots for the active document

The system MUST provide a Version History panel that lists snapshots for the currently active editor document.

#### Scenario: List snapshots
- **GIVEN** Version History 面板已打开且存在一个 active editor
- **WHEN** 系统加载/刷新版本历史
- **THEN** 面板 MUST 展示该文档的快照列表（时间倒序），并可刷新

#### Scenario: Preview snapshot content
- **GIVEN** Version History 面板已加载快照列表
- **WHEN** 用户选择任意快照
- **THEN** 系统 MUST 显示该快照的内容与元信息（name/createdAt/actor/reason）

### Requirement: The system MUST support diff between two snapshots

The system MUST allow users to compare any two snapshots of the same document and render a readable diff.

#### Scenario: Compare snapshots
- **GIVEN** 用户已选择两个快照
- **WHEN** 用户触发对比
- **THEN** 系统 MUST 展示统一 diff，并高亮新增/删除/修改（最小可用：行级）

### Requirement: The system MUST support rollback with clear failure semantics

The system MUST support rolling back the active editor content to a chosen snapshot, with an explicit confirmation and observable/retryable errors.

#### Scenario: Rollback to snapshot
- **GIVEN** 用户在面板中选择一个快照
- **WHEN** 用户点击回滚并确认
- **THEN** 系统 MUST 将内容恢复到该快照；编辑器 dirty 状态与保存语义一致

#### Scenario: Snapshot failures are observable and recoverable
- **GIVEN** 用户正在使用版本历史能力
- **WHEN** snapshot list/create/restore/diff 任一操作失败
- **THEN** UI MUST 显示可定位的错误信息且允许用户重试，不得 silent failure 或卡死在 loading

### Requirement: The system MUST create pre/post snapshots on AI apply

The system MUST create a pre-apply snapshot and a post-apply snapshot when users apply AI changes, so users can diff/rollback.

#### Scenario: Apply AI changes
- **GIVEN** 用户在 AI Panel 中得到一段可应用的建议
- **WHEN** 用户点击 Apply
- **THEN** 系统 MUST 自动创建修改前快照与修改后快照（actor=`auto`/`ai`），以支持 diff/rollback
