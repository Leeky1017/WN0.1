# P2-003: 写作目标系统（项目/每日目标 + 进度条）

Status: pending

## Goal

提供写作目标系统（最小可用）：每日目标 + 项目目标（可选），并在现有统计/状态栏 UI 上可视化进度，配置可持久化且不引入后端复杂度（优先前端本地持久化）。

## Dependencies

- `openspec/specs/writenow-frontend-gap-analysis/spec.md`
- `openspec/specs/writenow-frontend-gap-analysis/design/05-p2-professional-writing-features.md`

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-frontend/src/stores/writingGoalsStore.ts`（或复用现有 settings store） |
| Update | `writenow-frontend/src/components/layout/StatsBar.tsx` |
| Update | `writenow-frontend/src/features/settings/sections/AppearanceSection.tsx` 或新增 `WritingGoalsSection.tsx` |
| Update | `writenow-frontend/src/locales/zh-CN.json` |
| Update | `writenow-frontend/src/locales/en.json` |
| Add | `writenow-frontend/tests/e2e/write-mode/writing-goals.spec.ts` |

## Acceptance Criteria

- [ ] 用户可设置每日目标（默认 2000 字）并持久化（重启后保持）
- [ ] StatsBar 中的进度条基于“今日字数/每日目标”计算，并实时更新
- [ ] 目标配置不依赖网络/后端（本阶段允许 localStorage 持久化）
- [ ] UI 文案 i18n 完整，且在 Focus Mode HUD/StatsBar 不破坏布局

## Tests

- [ ] Playwright E2E：修改每日目标 → StatsBar 的目标数值与进度条发生变化（可用 UI 文案断言或截图）

