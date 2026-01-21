# Proposal: issue-69-context-debug-panel

## Why
当前 AI SKILL 调用对“实际发送了哪些上下文、各层 token 占用、为何发生裁剪”缺乏可视化证据，导致结果偏差时难以定位（规则注入是否生效/Settings 是否被裁掉/Immediate 是否超标等）。需要在 AI 面板提供上下文调试入口，做到“可查看、可解释、可复制”，并在发生预算裁剪时提供明确的裁剪证据，避免 silent trimming。

## What Changes
- AI 面板 Diff 区域新增“查看上下文”展开面板（分层展示 Rules/Settings/Retrieved/Immediate）
- 展示 assembled prompt（systemPrompt/userContent）与 per-layer token 统计、总计 used/limit
- 当 TokenBudgetManager 发生裁剪（removed/compressed）时，展示裁剪摘要（删了哪些/原因/节省 token）
- 对可能出现的敏感信息做 UI 脱敏（API key/token 等）
- 新增 Playwright E2E 覆盖上下文面板的分层展示、裁剪证据与脱敏规则

## Impact
- Affected specs: `openspec/specs/sprint-2.5-context-engineering/task_cards/p2/CONTEXT-P2-011-context-viewer-ui.md`, `openspec/specs/sprint-2.5-context-engineering/task_cards/p2/CONTEXT-P2-012-kv-cache-optimization.md`
- Affected code: `src/components/AI/ContextDebugPanel.tsx`, `src/components/AI/DiffView.tsx`, `src/stores/aiStore.ts`, `src/lib/context/assembler.ts`, `tests/e2e/sprint-2.5-context-engineering-context-viewer.spec.ts`
- Breaking change: NO（仅新增 UI/调试能力；不影响既有 SKILL 交互链路）
- User benefit: 用户可直观看到每次请求的完整上下文与 token 预算执行结果，快速定位“为什么少了某些上下文/为什么输出偏了”的根因
