# Delta Spec: sprint-ai-memory (Issue #279)

本任务卡实现并验收 `openspec/specs/sprint-ai-memory/spec.md` 的以下增量：

- `context_rules` 注入（L68–94）
- Stable Prefix + `stablePrefixHash`（L95–116）

## Requirements

### R1. SKILL MUST 支持 `context_rules` 且严格校验

- `context_rules` MUST 为 mapping（对象）。
- 未知字段 MUST 拒绝（返回 `INVALID_ARGUMENT`）。
- `integer` 字段 MUST 为有限整数且 `>= 0`。
- 缺失 `context_rules` 时 MUST 使用稳定默认值（等价于“不注入额外上下文”）。

### R2. Stable Prefix MUST 固定结构与顺序（Layer 0–3）

- Layer 0–3 MUST 以固定章节顺序构建（空占位稳定存在）。
- 稳定前缀 MUST NOT 包含时间戳 / requestId / 随机数等动态字段。
- 系统 MUST 返回 `stablePrefixHash`（仅基于 Layer 0–3），并同时返回 `promptHash`（全量）。

## Scenarios

### S1. 非法 `context_rules` 可判定失败

- 输入：`context_rules` 非对象 / 包含未知字段 / 包含非法类型
- 期望：`IpcResponse.ok=false` 且 `error.code="INVALID_ARGUMENT"`（不泄漏堆栈）

### S2. `stablePrefixHash` 不受动态层影响

- 输入：同一 skill，同一静态条件；仅变更选区或用户指令
- 期望：`stablePrefixHash` 保持一致；`promptHash` 可变化

