# FRONTEND-P2-003: 心流保护（Typewriter / Paragraph Focus / Zen）

## Goal

提供写作心流保护模式：打字机滚动、段落聚焦、Zen 模式，降低 UI 干扰，让用户更容易进入沉浸写作状态。

## Dependencies

- `FRONTEND-P1-001`（布局重构）
- `FRONTEND-P1-002`（状态栏渐进披露）

## Expected File Changes

- Add: `src/components/Editor/modes/typewriter.ts`
- Add: `src/components/Editor/modes/focus.ts`
- Add: `src/components/Editor/modes/zen.ts`
- Update/Add: `src/stores/preferencesStore.ts`（模式开关持久化）
- Add: `tests/e2e/frontend-flow-modes.spec.ts`

## Acceptance Criteria

- [x] Typewriter：光标行保持视口垂直居中（容错可配置），且不抖动
- [x] Focus：非当前段落渐隐，强度可调，且不影响复制/选择
- [x] Zen：隐藏所有 chrome，仅保留文字与光标；鼠标到边缘可临时唤出 UI；退出后状态恢复

## Tests

- [x] Playwright E2E：开启/关闭各模式，断言 UI 显隐与状态恢复（含重启恢复偏好）
