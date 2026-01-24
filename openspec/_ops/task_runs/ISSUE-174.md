# ISSUE-174

- Issue: #174
- Branch: task/174-frontend-gap-analysis
- PR: https://github.com/Leeky1017/WN0.1/pull/175

## Plan

- 深入代码审计前端组件、IPC 契约、数据库 schema
- 识别后端有但前端无入口的功能
- 创建完整的前端缺口分析规范

## Runs

### 2026-01-24 代码审计

- Command: `Task subagent: explore writenow-theia/writenow-core/src/browser/`
- Key output: 发现 5 个可用 Widget（TipTap/AI Panel/Version History/Knowledge Graph/Welcome）
- Evidence: 编辑器功能 13+ 缺失，设置功能 8+ 缺失

- Command: `Task subagent: explore src/types/ipc-generated.ts`
- Key output: 发现 100+ IPC 命令，12+ 模块无前端入口
- Evidence: Memory/Stats/Constraints/Outline/Character/Export/Update 等模块

- Command: `Task subagent: explore writenow-core/src/node/database/schema.sql`
- Key output: 发现 17 张表，10 张未在前端展示
- Evidence: outlines/user_memory/writing_stats/characters/terminology 等

### 2026-01-24 深度审计

- Command: `Task subagent: audit TipTap editor features`
- Key output: 编辑器缺失：查找替换、工具栏、图片/表格/链接、语法高亮
- Evidence: `tiptap-markdown-editor-widget.tsx` 仅启用 StarterKit

- Command: `Task subagent: audit settings and preferences`
- Key output: 设置缺失：API Key 配置、模型选择、语言切换、快捷键查看
- Evidence: 后端支持但前端无 UI

- Command: `Task subagent: audit file management`
- Key output: 文件管理缺失：重命名、新建文件夹、移动、最近文件
- Evidence: Theia navigator 无自定义扩展

- Command: `Task subagent: audit status bar and notifications`
- Key output: 状态栏缺失：字数统计、行号、编码、AI 状态
- Evidence: 后端有数据，前端未渲染

- Command: `Task subagent: audit context menus`
- Key output: 右键菜单完全缺失（编辑器/文件树/选择）
- Evidence: 无 ContextMenu 注册

- Command: `Task subagent: audit help and docs`
- Key output: 帮助功能缺失：关于对话框、快捷键表、用户指南
- Evidence: Help 菜单仅有测试命令

- Command: `Task subagent: audit error handling`
- Key output: 错误处理 UI 缺失：崩溃恢复对话框、错误日志查看器
- Evidence: 有 IPC 和快照机制，无 UI

- Command: `Task subagent: audit accessibility`
- Key output: 可访问性系统性缺失：focus 指示器、ARIA、高对比度
- Evidence: 多处 outline:none 无替代，几乎无 ARIA 标签

### 2026-01-24 创建规范

- Command: `Write openspec/specs/wn-frontend-gap-analysis/spec.md`
- Key output: 766 行详细分析文档
- Evidence: 覆盖 14 个类别的缺口分析，35+ P0-P3 优先级建议
