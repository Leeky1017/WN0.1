# Sprint 2：AI 能力（2-3 周）

## Purpose

在 Sprint 2 内交付 WriteNow 的「AI 写作协作」闭环：集成 Claude API（支持中转站与**流式响应**），提供 3 个内置基础 SKILL（润色/扩写/精简），以 Diff 形式展示结果并要求用户确认后才应用，同时为每次 AI 修改自动生成版本历史并支持回退。

本规范是 `openspec/specs/writenow-spec/spec.md` 在 Sprint 2 范围内的可执行增量（AI 服务 + SKILL + Diff 确认 + 版本历史）。

## Requirements

### Requirement: AI 调用 MUST 通过 Electron 主进程代理，并支持 Claude API + 中转站 + 流式响应

渲染进程不得直接持有/调用云端 API Key。AI 请求 MUST 通过主进程统一代理，并基于核心规范的 `AIConfig`（provider/baseUrl/apiKey/model 等）支持官方端点与中转站端点；响应 MUST 以流式方式反馈到 UI。

#### Scenario: Claude 流式响应（Streaming）
- **WHEN** 用户在编辑器中触发任意 SKILL 并开始生成
- **THEN** UI 必须以 token/片段流式更新（逐字/逐句可见），并在结束时得到完整结果内容与元信息（如模型名、用量等）

#### Scenario: 支持中转站 `baseUrl`
- **WHEN** 用户将 AI 配置中的 `baseUrl` 设置为代理端点（中转站）
- **THEN** 请求必须发送至该 `baseUrl`，且请求/响应形态与官方端点保持兼容（避免写死固定域名）

#### Scenario: 可取消与超时
- **WHEN** 用户点击“取消/停止”或按 `Esc`
- **THEN** 当前请求必须被中止，UI 状态回到可交互，且不得将部分生成结果写入正文

#### Scenario: 明确错误反馈（禁止 silent failure）
- **WHEN** 网络/鉴权/限流/模型不可用导致失败
- **THEN** 必须展示可理解的错误信息与重试入口，并将错误码/关键信息落盘（便于定位与复现）

---

### Requirement: SKILL 系统 MUST 以统一定义驱动，并提供 3 个内置基础 SKILL

SKILL 定义 MUST 与核心规范一致：包含 Prompt 模板、上下文需求、输出格式约束，并与本地数据库 `skills` 表（内置/自定义区分）保持一致。

#### Scenario: 内置 SKILL 可见且可触发
- **WHEN** 用户打开 AI 面板或命令面板
- **THEN** 至少可见并可触发 3 个内置 SKILL：润色文本、扩写段落、精简段落

#### Scenario: Prompt 模板与上下文注入
- **WHEN** 用户对选中文字触发 SKILL
- **THEN** 发送给模型的内容必须包含：选中片段 + 必要的文章/项目上下文 + 输出格式约束（保证可渲染 Diff）

#### Scenario: 流式输出可持续渲染
- **WHEN** 模型以流式方式返回内容
- **THEN** 前端必须能够持续拼接并渲染中间态结果，无需等待整体完成

---

### Requirement: 结果展示 MUST 默认 Diff，并在用户确认后才可应用到编辑器

AI 生成结果 MUST 默认以 Diff 形式展示（绿新增/红删除），且必须用户确认后才应用到正文（禁止“生成完成即自动替换”）。

#### Scenario: 默认 Diff 展示
- **WHEN** 生成进行中或生成完成
- **THEN** UI 以 Diff 视图展示“原文 vs 建议稿”，并明确区分新增与删除

#### Scenario: 接受 / 拒绝
- **WHEN** 用户点击“接受”
- **THEN** 才将修改应用到文档内容并标记为脏；并立即创建版本快照（actor = `ai`）
- **WHEN** 用户点击“拒绝”
- **THEN** 不改变正文内容，生成结果可被丢弃或保留为可重试草稿（实现策略可选）

#### Scenario: 支持扩展展示形态（至少实现 Diff 模式）
- **WHEN** 未来支持内联预览/侧边对比等展示形态
- **THEN** 不应改变底层结果数据结构；Sprint 2 至少保证 Diff 模式稳定可用

---

### Requirement: 版本历史 MUST 记录每次 AI 修改，并支持查看与回退

每次 AI 修改被用户接受后 MUST 自动形成版本记录，并可在版本历史中对比与回退。

#### Scenario: AI 修改自动形成版本
- **WHEN** 任意 AI 修改被用户接受并应用到正文
- **THEN** 必须写入版本记录（如 `article_snapshots`）并包含：content、name/reason、actor = `ai`、created_at

#### Scenario: 历史列表与回退
- **WHEN** 用户打开版本历史面板并选择某一版本
- **THEN** 可以查看版本内容并一键回退；回退后编辑器正文与保存状态应更新

---

### Requirement: Zustand MUST 统一管理 AI 流程状态、Diff 状态与版本列表

渲染进程 MUST 以 Zustand 作为 AI 面板的单一事实来源，统一管理：请求状态（idle/streaming/done/error/canceled）、当前选区、生成结果、Diff 展示状态、版本列表与回退状态。

#### Scenario: 状态可观测
- **WHEN** AI 请求开始/流式中/完成/失败/取消
- **THEN** Zustand 中的状态应可观测并驱动 UI（按钮可用性、加载态、错误态、Diff 视图更新）

## Out of Scope（Sprint 2 不包含）

- 自定义 SKILL 编辑器与市场（属于后续 Sprint）
- 更高级的上下文工程（RAG/记忆/语义搜索等）
- 多供应商完整覆盖（OpenAI/Azure 等可作为扩展点，但 Sprint 2 以 Claude 为主）

## Notes（实现约束与建议）

- **流式响应是必须的**：无论是面板展示、Diff 计算还是版本记录，都必须支持 streaming 中间态。
- 密钥与请求代理：渲染进程不得直接访问 API Key，统一由主进程代理并做最小化日志落盘（避免泄露密钥）。
- Diff 数据结构：建议以“原文片段 + 建议片段 + 元信息”作为最小闭环，便于未来扩展内联/侧边模式。

## References

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 57-79 行（SKILL 系统概念）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 80-88 行（版本对比：文字的 Git）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 338-359 行（AI 交互 UX：Diff + 确认 + 流式反馈）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 615-643 行（AI 服务配置：provider/baseUrl/apiKey/model）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 814-827 行（skills 表：Prompt 模板与上下文规则）

