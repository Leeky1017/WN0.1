# GAP-P1-010: 全屏/专注模式

Status: pending

## Goal

实现全屏专注模式，提供沉浸式写作体验。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Update | `writenow-core/src/browser/tiptap-markdown-editor-widget.tsx` |
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |
| Update | `writenow-core/src/browser/style/editor.css` |

## Acceptance Criteria

- [ ] View > Focus Mode 切换专注模式
- [ ] Cmd+Shift+F 快捷键切换专注模式
- [ ] 专注模式隐藏侧边栏、状态栏、工具栏
- [ ] 编辑区域居中，最大宽度限制
- [ ] 鼠标移动到边缘临时显示工具栏
- [ ] Escape 退出专注模式
- [ ] 专注模式状态持久化

## Tests

- [ ] E2E：进入专注模式后侧边栏隐藏
- [ ] E2E：Escape 退出专注模式
- [ ] E2E：专注模式下编辑功能正常
