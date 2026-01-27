# P0-001: SKILL `context_rules` 声明式注入

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P0-001 |
| Phase | 0 - 注入规则 + 稳定前缀 |
| 优先级 | P0 |
| 状态 | Pending |
| 依赖 | 无 |

## 必读前置（执行前必须阅读）

- [ ] `openspec/specs/sprint-ai-memory/spec.md`
- [ ] `openspec/specs/sprint-ai-memory/design/04-skill-context-injection.md`
- [ ] `openspec/specs/api-contract/spec.md`（IPC Envelope + 错误码）
- [ ] repo-root `AGENTS.md`（交付硬约束：E2E、错误语义、留痕）

## 目标

让 SKILL 以声明式方式描述其所需上下文（`context_rules`），并由系统按需注入，避免“所有 SKILL 都塞满全部上下文”的 token 浪费与质量噪声。

## 任务清单

- [ ] 扩展 SKILL frontmatter：支持 `context_rules` 字段（mapping）
- [ ] 在 `skills` 的解析/校验流程中校验 `context_rules`（非法字段/非法类型返回 `INVALID_ARGUMENT`）
- [ ] 将 `context_rules` 持久化到 SQLite（稳定 JSON / 结构化 JSON；序列化 MUST 确定性）
- [ ] renderer 的 ContextAssembler 按 `context_rules` 选择性拉取：
  - [ ] surrounding（选区前后文裁剪）
  - [ ] style guide / project settings（按需加载，带引用）
  - [ ] characters（按需加载，带引用）
  - [ ] recent summary（按需加载）
- [ ] 为“注入结果”提供可审计的最小元数据（例如注入项 ID / 文件引用列表）
- [ ] 增加 E2E：使用真实 UI + 真实持久化，验证不同 SKILL 的注入差异可观测且符合规则

## 验收标准

- [ ] `context_rules` 缺失时：行为保持向后兼容（默认不注入额外上下文，或使用稳定默认值；二选一需在实现中固定）
- [ ] `context_rules` 非法时：返回 `IpcResponse.ok=false` 且 `error.code="INVALID_ARGUMENT"`（无异常堆栈泄漏）
- [ ] 相同 SKILL 在相同输入下，注入选择结果可复现（排序/裁剪稳定）
- [ ] E2E 覆盖：至少包含“润色/扩写/一致性检查”三类 SKILL 的注入差异路径

## 产出

- `context_rules` 规范落地（解析/校验/持久化）
- renderer ContextAssembler 的按需注入实现
- E2E 测试用例与运行证据（RUN_LOG）

