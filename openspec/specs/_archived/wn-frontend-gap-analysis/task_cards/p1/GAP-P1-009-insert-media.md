# GAP-P1-009: 图片/表格/链接插入

Status: done
Issue: #182
PR: https://github.com/Leeky1017/WN0.1/pull/183

## Goal

为编辑器添加图片、表格和链接的插入功能。

## Dependencies

- GAP-P0-003（编辑器工具栏）

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Update | `writenow-core/src/browser/tiptap-markdown-editor-widget.tsx` |
| Update | `writenow-core/src/browser/editor-toolbar.tsx` |
| Add | `writenow-core/src/browser/insert-link-dialog.tsx` |
| Add | `writenow-core/src/browser/insert-image-dialog.tsx` |
| Add | `writenow-core/src/browser/insert-table-dialog.tsx` |

## Acceptance Criteria

- [ ] 工具栏添加链接插入按钮
- [ ] 工具栏添加图片插入按钮
- [ ] 工具栏添加表格插入按钮
- [ ] 链接对话框：输入 URL 和显示文本
- [ ] 图片对话框：输入 URL 或选择本地文件
- [ ] 表格对话框：选择行数和列数
- [ ] 插入后光标定位到合适位置

## Tests

- [ ] E2E：插入链接后 Markdown 格式正确
- [ ] E2E：插入图片后显示图片
- [ ] E2E：插入表格后可编辑单元格
