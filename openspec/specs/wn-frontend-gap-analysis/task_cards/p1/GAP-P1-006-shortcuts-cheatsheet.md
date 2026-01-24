# GAP-P1-006: 快捷键速查表

Status: pending

## Goal

创建快捷键速查表对话框，方便用户查阅所有可用快捷键。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/shortcuts-widget.tsx` |
| Add | `writenow-core/src/browser/style/shortcuts.css` |
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |

## Acceptance Criteria

- [ ] Help > Keyboard Shortcuts 打开速查表
- [ ] Cmd+? 快捷键打开速查表
- [ ] 按分类显示快捷键：编辑、格式、文件、搜索、AI、视图
- [ ] 每项显示：操作名称、快捷键组合
- [ ] 支持搜索过滤快捷键
- [ ] Escape 关闭速查表

## Tests

- [ ] E2E：Cmd+? 打开速查表
- [ ] E2E：搜索"保存"显示 Cmd+S
