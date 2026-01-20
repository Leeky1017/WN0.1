# Design: Quality Gates (E2E + Visual Regression + Style Guard)

## Principle

前端深度修复的最大风险是“好看一阵子然后回归”。因此质量门禁必须自动化、可追溯、可复现。

## Required Gates

### 1) OpenSpec strict validation

- `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`

### 2) Style guard

- 禁止新增硬编码颜色
- 禁止新增未定义 `wn-*` class

### 3) Playwright Electron E2E (real user path)

覆盖至少：

- 新建文档（内联）→ 输入 → 自动保存 → 重启恢复
- Markdown 预览/分栏/拖拽比例持久化
- AI 面板拖拽宽度持久化 + SKILL dock 可用
- 内联 AI（Cmd/Ctrl+K）生成 → 确认应用 → undo

### 4) Visual regression

- 关键视图（主界面、编辑器、AI 面板、侧边栏、状态栏）在 Dark/Light 两套基线截图

