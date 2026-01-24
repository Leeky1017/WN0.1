# GAP-P3-003: 约束编辑器

Status: pending

## Goal

创建约束编辑器，管理 AI 写作约束条件。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/constraint-editor-widget.tsx` |
| Add | `writenow-core/src/browser/style/constraint-editor.css` |
| Update | `writenow-core/src/browser/writenow-core-frontend-module.ts` |
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |

## Acceptance Criteria

- [ ] View 菜单添加"约束管理"入口
- [ ] 显示已定义约束列表
- [ ] 可新建约束
- [ ] 可编辑约束内容
- [ ] 可启用/禁用约束
- [ ] 可删除约束
- [ ] 约束在 AI 请求时自动应用

## Tests

- [ ] E2E：创建约束后 AI 响应符合约束
