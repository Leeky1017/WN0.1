# FRONTEND-P2-004: 自动保存 debounce + i18n 全覆盖门禁

Status: done
Issue: #88
PR: <fill-after-created>
RUN_LOG: openspec/_ops/task_runs/ISSUE-88.md

## Goal

优化自动保存避免频繁 IPC，并把 i18n 覆盖率变成 CI 门禁：所有可见 UI 文本必须通过 i18n key 管理。

## Dependencies

- `openspec/specs/sprint-4-release/spec.md`（如 i18n 基础已在 Sprint 4 定义/实现）

## Expected File Changes

- Add/Update: `src/hooks/useDebouncedSave.ts`
- Update: `src/stores/editorStore.ts`（isDirty + save batching）
- Update: `electron/ipc/`（如需增量保存协议）
- Update: `src/locales/zh-CN.json`, `src/locales/en.json`
- Add: `scripts/i18n-guard.mjs`（或 ESLint rule 集成）
- Add: `tests/e2e/frontend-autosave.spec.ts`

## Acceptance Criteria

- [x] 长文档持续输入时保存请求被 debounce/合并，且仅在 dirty 时触发落盘
- [x] 应用显示文本在 zh-CN/en 两套语言下完整可切换（无硬编码中文散落）
- [x] 新增硬编码 UI 文本会导致 CI 失败并提示修复方式

## Tests

- [x] Playwright E2E：输入 → 等待 debounce → 断言保存状态变化；切换语言 → UI 文本同步变化
