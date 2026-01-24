# GAP-P1-008: 通知中心

Status: pending

## Goal

创建通知中心，集中管理和显示应用通知。

## Dependencies

- GAP-P0-005（状态栏基础设施）

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/notification-widget.tsx` |
| Add | `writenow-core/src/browser/style/notification.css` |
| Update | `writenow-core/src/browser/writenow-statusbar-contribution.ts` |

## Acceptance Criteria

- [ ] 状态栏显示通知图标和未读数量
- [ ] 点击通知图标打开通知中心面板
- [ ] 通知分级：成功、警告、错误、信息
- [ ] 显示通知时间戳
- [ ] 可清空所有通知
- [ ] 可单条删除通知
- [ ] 无通知时显示"无通知"

## Tests

- [ ] E2E：触发通知后通知图标显示数量
- [ ] E2E：打开通知中心显示通知列表
- [ ] E2E：清空后通知列表为空
