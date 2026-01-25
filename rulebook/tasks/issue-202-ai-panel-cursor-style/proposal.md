# AI Panel UI 重构：Cursor 风格输入优先设计

## 变更摘要

将 AI Panel 从当前布局重构为 Cursor 风格的现代 UI 设计：

1. **消息区重构**：使用 YOU/AI 标签替代 chatbot 风格，结构化内容展示
2. **输入区重构**：输入优先设计，输入框在上、工具栏在下
3. **色彩系统**：简洁克制的深色主题，多层次灰度

## 影响范围

- `writenow-theia/writenow-core/src/browser/ai-panel/ai-panel-widget.tsx`
- `writenow-theia/writenow-core/src/browser/style/ai-panel.css`

## 设计参考

Demo 文件：`writenow-theia/ai-panel-demo.html`
