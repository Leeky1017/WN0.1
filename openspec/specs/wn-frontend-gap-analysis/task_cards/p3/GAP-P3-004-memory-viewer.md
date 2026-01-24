# GAP-P3-004: 记忆查看器

Status: pending

## Goal

创建记忆查看器，管理和查看用户记忆。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/memory-viewer-widget.tsx` |
| Add | `writenow-core/src/browser/style/memory-viewer.css` |
| Update | `writenow-core/src/browser/writenow-core-frontend-module.ts` |
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |

## Acceptance Criteria

- [ ] View 菜单添加"记忆查看器"入口
- [ ] 显示已存储记忆列表
- [ ] 按分类显示：角色、世界观、写作风格
- [ ] 可编辑记忆内容
- [ ] 可删除记忆
- [ ] 显示记忆来源和创建时间

## Tests

- [ ] E2E：打开记忆查看器显示记忆列表
- [ ] E2E：删除记忆后列表更新
