# GAP-P2-005: 写作统计面板

Status: pending

## Goal

创建写作统计面板，展示历史写作数据。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/stats-widget.tsx` |
| Add | `writenow-core/src/browser/style/stats.css` |
| Update | `writenow-core/src/browser/writenow-core-frontend-module.ts` |
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |

## Acceptance Criteria

- [ ] View 菜单添加"写作统计"入口
- [ ] 显示总字数、总写作时间
- [ ] 显示每日/每周/每月统计图表
- [ ] 显示写作目标进度（如有设置）
- [ ] 数据从 writing_stats 表读取

## Tests

- [ ] E2E：打开统计面板显示数据
- [ ] E2E：写作后统计数据更新
