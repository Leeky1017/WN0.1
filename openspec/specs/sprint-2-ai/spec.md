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

---
## 补充模块：元语言约束系统（Judge Layer）
### Purpose
在 SKILL 生成完成后，对输出内容进行约束检查（Judge），确保 AI 生成的文本符合用户定义的写作规范。Judge 层采用分层架构：L1 代码检查器（必须实现）+ L2 本地小模型检查器（必须实现）。检查结果附加到 Diff 元信息，供用户知情决策。
本模块是元语言约束系统的第一阶段实现，为后续的 Writing Contract（写作合约）产品化奠定基础。
---
### Requirement: Judge 层 MUST 采用可插拔架构，支持多种检查器实现
Judge 层 MUST 定义统一的 `IJudge` 接口，支持多种检查器实现（代码检查器、本地 LLM 检查器等）；检查器可通过配置切换，无需改动上层调用代码。
#### Scenario: 接口抽象
- **WHEN** 开发者需要新增一种检查器（如切换到 Qwen3-0.6B）
- **THEN** 只需实现 `IJudge` 接口，无需修改 Judge 层调用逻辑或 Diff 展示代码
---
### Requirement: L1 代码检查器 MUST 覆盖基础硬约束
L1 代码检查器 MUST 使用纯 JavaScript/TypeScript 实现，不依赖任何 AI 模型，覆盖以下硬约束检查：
#### Scenario: 禁用词检查
- **WHEN** SKILL 生成内容包含禁用词（用户配置或系统默认）
- **THEN** 返回违规项，包含：违规词、位置（起止索引）、严重级别（error/warning）
#### Scenario: 字数约束检查
- **WHEN** 用户设置了输出字数范围（如"精简到 200 字以内"）
- **THEN** 检查输出字数是否在范围内，超标则返回违规项
#### Scenario: 格式约束检查
- **WHEN** SKILL 要求特定格式输出（如"只输出列表"、"只输出段落"）
- **THEN** 检查输出格式是否符合要求（正则或结构解析）
#### Scenario: 术语一致性检查
- **WHEN** 用户配置了术语表（标准术语 + 别名）
- **THEN** 检查输出是否使用了别名而非标准术语，如有则提示规范化
---
### Requirement: L2 本地小模型检查器 MUST 集成 SmolLM2-360M，支持语义级判定
L2 检查器 MUST 集成本地小模型（默认 SmolLM2-360M），通过 Zero-Shot Prompt 实现语义级约束判定；模型文件由应用首次启动时自动下载，存放于 `models/` 目录。
#### Scenario: 模型自动下载
- **WHEN** 应用首次启动且 `models/smollm2-360m.gguf` 不存在
- **THEN** 自动从 HuggingFace 下载 SmolLM2-360M-Instruct 的 GGUF 量化版本（约 150-200MB）
- **THEN** 下载过程显示进度，支持断点续传
- **THEN** 下载失败时降级为仅使用 L1 代码检查器，并提示用户
#### Scenario: 模型可切换
- **WHEN** 用户在设置中指定了其他模型路径（如 `models/qwen3-0.6b.gguf`）
- **THEN** Judge 层应加载用户指定的模型
- **THEN** 模型切换无需重启应用（热切换或提示重启）
#### Scenario: 语气判定
- **WHEN** 用户配置了语气约束（如"学术正式"、"禁止口语化"）
- **THEN** L2 检查器通过以下 Prompt 模板判定：
System: 你是一个写作质量检查器。判断文本语气是否符合要求。 只回答 JSON 格式：{"pass": true/false, "reason": "原因"}

要求语气：{用户配置的语气} 文本：{待检查文本}

- **THEN** 解析模型输出，转换为标准 `ConstraintViolation` 格式
#### Scenario: 覆盖率检测
- **WHEN** SKILL 任务包含多个子问题/要点（如"回答以下三个问题"）
- **THEN** L2 检查器判定输出是否覆盖了所有子问题
- **THEN** 未覆盖的子问题作为违规项返回
#### Scenario: 推理性能约束
- **WHEN** L2 检查器执行推理
- **THEN** 单次推理耗时应 < 3 秒（在普通笔记本 CPU 上）
- **THEN** 如超时，应中止并降级为 L1 结果
---
### Requirement: 违规项 MUST 在 Diff 视图中可见
检查结果 MUST 集成到 Diff 视图，用户可直观看到哪些部分违反了约束。
#### Scenario: 违规标注展示
- **WHEN** Judge 层返回违规项
- **THEN** Diff 视图中对应位置高亮显示（如红色下划线）
- **THEN** 鼠标悬停或点击时展示违规详情（类型、原因、建议）
#### Scenario: 违规汇总
- **WHEN** 存在多个违规项
- **THEN** Diff 视图顶部或底部展示违规汇总（如"3 个警告，1 个错误"）
- **THEN** 用户可一键忽略所有警告，或逐条处理
#### Scenario: 通过时无干扰
- **WHEN** 所有约束检查通过
- **THEN** Diff 视图正常展示，不显示额外的"全部通过"提示（低打扰原则）
---
### Requirement: 约束规则 MUST 可配置并持久化
用户 MUST 能够配置约束规则，配置应持久化到本地数据库，支持全局和项目级两种作用域。
#### Scenario: 约束配置 UI
- **WHEN** 用户打开"写作设置"或"约束配置"
- **THEN** 可配置：
- 禁用词列表（支持批量导入/导出）
- 术语表（标准术语 + 别名映射）
- 语气偏好（选择或自定义）
- 字数范围（最小/最大）
- L2 检查器开关（默认开启）
#### Scenario: 配置作用域
- **WHEN** 用户在全局设置中配置约束
- **THEN** 约束对所有文档生效
- **WHEN** 用户在项目设置中配置约束
- **THEN** 项目约束覆盖全局约束（优先级更高）
---
## 新增类型定义
创建文件 `src/types/constraints.ts`：
```typescript
/** 约束类型 */
export type ConstraintType = 
| 'forbidden_words'    // 禁用词
| 'word_count'         // 字数限制
| 'format'             // 格式要求
| 'terminology'        // 术语一致性
| 'tone'               // 语气（L2）
| 'coverage';          // 覆盖率（L2）
/** 单条约束规则 */
export interface ConstraintRule {
id: string;
type: ConstraintType;
enabled: boolean;
config: Record<string, unknown>;
level: 'error' | 'warning' | 'info';
scope: 'global' | 'project';
projectId?: string;
}
/** 约束检查结果 - 单条违规 */
export interface ConstraintViolation {
ruleId: string;
type: ConstraintType;
level: 'error' | 'warning' | 'info';
message: string;
position?: { start: number; end: number };
suggestion?: string;
}
/** Judge 层完整输出 */
export interface JudgeResult {
passed: boolean;
violations: ConstraintViolation[];
l1Passed: boolean;
l2Passed: boolean;
checkedAt: string;
durationMs: number;
}
/** Judge 实现接口（可插拔） */
export interface IJudge {
check(text: string, rules: ConstraintRule[]): Promise<JudgeResult>;
}
```
新增文件清单
文件	类型	说明
src/types/constraints.ts	类型定义	约束规则与结果类型
src/lib/judge/index.ts	入口	Judge 层统一入口，工厂函数
src/lib/judge/types.ts	接口	IJudge 接口定义
src/lib/judge/code-judge.ts	L1 实现	纯代码检查器
src/lib/judge/llm-judge.ts	L2 实现	本地 LLM 检查器
src/lib/judge/rules/forbidden-words.ts	L1 规则	禁用词检查
src/lib/judge/rules/word-count.ts	L1 规则	字数检查
src/lib/judge/rules/format.ts	L1 规则	格式检查
src/lib/judge/rules/terminology.ts	L1 规则	术语一致性
src/lib/judge/prompts/tone.ts	L2 Prompt	语气判定 Prompt
src/lib/judge/prompts/coverage.ts	L2 Prompt	覆盖率检测 Prompt
electron/lib/model-downloader.cjs	下载器	模型文件下载管理
electron/lib/llm-runtime.cjs	运行时	本地 LLM 推理封装
src/stores/constraintsStore.ts	状态	约束配置 Zustand store
src/components/Diff/ViolationMarker.tsx	UI	违规标注组件
src/components/Settings/ConstraintsPanel.tsx	UI	约束配置面板
