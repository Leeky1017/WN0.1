# Design：P1 补齐闭环（自定义技能 / 对话记录 / 记忆增强 / Judge 管理）

## 目标

P1 目标是把 P0 的“入口可用”推进到“写作闭环可用”：

- 用户能创建自己的 SKILL，并在 AI 面板中运行与复用
- 对话记录可保存/可回溯（为偏好学习与复用铺路）
- 记忆不仅可 CRUD，还能 **触发偏好学习** 并可预览注入
- Judge 模型状态可管理（可诊断、可恢复）

## 3.1 自定义 SKILL（`skill:write`）

### UI 入口

- `SkillsPanel` 增加 “新建技能 / 编辑技能” 入口（面板内按钮 + Command Palette 命令）
- 最小可用：表单 + 文本编辑（YAML frontmatter + body），提交走 `skill:write`

### 校验与失败语义

- 校验失败必须可诊断：展示 `INVALID_ARGUMENT`，并保留用户输入（不得清空）
- 禁止 silent failure：不得只 `console.error`

### 预期实现落点（参考）

- `writenow-frontend/src/features/skills/`：
  - Add：`SkillEditorDialog.tsx`（或侧边栏内 editor view）
  - Update：`SkillsPanel.tsx`（新增入口与列表刷新）

## 3.2 Conversations（`context:writenow:conversations:*`）

### UI 入口

- 新增 `ConversationsPanel`（Sidebar 新 tab：`conversations`）

### 最小信息架构

- 列表：会话标题（可由 analysis.summary 生成）、时间、关联 articleId
- 详情：messages（role/content/createdAt）+ analysis（summary/keyTopics/skillsUsed）

### 关键交互

- `list` → 展示索引
- `read` → 展示详情
- `save` → 将当前会话保存（需要明确“保存的来源”：当前 AI 面板对话或某次 run 记录；若当前链路尚未产生可保存结构，必须在任务卡里补齐来源定义）
- `analysis:update` → 可选（失败可恢复）

## 3.3 Memory 增强（偏好学习 + 注入预览）

### 偏好学习入口

- 在 Memory 面板增加“从对话学习偏好”按钮：
  - 调用 `memory:preferences:ingest`
  - 完成后 refresh 列表（learned memories 可折叠）

### 注入预览

- `ContextPreview` 已使用 `memory:injection:preview`：
  - P1 要求：入口可发现（例如 AI Panel 头部 toggle/固定区块）并可刷新

### 失败语义

- `TIMEOUT` / `CANCELED` 必须区分并清理 pending 状态
- `DB_ERROR` / `INTERNAL`：显示可读错误与重试入口

## 3.4 Judge 管理（`judge:*`）

### UI 入口

- Settings 增加 “Judge” 区域（或在 Constraints 面板内提供子区域，但必须可发现）

### 最小信息架构

- 状态卡：`judge:model:getState`
- 操作：`judge:model:ensure`（带 loading 状态与结果反馈）
- 配置：`judge:l2:prompt`（若后端只读，则仅展示并给出说明）

### 安全与体验

- 不泄露本地路径/模型细节中的敏感信息（只展示必要信息）
- 错误必须可重试（如果 retryable=true，UI 应展示“重试”按钮）

