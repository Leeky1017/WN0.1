# Design: AI Panel UX (Docked Skills + Message Hierarchy)

## Layout

- 顶部：固定 `SkillsDock`（可折叠/可自定义常用）
- 中部：消息列表（可滚动）
- 底部：输入框（固定）

## Message Hierarchy

- User bubble：右对齐，背景微亮
- AI bubble：左对齐，背景“比画布亮 2%”的微妙层次
- Actions：copy/regenerate/time（弱显，hover 时增强）

## Resizable

- width: min 280px, max 50vw
- persist per-user

## Context Binding & Persistence

- editorContext：选区/光标/段落/必要前后文
- conversation：按 `documentId` 分组存储；提供“继续/新会话”

