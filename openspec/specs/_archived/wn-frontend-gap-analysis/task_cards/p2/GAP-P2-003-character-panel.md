# GAP-P2-003: 角色管理面板

Status: done
Issue: #188
PR: https://github.com/Leeky1017/WN0.1/pull/189

## Goal

创建角色管理面板，暴露后端 characters 模块能力。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/character-widget.tsx` |
| Add | `writenow-core/src/browser/style/character.css` |
| Update | `writenow-core/src/browser/writenow-core-frontend-module.ts` |
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |

## Acceptance Criteria

- [ ] View 菜单添加"角色管理"入口
- [ ] 显示已创建角色列表
- [ ] 可新建角色
- [ ] 可编辑角色属性：名称、描述、属性
- [ ] 可删除角色
- [ ] 角色数据与数据库同步

## Tests

- [ ] E2E：创建角色后出现在列表
- [ ] E2E：编辑角色后保存成功
- [ ] E2E：删除角色后从列表移除
