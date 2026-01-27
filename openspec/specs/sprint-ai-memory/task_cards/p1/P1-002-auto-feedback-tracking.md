# P1-002: 采纳/拒绝自动追踪（反馈 → 学习）

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P1-002 |
| Phase | 1 - 偏好自动化 |
| 优先级 | P1 |
| 状态 | Pending |
| 依赖 | P1-001 |

## 必读前置（执行前必须阅读）

- [ ] `openspec/specs/sprint-ai-memory/design/03-user-preference-learning.md`
- [ ] `openspec/specs/api-contract/spec.md`（错误码：`TIMEOUT`/`CANCELED`）
- [ ] `electron/ipc/ai.cjs`, `electron/ipc/memory.cjs`

## 目标

当用户对 SKILL 输出执行“采纳/拒绝/部分采纳”时，系统自动记录反馈事件并触发偏好学习更新，实现隐式学习闭环。

## 任务清单

- [ ] 新增 IPC：`ai:skill:feedback`（payload 含 runId / action / projectId / evidenceRef）
- [ ] 将 `accept/reject` 映射为可审计的反馈记录（SQLite）
- [ ] 在 `ai:skill:feedback` 内部调用 `memory:preferences:ingest`（或等价内部函数）更新偏好
- [ ] 失败语义完整：取消/超时必须返回 `CANCELED`/`TIMEOUT` 且清理 pending 状态
- [ ] 更新 IPC contract（`src/types/ipc-generated.ts`）并通过 CI 校验
- [ ] 增加 E2E：运行一次 SKILL → 采纳/拒绝 → 再次运行同类 SKILL，验证偏好变化可观测

## 验收标准

- [ ] 反馈事件可追溯（可查询到 runId→action→evidence 引用）
- [ ] `accept/reject` 能触发偏好更新（无 silent failure）
- [ ] IPC 错误码稳定且可诊断（不泄漏异常堆栈）
- [ ] E2E 通过并写入 RUN_LOG 证据

## 可观测信号 / 验证方式

- 反馈写入必须可验证：
  - `ai:skill:feedback` 返回可识别的结果（例如 `feedbackId` 或写入条数）
  - DB 中可查询 `runId -> action -> evidenceRef`
- 学习联动必须可观测：
  - 再次运行同类 SKILL 时，`injected.memory` 或 `stablePrefixHash` 发生符合预期的变化（可解释）

## E2E 场景（建议步骤）

- [ ] 运行一次改写类 SKILL，记录 `runId`
- [ ] 通过 UI 执行“采纳”或“拒绝”，触发 `ai:skill:feedback`
- [ ] 断言：反馈记录落盘（SQLite 可查询到 runId/action）
- [ ] 再次运行同类 SKILL
- [ ] 断言：注入偏好/稳定前缀发生变化（例如 `injected.memory` 更新或 `stablePrefixHash` 更新）

## 产出

- `ai:skill:feedback` IPC handler
- 反馈持久化记录 + 偏好学习联动
- IPC contract 更新与 E2E 覆盖
