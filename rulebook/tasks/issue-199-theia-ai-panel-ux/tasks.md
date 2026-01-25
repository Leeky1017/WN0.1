# Tasks: Theia AI Panel UX 及 Design Tokens 优化

## Task 1: 斜杠命令系统

- [x] 定义斜杠命令数据结构（id/name/description/icon/skillId）
- [x] 实现 SlashCommandMenu 组件（弹出菜单）
- [x] 支持键盘导航（↑↓选择，Enter 确认，Esc 关闭）
- [x] 集成到输入框（输入 / 触发菜单）

## Task 2: 输入区快捷按钮条

- [x] 添加快捷按钮条 UI（斜杠命令触发器）
- [x] 添加模型选择下拉框（placeholder，后续对接）
- [x] 样式适配 Design Tokens

## Task 3: 消息气泡样式优化

- [x] User 消息右对齐、AI 消息左对齐
- [x] AI 气泡背景使用 --wn-bg-message-assistant
- [x] User 气泡背景使用 --wn-bg-message-user
- [x] Hover 显示操作按钮（复制/重新生成）

## Task 4: Design Tokens 补全

- [x] 在 tokens.css 添加缺失的语义 token
- [x] 审计 ai-panel.css 消除硬编码
- [x] 验证 dark/light 主题一致性

## Verification

- [x] 输入 / 能弹出斜杠命令菜单
- [x] 键盘可导航选择命令
- [x] 消息气泡布局正确（User 右、AI 左）
- [x] Hover 消息显示操作按钮
- [x] 无硬编码颜色（style-guard 通过）

## Completion

- PR: https://github.com/Leeky1017/WN0.1/pull/200
- Merged: 2026-01-25T05:06:48Z
