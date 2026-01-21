# Spec: Sprint 6 (Memory + Preference + Cmd+K)

Authority:
- `openspec/specs/writenow-spec/spec.md`
- `openspec/specs/sprint-6-experience/spec.md`

Scope (this issue):
- 外挂记忆（`user_memory`）CRUD + UI
- 用户偏好学习（从对话历史提取 → 合并入 `user_memory`，可撤销/可禁用，隐私模式最小化）
- 命令面板（`Ctrl/Cmd+K`）

Out of scope:
- Sprint 6 的统计/番茄钟完整实现（由对应任务覆盖）；本 issue 仅保证命令面板可调用已存在能力。

## Requirements

### Requirement: `user_memory` CRUD + 可控注入

- MUST 支持 `user_memory` 的 list/create/update/delete（global + project scope）
- MUST 支持开关“记忆注入”，关闭时 AI 调用不注入任何 `user_memory`
- MUST 在 AI 调用时返回本次注入的记忆项列表，供 UI 透明展示与排障

#### Scenario: CRUD 持久化
- WHEN 用户在「记忆」面板新增/编辑/删除记忆项
- THEN 变更 MUST 落盘到 SQLite，重启后仍一致可见

#### Scenario: 注入透明
- WHEN 用户触发任意 AI SKILL
- THEN 系统 MUST 可展示“本次注入了哪些记忆项”，并允许关闭注入

### Requirement: 偏好学习（本地、可撤销、可禁用）

- MUST 从对话历史中的 `userPreferences`（accepted/rejected）提取偏好信号
- MUST 采用阈值策略（累计达到 N 次才生成 learned 偏好记忆）
- MUST 提供撤销与一键清空 learned 偏好产物
- MUST 支持关闭偏好学习；关闭后不再产生新偏好
- MUST 支持隐私模式：不隐式学习；注入时排除 learned 记忆（仅注入用户显式保留的记忆或完全不注入）

#### Scenario: 阈值后生成偏好记忆
- GIVEN 偏好学习开启且未处于隐私模式
- WHEN 同类 accepted/rejected 信号累计达到阈值
- THEN 系统 MUST 新增 learned `user_memory(type=preference)`，并给出可撤销入口

### Requirement: 命令面板（Cmd/Ctrl+K）

- MUST 支持 `Ctrl+K`（macOS `Cmd+K`）打开并聚焦输入框，`Esc` 关闭
- MUST 支持模糊搜索、键盘导航、回车执行
- MUST 提供可扩展的命令注册机制（新增命令无需改动面板核心渲染逻辑）
- MUST 提供首批核心命令：打开统计/记忆视图、切换专注模式、常用 SKILL 快速调用

