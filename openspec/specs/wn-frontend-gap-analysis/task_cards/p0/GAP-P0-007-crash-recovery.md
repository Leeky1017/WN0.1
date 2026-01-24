# GAP-P0-007: 崩溃恢复对话框

Status: pending

## Goal

实现崩溃恢复对话框，在检测到未保存内容的崩溃快照时提示用户恢复。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/crash-recovery-dialog.tsx` |
| Update | `writenow-core/src/browser/writenow-core-frontend-module.ts` |
| Update | `writenow-core/src/browser/style/dialogs.css` |

## Acceptance Criteria

- [ ] 启动时检查是否有崩溃快照
- [ ] 有快照时显示恢复对话框
- [ ] 对话框显示崩溃时间和可恢复文件列表
- [ ] 提供"恢复"和"丢弃"选项
- [ ] 恢复后打开恢复的文件
- [ ] 丢弃后删除快照
- [ ] 对话框样式使用 `--wn-*` design tokens

## Tests

- [ ] E2E：模拟崩溃后启动显示恢复对话框
- [ ] E2E：点击恢复后文件内容正确恢复
- [ ] E2E：点击丢弃后快照被删除
