# Proposal: issue-282-ai-memory-preference-feedback

## Why
当前 `ai:skill:run` 链路具备 `user_memory` 与 `memory:injection:preview` 的基础能力，但“偏好自动注入”与“采纳/拒绝反馈闭环”仍缺少默认路径：

- 用户需要显式操作才能把偏好带入每次 SKILL 运行（体验不连续，且容易遗漏）。
- 缺少可审计的反馈入口（accept/reject/partial）与落盘记录，无法稳定反哺偏好学习。

本任务将完成 sprint-ai-memory Phase 1 的两项关键增量：P1-001（偏好自动注入）+ P1-002（反馈追踪）。

## What Changes
- 在 `ai:skill:run` 调用前自动拉取可注入偏好，并注入到稳定模板的“用户偏好”章节（确定性格式 + 预算上限 + 空占位）。
- 新增 `ai:skill:feedback` IPC handler：记录 `accept | reject | partial` 反馈事件到 SQLite，并对 `accept/reject` 触发 `memory:preferences:ingest`。
- 更新 IPC contract（新增 channel/type）并重新生成 `src/types/ipc-generated.ts`（含 Theia 侧镜像文件）。
- 补充 E2E 覆盖偏好注入与反馈追踪；将命令与关键输出写入 RUN_LOG。

## Impact
- Affected specs: `openspec/specs/sprint-ai-memory/spec.md`（L117–141）
- Affected code:
  - `electron/ipc/memory.cjs`
  - `electron/ipc/ai.cjs`
  - `electron/ipc/contract/ipc-contract.cjs`
  - `src/types/ipc-generated.ts`
  - `writenow-theia/writenow-core/src/common/ipc-generated.ts`
  - SQLite schema（新增 feedback 表）
  - `tests/e2e/*`（新增/更新）
- Breaking change: NO（新增通道/字段，保持向后兼容）
- User benefit: 默认“零操作个性化”+ 可审计反馈闭环，且失败语义与错误码稳定可诊断（无 silent failure）。

