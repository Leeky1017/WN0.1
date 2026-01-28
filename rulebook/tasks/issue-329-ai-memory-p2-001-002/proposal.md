# Proposal: issue-329-ai-memory-p2-001-002

## Why
长会话会导致上下文持续膨胀：历史运行/对话不断累积、人物/世界观等大设定常驻 prompt，既抬高成本也引入噪声。
本任务通过 **Full→Compact 压缩** 与 **文件化设定按需加载**，把“无限记忆”的负担从 prompt 移到本地持久化（SQLite + 文件引用），并保持可审计回溯。

## What Changes
- P2-001：为历史对话/运行结果提供 Full→Compact compaction（确定性序列化、可回溯引用、可观测压缩事件）。
- P2-002：将人物卡/世界观/风格指南等设定文件化存储，并在 SKILL 需要时按需读取与预算裁剪；注入带来源引用。

## Impact
- Affected specs:
  - `openspec/specs/sprint-ai-memory/spec.md`
  - `openspec/specs/api-contract/spec.md`（错误码与 IPC envelope 约束）
- Affected task cards:
  - `openspec/specs/sprint-ai-memory/task_cards/p2/P2-001-full-compact-compression.md`
  - `openspec/specs/sprint-ai-memory/task_cards/p2/P2-002-file-based-settings.md`
- Affected code:
  - `electron/ipc/context.cjs`
  - `electron/ipc/characters.cjs`
- Breaking change: NO（在既有 IPC 契约内增强；失败语义保持可判定）

