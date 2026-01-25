# Spec: Theia AI Panel UX 及 Design Tokens 优化

## Overview

优化 Theia 版 WriteNow 的 AI 对话面板和整体 UI，对标 Cursor/现代 AI IDE 的交互体验。

## Goals

1. 提供类 Cursor 的斜杠命令体验（/polish、/expand、/outline、/style）
2. 优化消息气泡的视觉层次感和交互
3. 建立完善的 Design Tokens 体系，禁止硬编码

## Non-Goals

- 不实现真正的图片上传功能（仅 UI placeholder）
- 不实现真正的 @ 引用功能（仅 UI placeholder）
- 不实现模型切换后端逻辑

## Architecture

### 斜杠命令系统

```
用户输入 "/" → 触发 SlashCommandMenu
              ↓
         显示命令列表（/polish, /expand, /outline, /style）
              ↓
         用户选择 → 映射到 skillId → 调用 onSend
```

### 组件结构

```
AiPanelWidget
├── SlashCommandMenu (弹出菜单)
├── MessageList
│   ├── MessageBubble (User - 右对齐)
│   │   └── HoverActions [复制]
│   └── MessageBubble (Assistant - 左对齐)
│       └── HoverActions [复制, 重新生成]
├── QuickActionBar (快捷按钮条)
│   ├── SlashCommandTrigger (/)
│   └── ModelSelector (placeholder)
└── InputArea
```

## Design Tokens

### 新增语义 Token

```css
/* Message backgrounds */
--wn-bg-message-user: var(--wn-gray-700);
--wn-bg-message-assistant: var(--wn-gray-750);

/* Hover actions */
--wn-bg-message-action: var(--wn-gray-600);
--wn-bg-message-action-hover: var(--wn-gray-500);
```

## Scenarios

### SC-01: 斜杠命令触发

**Given** AI Panel 打开且输入框获得焦点
**When** 用户输入 "/"
**Then** 显示斜杠命令菜单，包含 polish/expand/outline/style

### SC-02: 键盘导航选择命令

**Given** 斜杠命令菜单已显示
**When** 用户按 ↓ 键
**Then** 选中下一个命令
**When** 用户按 Enter
**Then** 选择当前命令并触发对应技能

### SC-03: 消息气泡布局

**Given** 聊天历史包含 User 和 Assistant 消息
**Then** User 消息右对齐，背景使用 --wn-bg-message-user
**And** Assistant 消息左对齐，背景使用 --wn-bg-message-assistant

### SC-04: Hover 操作按钮

**Given** 聊天历史包含消息
**When** 鼠标悬停在消息上
**Then** 显示操作按钮（复制）
**When** 鼠标悬停在 Assistant 消息上
**Then** 额外显示重新生成按钮

## Task Cards

- [P0-001: 斜杠命令系统](./task_cards/P0-001-slash-commands.md)
- [P0-002: 消息气泡样式优化](./task_cards/P0-002-message-bubbles.md)
- [P0-003: Design Tokens 补全](./task_cards/P0-003-design-tokens.md)
