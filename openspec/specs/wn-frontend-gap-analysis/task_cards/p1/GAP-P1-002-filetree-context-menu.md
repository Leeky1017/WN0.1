# GAP-P1-002: 文件树右键菜单增强

Status: pending

## Goal

增强文件树右键菜单，添加创作者常用的文件操作。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |

## Acceptance Criteria

- [ ] 文件树右键菜单包含：新建文件
- [ ] 文件树右键菜单包含：新建文件夹
- [ ] 文件树右键菜单包含：重命名（F2）
- [ ] 文件树右键菜单包含：复制、剪切、粘贴
- [ ] 文件树右键菜单包含：删除
- [ ] 空白区域右键仅显示：新建文件、新建文件夹
- [ ] 菜单项有分隔线分组

## Tests

- [ ] E2E：右键文件显示完整菜单
- [ ] E2E：点击重命名可编辑文件名
- [ ] E2E：点击删除后文件被删除
