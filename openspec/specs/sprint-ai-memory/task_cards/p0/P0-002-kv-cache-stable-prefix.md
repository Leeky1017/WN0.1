# P0-002: KV-cache 稳定前缀模板（Stable Prefix）

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P0-002 |
| Phase | 0 - 注入规则 + 稳定前缀 |
| 优先级 | P0 |
| 状态 | Pending |
| 依赖 | P0-001 |

## 必读前置（执行前必须阅读）

- [ ] `openspec/specs/sprint-ai-memory/design/01-memory-layers.md`
- [ ] `openspec/specs/sprint-ai-memory/design/02-kv-cache-optimization.md`
- [ ] `openspec/specs/api-contract/spec.md`

## 目标

通过“固定模板 + Append-only + 确定性序列化”构建稳定的 system prompt 前缀，使同一 SKILL 类型在相同静态上下文下具备字节级稳定的 prefix（为 KV-cache 复用创造条件）。

## 任务清单

- [ ] 在 renderer 增加 stable system prompt builder（固定章节顺序，空占位固定）
- [ ] 将 Layer 0–3 固定为稳定前缀（结构固定；内容变化必须确定性序列化）
- [ ] 明确“动态信息只追加到末尾”的约束（Append-only），并加入防回归测试
- [ ] 增加稳定序列化工具（排序规则固定：JSON key、列表排序、空格/换行）
- [ ] 记录并暴露 `prefixHash`（system prompt hash）用于验证/诊断（可复用 `ai.cjs` 返回值）
- [ ] 增加 E2E：同一 SKILL 在相同静态条件下连续运行，`prefixHash` 保持一致（或等价可观测信号）

## 验收标准

- [ ] stable template 章节顺序固定，且在“无偏好/无设定”情况下仍存在稳定空占位
- [ ] 相同静态上下文下，system prompt 前缀字节级一致（`prefixHash` 一致）
- [ ] 任何异常/非法输入不会导致 silent failure；IPC 返回稳定错误码并清理 pending 状态
- [ ] E2E 通过并写入 RUN_LOG 证据

## 产出

- stable system prompt builder（renderer）
- 确定性序列化工具/规则
- prefix stability 的自动化验证（E2E +/或 snapshot）

