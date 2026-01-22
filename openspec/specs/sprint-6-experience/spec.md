# Sprint 6：体验增强（2 周）

Status: partially delivered; remaining scope paused (2026-01-22; blocked by `openspec/specs/sprint-theia-migration/spec.md`)

## Purpose

在 Sprint 6 内交付 WriteNow 的「体验增强」闭环：提供可观测的创作统计、内置番茄钟、外挂记忆（含用户偏好学习）、以及统一入口的命令面板（`Ctrl/Cmd+K`）。这些能力应以**低打扰**方式融入日常写作流程，并与现有编辑器/AI 能力形成一致的交互与数据闭环。

本规范是 `openspec/specs/writenow-spec/spec.md` 在 Sprint 6 范围内的可执行增量（Experience：Stats / Pomodoro / Memory / Preference Learning / Command Palette）。

## Requirements

### Requirement: 应用 MUST 提供创作统计，并持续落盘

应用 MUST 记录并展示创作统计，至少覆盖：每日字数、写作时长（分钟）、创建文章数、使用 SKILL 次数；并持久化到本地数据库，保证离线可用与可恢复。

#### Scenario: 每日统计自动增量更新
- **WHEN** 用户在任意文档中产生可被系统确认的写作行为（例如：完成一次保存/自动保存，或完成一次番茄钟专注时段）
- **THEN** 系统应增量更新当日 `writing_stats`：`word_count` / `writing_minutes` / `articles_created` / `skills_used`

#### Scenario: 统计面板可查看最近趋势
- **WHEN** 用户打开「创作统计」面板
- **THEN** 应展示至少：今天/本周累计字数与写作分钟；并提供按天的最近趋势（例如最近 7 天）

#### Scenario: 统计不影响写作性能
- **WHEN** 用户持续输入与自动保存发生
- **THEN** 统计更新不得造成明显卡顿；统计写入应可批处理/防抖（例如按分钟或按保存完成时写入）

---

### Requirement: 应用 MUST 内置番茄钟，并与写作状态联动

应用 MUST 提供番茄钟（Pomodoro）能力，支持开始/暂停/继续/结束，包含专注与休息阶段；并与写作统计联动，确保专注时间可计入 `writing_minutes`。

#### Scenario: 基础番茄钟流程可用
- **WHEN** 用户开始一个番茄钟
- **THEN** 应进入专注阶段并倒计时；用户可暂停/继续/结束；结束后进入休息阶段并提示用户

#### Scenario: 番茄钟完成后写作时长入账
- **WHEN** 用户完成一个专注阶段（或按策略完成一组番茄）
- **THEN** 系统应将完成的专注分钟数累加到当日 `writing_stats.writing_minutes`

#### Scenario: 状态可恢复且跨刷新一致
- **WHEN** 应用在番茄钟进行中退出/重启
- **THEN** 下次启动后应恢复到正确的剩余时间与阶段（或给出明确的“是否恢复”提示），避免静默丢失

---

### Requirement: 外挂记忆 MUST 可查看/编辑，并在 AI 调用时注入

外挂记忆（user memory）MUST 支持以可控、可审计的方式存储用户偏好与历史反馈；用户可查看/新增/编辑/删除记忆项；并在 AI 调用时按规则注入为上下文的一部分（遵循最小必要原则）。

#### Scenario: 记忆管理（CRUD）可用
- **WHEN** 用户打开「记忆」面板
- **THEN** 应能查看现有记忆项，并支持新增/编辑/删除；记忆项可区分全局与项目级（`project_id` 可为空）

#### Scenario: AI 调用注入记忆
- **WHEN** 用户触发任意 AI SKILL
- **THEN** 系统应加载并注入：用户偏好记忆 +（如有）项目知识记忆 + 相关历史反馈，组成 prompt 的一部分

#### Scenario: 透明与可控（避免黑箱）
- **WHEN** 用户在一次 AI 调用前/后查看“发送的上下文”
- **THEN** 应能看到哪些记忆被注入；并支持快速禁用/移除某条记忆（或关闭记忆注入）

---

### Requirement: 用户偏好学习 MUST 在本地提取，且可撤销/可禁用

系统 MUST 支持基于用户行为的偏好学习（例如：采纳/拒绝 AI 改写、对措辞的重复修改），并以“建议 + 用户确认/可撤销”为原则写入 `user_memory`（type = `preference` / `feedback` 等）。默认行为应可在设置中关闭。

#### Scenario: 从 AI 采纳/拒绝中提取偏好信号
- **WHEN** 用户对 AI 生成结果执行“接受/拒绝”（或部分接受）
- **THEN** 系统应记录一条可追溯的偏好信号（例如更偏好简洁/更少形容词等），并按阈值合并到偏好记忆中（避免过拟合）

#### Scenario: 用户可审阅并撤销学习结果
- **WHEN** 系统新增或更新一条偏好记忆
- **THEN** 应提示用户该变化（可弱提示），并允许用户撤销/编辑；用户可一键清空偏好学习产物

#### Scenario: 隐私模式下的最小化策略
- **WHEN** 用户启用隐私模式或关闭偏好学习
- **THEN** 系统不得继续隐式提取偏好；且 AI 调用应仅注入用户明确保留的记忆（或完全不注入）

---

### Requirement: 命令面板 MUST 支持 `Ctrl/Cmd+K` 打开，并可执行核心命令

应用 MUST 提供命令面板作为统一入口：可搜索并执行常用动作（文件、编辑器视图、AI、番茄钟、统计、记忆）；并支持键盘导航与可扩展的命令注册机制。

#### Scenario: 快捷键打开/关闭
- **WHEN** 用户按下 `Ctrl+K`（macOS 为 `Cmd+K`）
- **THEN** 命令面板应打开并聚焦输入框；再次触发或按 `Esc` 应关闭

#### Scenario: 搜索与执行命令
- **WHEN** 用户在命令面板输入关键词并选择某项命令
- **THEN** 应执行该命令（例如：开始番茄钟、打开创作统计、切换专注模式），并在执行后关闭（除非命令要求保持打开）

#### Scenario: 命令体系可扩展
- **WHEN** 开发者新增一个命令（包含 id/title/keywords/handler/shortcut）
- **THEN** 命令面板应无需改动核心渲染逻辑即可展示并执行该命令；并避免快捷键冲突（冲突需明确策略）

## Out of Scope（Sprint 6 不包含）

- 进阶知识图谱与复杂实体抽取（属于后续 Sprint）
- 云同步/多端同步的记忆与统计（属于后续 Sprint）
- 完整数据分析体系（例如可自定义指标、报表导出、团队协作统计）

## Notes（实现约束与建议）

- 体验优先：统计/番茄钟/偏好学习应尽量低打扰，避免频繁弹窗；必要提示应可关闭。
- 数据口径：`writing_minutes` 建议以番茄钟专注分钟作为最小闭环口径；其他来源（例如活跃输入检测）可作为后续扩展。
- 透明性：偏好学习与记忆注入属于“黑箱风险高”模块，必须提供可查看与可控入口。
- 快捷键：Windows 优先，macOS 使用 `Cmd` 替代 `Ctrl`，并遵循统一的快捷键注册/分发机制。

## References

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 265-294 行（外挂记忆系统：类型/注入/更新）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 386-402 行（快捷键：命令面板 `Ctrl/Cmd+K`、取消 `Esc` 等）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 829-837 行（`user_memory` 表）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 839-846 行（`writing_stats` 表）
