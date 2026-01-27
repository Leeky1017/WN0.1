# GAP-P0-004: 查找/替换功能

Status: done
Issue: #178
PR: https://github.com/Leeky1017/WN0.1/pull/179

## Goal

为编辑器实现查找和替换功能，支持基本文本搜索和正则表达式。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/find-replace-widget.tsx` |
| Update | `writenow-core/src/browser/tiptap-markdown-editor-widget.tsx` |
| Update | `writenow-core/src/browser/style/editor.css` |
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |

## Acceptance Criteria

- [ ] Cmd+F 打开查找面板
- [ ] Cmd+H 打开替换面板
- [ ] 输入时实时高亮所有匹配
- [ ] 显示匹配计数（当前/总数）
- [ ] 上一个/下一个导航（Enter/Shift+Enter）
- [ ] 替换当前匹配
- [ ] 全部替换
- [ ] 选项：区分大小写
- [ ] 选项：全词匹配
- [ ] 选项：正则表达式
- [ ] Escape 关闭面板

## Tests

- [ ] E2E：Cmd+F 打开查找，输入后高亮匹配
- [ ] E2E：点击替换替换当前匹配
- [ ] E2E：全部替换替换所有匹配
- [ ] E2E：正则表达式搜索工作正常
