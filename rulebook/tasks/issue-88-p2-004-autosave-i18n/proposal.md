# Proposal: issue-88-p2-004-autosave-i18n

## Why
当前编辑器自动保存会在长文档持续输入时频繁触发 IPC 写入，增加卡顿风险；同时 UI 文案存在大量硬编码，导致中英切换不完整且难以在 CI 里防回归。

## What Changes
- 新增 `useDebouncedSave`：对保存请求做 debounce + 合并，且仅在 dirty 时触发落盘。
- `editorStore` 增强：保存请求合并/串行化，避免并发写入；非 dirty 时跳过落盘。
- 新增 `scripts/i18n-guard.mjs` 并接入 CI（通过 `npm run lint`）：禁止新增硬编码 UI 文本，给出定位与修复提示。
- 补齐/迁移现有 UI 文案到 i18n key，并完善 `zh-CN.json` / `en.json`。
- 新增 Playwright E2E：输入 → 等待 debounce → 断言保存落盘；切换语言 → UI 文本同步变化。

## Impact
- Affected specs: `openspec/specs/wn-frontend-deep-remediation/task_cards/p2/FRONTEND-P2-004-autosave-debounce-and-i18n.md`
- Affected code: `src/hooks/useDebouncedSave.ts`, `src/stores/editorStore.ts`, `src/components/**`, `scripts/i18n-guard.mjs`, `src/locales/*.json`, `tests/e2e/frontend-autosave.spec.ts`
- Breaking change: NO
- User benefit: 长文档编辑更流畅；保存更稳定；语言切换一致；CI 防止 i18n 回归。
