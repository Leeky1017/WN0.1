# GAP-P0-003: 编辑器工具栏

Status: pending

## Goal

为 TipTap 编辑器添加可视化工具栏，提供格式化、撤销/重做等常用操作的按钮入口。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/editor-toolbar.tsx` |
| Update | `writenow-core/src/browser/tiptap-markdown-editor-widget.tsx` |
| Update | `writenow-core/src/browser/style/editor.css` |

## Acceptance Criteria

- [ ] 工具栏固定在编辑器顶部
- [ ] 包含撤销/重做按钮
- [ ] 包含格式按钮：粗体、斜体、下划线、删除线
- [ ] 包含标题级别下拉（H1-H6）
- [ ] 包含列表按钮：无序列表、有序列表
- [ ] 按钮状态反映当前选区格式（如选中粗体文本时粗体按钮高亮）
- [ ] 工具栏样式使用 `--wn-*` design tokens
- [ ] 所有按钮有 tooltip 显示名称和快捷键

## Tests

- [ ] E2E：点击粗体按钮使选中文本加粗
- [ ] E2E：点击撤销按钮撤销上一操作
- [ ] E2E：验证按钮状态与选区格式同步
