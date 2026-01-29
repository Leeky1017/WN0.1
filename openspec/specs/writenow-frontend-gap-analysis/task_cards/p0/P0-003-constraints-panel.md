# P0-003: 约束编辑器面板（Constraints + Judge 基础）

Status: pending

## Goal

在 `writenow-frontend` 提供“写作约束”面板入口，暴露后端 `constraints:get/set`，并提供 Judge 模型状态的最小可诊断视图（为 P1 的完整管理打基础）。

## Dependencies

- `openspec/specs/writenow-frontend-gap-analysis/spec.md`
- `openspec/specs/writenow-frontend-gap-analysis/design/02-p0-feature-entrypoints.md`
- `openspec/specs/api-contract/spec.md`

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-frontend/src/features/constraints/ConstraintsPanel.tsx` |
| Add | `writenow-frontend/src/features/constraints/useConstraints.ts` |
| Add | `writenow-frontend/src/features/constraints/index.ts` |
| Update | `writenow-frontend/src/components/layout/activity-bar.tsx` |
| Update | `writenow-frontend/src/stores/layoutStore.ts` |
| Update | `writenow-frontend/src/components/layout/AppShell.tsx` |
| Update | `writenow-frontend/src/locales/zh-CN.json` |
| Update | `writenow-frontend/src/locales/en.json` |
| Add | `writenow-frontend/tests/e2e/write-mode/constraints-panel.spec.ts` |

## Acceptance Criteria

- [ ] ActivityBar 存在 “约束”入口并可打开面板（稳定选择器：`data-testid="activity-tab-constraints"` 或等价）
- [ ] 面板加载时调用 `constraints:get` 并展示当前配置（允许先以 JSON/表单最小形态展示）
- [ ] 用户修改配置后可保存：
  - [ ] 调用 `constraints:set`
  - [ ] 保存成功后提示成功状态（toast 或面板内提示）
  - [ ] 保存失败时提示错误并允许重试（不丢失用户修改）
- [ ] Judge 基础可诊断：
  - [ ] 展示 `judge:model:getState` 的状态（未就绪/下载中/就绪/错误）
  - [ ] 若未就绪，提供“确保就绪”按钮，调用 `judge:model:ensure`（进度/结果至少可见）
- [ ] 错误语义清晰：区分 `TIMEOUT` 与 `CANCELED`（若发生）

## Tests

- [ ] Playwright E2E：打开约束面板 → 能看到加载态/结果态（或明确空态）→ 触发一次保存（可用最小变更）
- [ ] Playwright E2E：Judge 未就绪时展示提示并可点击 ensure（至少验证按钮存在与调用链路不崩）

