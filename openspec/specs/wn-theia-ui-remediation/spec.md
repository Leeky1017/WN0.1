# Spec: Theia AI Panel UX 及 Design Tokens 优化

## Purpose

优化 Theia 版 WriteNow 的 AI 对话面板和整体 UI，对标 Cursor/现代 AI IDE 的交互体验。提供类 Cursor 的斜杠命令体验，优化消息气泡的视觉层次感，建立完善的 Design Tokens 体系。

## Requirements

### Requirement: 斜杠命令系统

用户 SHALL 能够通过输入 "/" 触发快捷命令菜单，快速访问常用 AI 技能（polish、expand、condense 等）。

#### Scenario: 斜杠命令触发

- **WHEN** AI Panel 打开且用户在输入框输入 "/"
- **THEN** 显示斜杠命令菜单，包含可用的快捷命令列表

#### Scenario: 键盘导航选择命令

- **WHEN** 斜杠命令菜单已显示，用户按 ↓ 键
- **THEN** 选中下一个命令
- **WHEN** 用户按 Enter
- **THEN** 选择当前命令并触发对应技能

#### Scenario: 模糊搜索过滤

- **WHEN** 用户输入 "/pol"
- **THEN** 菜单只显示匹配的命令（如 polish）

### Requirement: 消息气泡样式

系统 SHALL 以视觉层次感区分 User 和 Assistant 消息，User 消息右对齐，Assistant 消息左对齐。

#### Scenario: 消息气泡布局

- **WHEN** 聊天历史包含 User 和 Assistant 消息
- **THEN** User 消息显示在右侧，背景使用 --wn-bg-message-user
- **THEN** Assistant 消息显示在左侧，背景使用 --wn-bg-message-assistant

#### Scenario: Hover 操作按钮

- **WHEN** 鼠标悬停在消息上
- **THEN** 显示复制按钮
- **WHEN** 鼠标悬停在 Assistant 消息上
- **THEN** 额外显示重新生成按钮

### Requirement: Design Tokens 体系

所有 AI Panel 样式 SHALL 使用 --wn-* CSS 变量，禁止硬编码颜色值。

#### Scenario: 语义 Token 覆盖

- **WHEN** 审计 ai-panel.css 文件
- **THEN** 所有颜色值均通过 --wn-* 变量引用
- **THEN** 无硬编码的 #RGB、rgb()、hsl() 等颜色字面量

## Architecture

### 斜杠命令系统

```
用户输入 "/" → 触发 SlashCommandMenu
              ↓
         显示命令列表（/polish, /expand, /condense, /outline, /style）
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

/* Slash command menu */
--wn-bg-menu: var(--wn-gray-800);
--wn-bg-menu-item-hover: var(--wn-gray-700);
--wn-bg-menu-item-selected: var(--wn-blue-600);
```

## Task Cards

- [P0-001: 斜杠命令系统](./task_cards/P0-001-slash-commands.md)
- [P0-002: 消息气泡样式优化](./task_cards/P0-002-message-bubbles.md)
- [P0-003: Design Tokens 补全](./task_cards/P0-003-design-tokens.md)
