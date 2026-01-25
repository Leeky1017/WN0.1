# Proposal: Theia AI Panel UX 及 Design Tokens 优化

## Summary

优化 Theia 版 WriteNow 的 AI 对话面板和整体 UI，对标 Cursor/现代 AI IDE 的交互体验。

## Motivation

当前 AI Panel 的交互体验与 Cursor 等现代 AI IDE 存在差距：
- 输入区缺少快捷操作（斜杠命令、@ 引用、模型选择）
- 消息气泡样式缺乏层次感
- 部分样式仍存在硬编码，未完全使用 Design Tokens

## Scope

### P0（本次必做）

1. **AI Panel 输入区重设计**
   - 输入框下方添加快捷按钮条
   - 支持 / 斜杠命令弹出补全菜单
   - 可键盘导航选择命令

2. **消息气泡样式**
   - User 消息右对齐、AI 消息左对齐
   - 层次感：AI 气泡背景略亮于面板背景
   - Hover 显示操作按钮（复制/重新生成）

3. **Design Tokens 补全**
   - 确保 AI Panel 样式全部使用 --wn-* token
   - 禁止新增硬编码颜色

### P1（后续）

- 编辑器顶部工具栏
- 面板宽度可拖拽 + 状态持久化

## Impact

- 修改文件：`writenow-theia/writenow-core/src/browser/ai-panel/`
- 修改文件：`writenow-theia/writenow-core/src/browser/style/ai-panel.css`
- 修改文件：`writenow-theia/writenow-core/src/browser/style/tokens.css`

## References

- openspec/specs/wn-frontend-deep-remediation/design/05-ai-panel-ux.md
- openspec/specs/wn-frontend-deep-remediation/design/01-design-tokens.md
