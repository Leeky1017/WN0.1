# Proposal: issue-279-ai-memory-prompt-caching

## Why
为降低上下文 token 成本并提升输出质量，需要让不同 SKILL “只拿它需要的上下文”（`context_rules`），同时用稳定前缀（Stable Prefix）最大化 KV-cache 复用，并接入 Provider 原生 Prompt Caching 以减少重复请求开销。

## What Changes
- 扩展 SKILL frontmatter：支持 `context_rules`，并在解析/索引流程做严格校验（未知字段/非法类型 → `INVALID_ARGUMENT`）。
- 实现 Stable Prefix（Layer 0–3 固定顺序 + 确定性序列化），并在 `ai:skill:run` 返回 `stablePrefixHash`（稳定验收口径）与 `promptHash`（全量诊断）。
- Anthropic 接入 Prompt Caching：对稳定 system 前缀启用 `cache_control: { type: 'ephemeral' }`，避免把动态/敏感内容放入可缓存块。
- 增加 E2E：验证不同 SKILL 的注入差异可观测（refs project-relative）与 `stablePrefixHash` 的稳定性。

## Impact
- Affected specs:
  - `openspec/specs/sprint-ai-memory/spec.md`（P0-001 / P0-002）
  - `openspec/specs/sprint-open-source-opt/spec.md`（P0-001）
  - `openspec/specs/api-contract/spec.md`（IPC envelope + 错误码约束）
- Affected code:
  - `electron/ipc/skills.cjs`
  - `electron/ipc/ai.cjs`
  - `writenow-frontend/src/lib/ai/*`（context assembler + stable prompt builder）
  - `electron/ipc/contract/ipc-contract.cjs` → `src/types/ipc-generated.ts`（同步到各端）
- Breaking change: NO（新增字段为向后兼容；对非法 `context_rules` 由静默忽略升级为显式报错）
- User benefit: 更低成本/更快响应（缓存命中），更少噪声上下文（按需注入），更强可观测性（hash/refs）。
