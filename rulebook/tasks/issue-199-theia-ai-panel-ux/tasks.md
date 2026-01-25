# Tasks: Theia AI Panel UX 及 Design Tokens 优化

## Task 1: 斜杠命令系统

- [ ] 定义斜杠命令数据结构（id/name/description/icon/skillId）
- [ ] 实现 SlashCommandMenu 组件（弹出菜单）
- [ ] 支持键盘导航（↑↓选择，Enter 确认，Esc 关闭）
- [ ] 集成到输入框（输入 / 触发菜单）

## Task 2: 输入区快捷按钮条

- [ ] 添加快捷按钮条 UI（斜杠命令触发器）
- [ ] 添加模型选择下拉框（placeholder，后续对接）
- [ ] 样式适配 Design Tokens

## Task 3: 消息气泡样式优化

- [ ] User 消息右对齐、AI 消息左对齐
- [ ] AI 气泡背景使用 --wn-bg-message-assistant
- [ ] User 气泡背景使用 --wn-bg-message-user
- [ ] Hover 显示操作按钮（复制/重新生成）

## Task 4: Design Tokens 补全

- [ ] 在 tokens.css 添加缺失的语义 token
- [ ] 审计 ai-panel.css 消除硬编码
- [ ] 验证 dark/light 主题一致性

## Verification

- [ ] 输入 / 能弹出斜杠命令菜单
- [ ] 键盘可导航选择命令
- [ ] 消息气泡布局正确（User 右、AI 左）
- [ ] Hover 消息显示操作按钮
- [ ] 无硬编码颜色（style-guard 通过）
