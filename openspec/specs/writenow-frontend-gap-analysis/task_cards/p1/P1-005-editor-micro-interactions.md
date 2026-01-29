# P1-005: 编辑器微交互（打字手感）

Status: pending

## Goal

在不破坏性能预算的前提下，提升 TipTap 编辑器的“打字手感”：光标/选区/滚动/排版可调，并提供可回退开关（Settings）。

## Dependencies

- `openspec/specs/writenow-frontend-gap-analysis/spec.md`
- `openspec/specs/writenow-frontend-gap-analysis/design/04-p1-editor-micro-interactions.md`
- `openspec/specs/sprint-write-mode-ide/design/02-editor-performance.md`（性能预算参考）

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Update | `writenow-frontend/src/components/editor/TipTapEditor.tsx` |
| Update | `writenow-frontend/src/index.css` / `writenow-frontend/src/styles/tokens/*`（按需） |
| Update | `writenow-frontend/src/features/settings/sections/AppearanceSection.tsx`（新增可控开关/参数） |
| Update | `writenow-frontend/src/locales/zh-CN.json` |
| Update | `writenow-frontend/src/locales/en.json` |
| Add | `writenow-frontend/tests/e2e/write-mode/editor-micro-interactions.spec.ts` |

## Acceptance Criteria

- [ ] 至少交付以下可感知增强（允许渐进，但本卡必须可验收）：
  - [ ] 光标/选区样式优化（随主题 tokens，避免刺眼/低对比度）
  - [ ] 平滑滚动开关（默认保守，且可关闭）
  - [ ] 行高/段间距（至少 1 项）可在 Settings 调整并立即生效
- [ ] 所有增强均可回退（Settings 开关/重置）
- [ ] 不引入明显性能回归（维持现有 perf budgets；如新增测量点需可观测）

## Tests

- [ ] Playwright E2E：修改 Appearance 设置 → 编辑器样式发生预期变化（可用截图或计算样式断言）

