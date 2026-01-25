# GAP-P0-008: Welcome 页面最近文件

Status: done
Issue: #178
PR: https://github.com/Leeky1017/WN0.1/pull/179

## Goal

在 Welcome 页面显示最近打开的文件列表，方便用户快速访问。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Update | `writenow-core/src/browser/writenow-welcome-widget.tsx` |
| Update | `writenow-core/src/browser/style/welcome.css` |
| Add | `writenow-core/src/node/recent-files-service.ts` |
| Update | `writenow-core/src/common/writenow-protocol.ts` |

## Acceptance Criteria

- [ ] Welcome 页面显示"最近文件"区域
- [ ] 显示最近打开的 10 个文件
- [ ] 每项显示文件名和路径
- [ ] 点击文件项打开对应文件
- [ ] 文件不存在时显示灰色并标记"不可用"
- [ ] 可清空最近文件列表
- [ ] 最近文件列表持久化存储

## Tests

- [ ] E2E：打开文件后出现在最近文件列表
- [ ] E2E：点击最近文件项打开文件
- [ ] E2E：重启应用后最近文件列表保留
