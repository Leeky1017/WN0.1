# P0-001: 启用 OpenAI/Anthropic 原生 Prompt Caching

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P0-001 |
| Phase | 0 - LLM 成本优化 |
| 优先级 | P0 |
| 状态 | Todo |
| 依赖 | 无 |

## 必读前置（执行前必须阅读）

- [ ] `openspec/specs/sprint-open-source-opt/spec.md`
- [ ] `openspec/specs/sprint-open-source-opt/design/01-prompt-caching.md`
- [ ] `openspec/specs/api-contract/spec.md`（错误码与 Envelope）

## 目标

- 在不引入自建缓存层的前提下，通过 Provider 原生缓存降低 token 成本。
- 保证缓存不可用/命中率低时可自动回退并可观测。

## 任务清单

- [ ] 盘点当前 AI 请求路径（Anthropic / OpenAI）与 prompt 组成（稳定前缀、工具定义、动态上下文）。
- [ ] Anthropic：对稳定 system 前缀启用 `cache_control: { type: 'ephemeral' }`。
- [ ] OpenAI：确保“可缓存前缀”稳定（不引入随机字段），并验证 prompt 结构满足缓存命中条件。
- [ ] 增加观测：记录命中/未命中（若可得）、节省 token 估算、请求耗时（禁止落盘完整 prompt）。
- [ ] 为缓存开关提供配置入口（默认开启；必要时可关闭以排障）。
- [ ] 为失败/超时/取消提供稳定错误码（`UPSTREAM_ERROR`/`TIMEOUT`/`CANCELED`），并确保 pending 状态被清理。

## 验收标准

- [ ] 在相同上下文重复调用时，成本/耗时出现可解释的下降（至少具备可观测证据：日志/指标）。
- [ ] 缓存不可用时请求仍可完成且返回 `IpcResponse<T>` 的可判定错误（不穿透异常/堆栈）。
- [ ] E2E 用例覆盖“缓存开启/关闭”与“失败/超时/取消”分支。

## 产出

- 代码：Provider 调用层的 Prompt Caching 接入（最小改动）。
- 文档：记录缓存策略、可观测指标与排障路径。
- 测试：新增/完善 Playwright E2E 用例与必要的单元测试。
