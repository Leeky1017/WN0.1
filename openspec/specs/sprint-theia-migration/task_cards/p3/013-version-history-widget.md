# 013: Version History Widget（版本历史面板）

Status: done  
Issue: #158  
PR: <fill-after-created>  
RUN_LOG: openspec/_ops/task_runs/ISSUE-158.md

## Context

“文字的 Git”是 WriteNow 的核心差异化。迁移到 Theia 后，需要把版本历史的 UI 与数据访问迁移为 Theia Widget，并确保与 TipTap Editor Widget 的保存/脏态一致。

## Requirements

- 实现 Version History Widget（列表/预览/回滚/对比的最小闭环，具体细节可后续增强）。
- 迁移版本数据读写（基于 SQLite schema 与现有逻辑复用），并通过 Theia RPC 暴露给 frontend。
- 与 TipTap Editor Widget 集成：保存后写入版本/快照，回滚可正确更新编辑器内容与 dirty 状态。

## Acceptance Criteria

- [x] 可在 Theia 中对当前文档创建至少一个版本记录，并在面板中可见。
- [x] 可执行一次回滚（或切换到历史版本）并反映到编辑器内容；dirty 状态与保存语义一致。
- [x] 版本读写失败可观测：错误信息明确且允许重试，不会导致编辑器卡死。

## Dependencies

- `006`
- `009`
- `008`

## Estimated Effort

- M（2–3 天）
