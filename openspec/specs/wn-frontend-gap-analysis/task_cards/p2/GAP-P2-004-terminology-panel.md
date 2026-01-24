# GAP-P2-004: 术语表管理

Status: pending

## Goal

创建术语表管理面板，暴露后端 terminology 表能力。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/terminology-widget.tsx` |
| Add | `writenow-core/src/browser/style/terminology.css` |
| Update | `writenow-core/src/browser/writenow-core-frontend-module.ts` |
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |

## Acceptance Criteria

- [ ] View 菜单添加"术语表"入口
- [ ] 显示术语列表
- [ ] 可新建术语条目
- [ ] 可编辑术语：名称、定义、别名
- [ ] 可删除术语
- [ ] 支持搜索过滤
- [ ] 术语数据与数据库同步

## Tests

- [ ] E2E：创建术语后出现在列表
- [ ] E2E：搜索术语返回正确结果
