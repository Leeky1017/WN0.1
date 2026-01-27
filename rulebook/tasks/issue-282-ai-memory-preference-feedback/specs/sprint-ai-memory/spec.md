# Delta Spec: sprint-ai-memory (Issue #282)

本任务卡实现并验收 `openspec/specs/sprint-ai-memory/spec.md` 的以下增量：

- 用户偏好自动注入（L117–126）
- 采纳/拒绝反馈追踪（L127–141）

## Requirements

### R1. `ai:skill:run` MUST 默认自动注入用户偏好

- 系统 MUST 在 SKILL 运行前自动拉取可注入偏好条目，并注入到稳定模板的“用户偏好”章节。
- 注入内容 MUST 确定性（排序/格式稳定），并受预算上限约束。
- 当无可用偏好条目时，系统 MUST 注入稳定空占位（避免模板漂移）。

### R2. 系统 MUST 追踪反馈事件并反哺偏好学习

- 系统 MUST 提供 `ai:skill:feedback`，记录 `accept | reject | partial` 事件到 SQLite（可审计）。
- `accept/reject` MUST 触发偏好学习更新（等价于调用 `memory:preferences:ingest` 或内部等价逻辑）。
- 失败语义 MUST 可判定（`IpcResponse<T>` + 稳定错误码），不得将异常堆栈透传到渲染进程。

## Scenarios

### S1. 默认自动注入与空占位稳定

- 输入：同一项目、同一偏好集合、多次触发同一 SKILL
- 期望：注入文本完全一致；当偏好为空时注入稳定空占位（结构不漂移）

### S2. 反馈落盘与学习联动可观测

- 输入：运行一次 SKILL → 调用 `ai:skill:feedback`（accept/reject/partial）
- 期望：SQLite 可查询到对应反馈记录；accept/reject 触发 `memory:preferences:ingest`（无 silent failure）

