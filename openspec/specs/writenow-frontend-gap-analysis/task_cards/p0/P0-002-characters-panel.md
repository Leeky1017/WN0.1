# P0-002: 人物管理面板（Characters）

Status: pending

## Goal

在 `writenow-frontend` 提供“人物/角色管理”面板入口，暴露后端 `character:*` CRUD，并提供写作过程可快速引用人物信息的最小交互。

## Dependencies

- `openspec/specs/writenow-frontend-gap-analysis/spec.md`
- `openspec/specs/writenow-frontend-gap-analysis/design/02-p0-feature-entrypoints.md`
- `openspec/specs/api-contract/spec.md`

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-frontend/src/features/characters/CharactersPanel.tsx` |
| Add | `writenow-frontend/src/features/characters/useCharacters.ts` |
| Add | `writenow-frontend/src/features/characters/index.ts` |
| Update | `writenow-frontend/src/components/layout/activity-bar.tsx` |
| Update | `writenow-frontend/src/stores/layoutStore.ts` |
| Update | `writenow-frontend/src/components/layout/AppShell.tsx` |
| Update | `writenow-frontend/src/locales/zh-CN.json` |
| Update | `writenow-frontend/src/locales/en.json` |
| Add | `writenow-frontend/tests/e2e/write-mode/characters-panel.spec.ts` |

## Acceptance Criteria

- [ ] ActivityBar 存在 “人物”入口并可打开面板（稳定选择器：`data-testid="activity-tab-characters"` 或等价）
- [ ] 面板加载时调用 `character:list` 并展示人物列表（空态/错误态明确）
- [ ] 支持创建/编辑/删除人物：
  - [ ] 创建：`character:create`
  - [ ] 编辑：`character:update`
  - [ ] 删除：`character:delete`（包含二次确认）
- [ ] 最小写作辅助：
  - [ ] 在人物列表项上提供“复制名称”（或“插入到编辑器”）的最小交互（允许先复制，插入为后续增强）
- [ ] 错误可诊断（遵循 `api-contract`）：失败时展示 `error.message` 并提供重试

## Tests

- [ ] Playwright E2E：打开人物面板 → 创建人物 → 列表出现 → 删除人物 → 列表消失

