# Design: WriteNow 前端缺口分析 - 总览

## Goals

- 系统性识别并补全 WriteNow 前端的所有功能缺口
- 确保后端已有能力在前端有对应入口
- 提供专业级 IDE 应有的完整用户体验
- 建立可访问性和帮助系统基础设施

## Non-Goals

- 不在本阶段改变核心架构（保持 Theia 框架）
- 不引入新的后端功能（仅暴露已有后端能力）
- 不改变设计语言（使用已建立的 design tokens）

## 缺口分类

| 分类 | 设计文档 | 问题数量 |
|------|---------|---------|
| 编辑器功能 | `01-editor-features.md` | 13+ |
| 设置与偏好 | `02-settings-preferences.md` | 8+ |
| 文件管理 | `03-file-management.md` | 5+ |
| 状态栏与通知 | `04-status-bar-notifications.md` | 7+ |
| 右键菜单 | `05-context-menus.md` | 3 |
| 帮助与文档 | `06-help-documentation.md` | 6+ |
| 错误处理 | `07-error-handling.md` | 4+ |
| 可访问性 | `08-accessibility.md` | 系统性 |
| 后端能力暴露 | `09-backend-exposure.md` | 12+ 模块 |

## 优先级策略

- **P0（核心）**：影响基本可用性的功能（编辑器工具栏、设置入口、错误处理）
- **P1（重要）**：提升日常使用体验的功能（文件管理、状态栏、右键菜单）
- **P2（增强）**：专业 IDE 应有的功能（帮助系统、可访问性基础）
- **P3（未来）**：进阶功能（后端模块完整暴露）

## 技术约束

- 所有 UI 必须使用已建立的 `--wn-*` design tokens
- 新增组件必须遵循 Theia contribution pattern
- 后端交互必须通过 IPC contract（`ipc-generated.ts`）
- 所有新功能必须有 i18n 支持
