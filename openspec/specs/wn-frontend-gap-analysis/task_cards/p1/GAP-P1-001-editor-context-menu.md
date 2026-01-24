# GAP-P1-001: 编辑器右键菜单

Status: pending

## Goal

为编辑器添加自定义右键菜单，包含常用编辑操作和 AI 功能入口。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/editor-context-menu.ts` |
| Update | `writenow-core/src/browser/tiptap-markdown-editor-widget.tsx` |
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |

## Acceptance Criteria

- [ ] 编辑器内右键显示自定义菜单
- [ ] 菜单项：剪切、复制、粘贴
- [ ] 菜单项：查找、替换
- [ ] 菜单项：AI 解释、AI 改写、AI 翻译（子菜单）
- [ ] 菜单项显示快捷键
- [ ] 无选中文本时剪切/复制禁用
- [ ] 菜单样式使用 `--wn-*` design tokens

## Tests

- [ ] E2E：右键显示菜单
- [ ] E2E：点击复制后剪贴板包含选中文本
- [ ] E2E：点击 AI 解释调用 AI 服务
