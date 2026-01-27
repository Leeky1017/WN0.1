# CONTEXT-P1-007: PromptTemplateSystem（稳定前缀 + KV-Cache 友好）

Status: done
Issue: #61
PR: https://github.com/Leeky1017/WN0.1/pull/65
RUN_LOG: openspec/_ops/task_runs/ISSUE-61.md

## Goal

实现可版本化的 PromptTemplateSystem：稳定前缀由产品身份/skill 定义/输出格式/Rules 组成；动态内容（Settings/Retrieved/Immediate）统一放在后缀并按层级顺序注入，确保可复用与可观测。

## Dependencies

- `openspec/specs/sprint-2.5-context-engineering/task_cards/p0/CONTEXT-P0-004-context-assembler.md`
- `openspec/specs/sprint-2-ai/spec.md`（SKILL prompt/输出格式约束）

## Expected File Changes

- Add: `src/lib/context/prompt-template.ts`（从 P0 最小实现升级为可版本化模板）
- Update: `src/lib/context/assembler.ts`（强制稳定段落顺序与结构）
- Add: `src/lib/context/prompt-template.test.ts`
- Add: `tests/e2e/sprint-2.5-context-engineering-prompt-template.spec.ts`

## Acceptance Criteria

- [x] 稳定前缀中不得出现动态元素（时间戳/随机数/不稳定排序）
- [x] Rules 的渲染顺序固定且可追溯（按文件名排序，并标注来源文件）
- [x] 动态后缀严格按 Settings → Retrieved → Immediate 的顺序注入
- [x] PromptTemplate 具备版本字段（便于未来迭代不破坏回溯）

## Tests

- [x] Vitest：同输入多次渲染稳定前缀完全一致；Rules 文件顺序稳定
- [x] Playwright E2E：连续两次触发上下文预览 → 断言稳定前缀一致（可通过 UI 提供 prefix hash 证据）

## Effort Estimate

- M（2–3 天）
