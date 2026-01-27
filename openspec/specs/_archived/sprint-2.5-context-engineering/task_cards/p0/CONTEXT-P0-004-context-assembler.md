# CONTEXT-P0-004: ContextAssembler（四层组装器）

## Goal

实现 ContextAssembler 作为单一组装入口：按 Layer 顺序收集 chunk → 计算 token → 执行预算 → 渲染 Prompt（systemPrompt/userContent）→ 返回可调试的 AssembledContext。

## Dependencies

- `openspec/specs/sprint-2.5-context-engineering/spec.md`
- `openspec/specs/sprint-2.5-context-engineering/task_cards/p0/CONTEXT-P0-001-context-types-and-contracts.md`
- `openspec/specs/sprint-2.5-context-engineering/task_cards/p0/CONTEXT-P0-002-writenow-project-directory-and-loaders.md`
- `openspec/specs/sprint-2.5-context-engineering/task_cards/p0/CONTEXT-P0-003-token-budget-manager.md`

## Expected File Changes

- Add: `src/lib/context/assembler.ts`
- Add: `src/lib/context/prompt-template.ts`（最小可用：稳定前缀 + 动态后缀渲染；P1 再增强）
- Add: `src/lib/context/assembler.test.ts`
- Update/Add: `src/lib/ipc.ts` + `electron/ipc/`（读取 `.writenow/` 与对话摘要/检索接口）
- Add: `tests/e2e/sprint-2.5-context-engineering-assembler.spec.ts`

## Acceptance Criteria

- [ ] 组装顺序严格为 Rules → Settings → Retrieved → Immediate
- [ ] AssembledContext 中每个 chunk 均包含可追溯 source + tokenCount + layer
- [ ] 任何超预算请求必须被预算执行器裁剪到合规；若仍无法合规则拒绝发送并给出可理解错误与下一步建议
- [ ] Prompt 渲染满足 spec 的“稳定前缀 + 动态后缀”结构，且稳定段落顺序确定（利于 KV-Cache）

## Tests

- [ ] Vitest：固定输入下 assembled 结果稳定；验证 layer 顺序、预算裁剪、prompt 结构分区
- [ ] Playwright E2E：选中文本 → 触发 SKILL（或上下文预览）→ 断言 ContextViewer 分层展示与来源可见

## Effort Estimate

- L（3–4 天）

