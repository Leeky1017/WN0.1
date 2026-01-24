# GAP-P1-003: 大纲导航面板

Status: pending

## Goal

创建大纲导航面板，显示文档标题结构，支持快速跳转。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/outline-widget.tsx` |
| Add | `writenow-core/src/browser/style/outline.css` |
| Update | `writenow-core/src/browser/writenow-core-frontend-module.ts` |
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |

## Acceptance Criteria

- [ ] 左侧边栏新增大纲面板
- [ ] 显示 H1-H6 标题树形结构
- [ ] 标题缩进反映层级关系
- [ ] 点击标题跳转到编辑器对应位置
- [ ] 编辑器滚动时高亮当前可见标题
- [ ] 编辑标题时大纲实时更新
- [ ] 空文档显示"无标题"提示
- [ ] 可通过 View 菜单打开/关闭面板

## Tests

- [ ] E2E：打开文档后大纲显示所有标题
- [ ] E2E：点击大纲项跳转到对应位置
- [ ] E2E：添加标题后大纲更新
