# WriteNow 前端差距补全（writenow-frontend）

## 元信息

| 字段 | 值 |
|------|-----|
| 规范名称 | writenow-frontend-gap-analysis |
| 状态 | Draft |
| 创建时间 | 2026-01-29 |
| 上游依赖 | `openspec/specs/writenow-spec/spec.md`, `openspec/specs/api-contract/spec.md`, `openspec/specs/sprint-ai-memory/spec.md` |
| 输入来源 | `writenow_前端差距分析_5da033fe.plan.md`（Cursor 本地 Plan，ID: 5da033fe） |
| 目标 | 以最低成本补齐 **后端已实现** 的差异化能力在 `writenow-frontend/` 的可发现性与可用性，并在此基础上增量补齐写作 IDE 的关键能力（P1–P3）。 |
| 范围 | 主要修改 `writenow-frontend/`（UI 入口/交互/调用已有 RPC 通道/错误处理/真实 E2E）。默认不新增后端能力（若需补契约或修 bug，必须另建 issue/任务卡）。 |

## Purpose

本规范把“前端差距分析”的发现（见输入来源 Plan）固化为 **可验收** 的 Requirements，并配套提供 `design/` 与 `task_cards/`，用于后续按优先级推进实现。

当前最严重的问题不是“缺少新功能”，而是：

- Theia backend（standalone-rpc）已具备的核心差异化能力（知识图谱、人物管理、约束/Judge、上下文工程、对话记录、索引/语义搜索等）在 `writenow-frontend` 缺少 UI 入口或仅部分实现，导致用户无法使用或难以发现。
- 该问题会直接削弱 WriteNow 的产品差异化（见 `writenow-spec` 的“核心差异化”与“上下文工程”）。

## Non-goals

- 不替换已锁定技术栈（TipTap、Zustand、shadcn/ui、Playwright 等），不引入第二套前端/双入口（见 repo-root `AGENTS.md`）。
- 默认不新增新的后端能力与通道；本规范聚焦“**暴露已有能力**”。若发现契约缺失/实现缺陷，必须以独立 Issue/任务卡进入交付链路。
- 不在本规范内定义云同步/多人协作/账号体系。

## Requirements

### Requirement: 导航信息架构 MUST 支持新增面板并保持一致性

Write Mode 的 ActivityBar/SidebarPanel MUST 支持新增面板入口，并保证 i18n、选择器稳定、Focus Mode 行为一致（避免形成新的“不可发现”功能）。

#### Scenario: 新增面板入口可发现
- **WHEN** 用户在桌面端进入 Write Mode（非 Focus Mode）
- **THEN** ActivityBar MUST 可发现并可打开：`knowledgeGraph`、`characters`、`constraints`、`context`、`conversations`（命名为建议，具体以实现为准但必须稳定）
- **AND THEN** 每个入口 MUST 具备稳定选择器（例如 `data-testid="activity-tab-<id>"`）以支持真实 E2E
- **AND THEN** 入口文案 MUST 在 `locales/{zh-CN,en}.json` 中存在且可翻译（不得硬编码字符串）

#### Scenario: Focus Mode 策略不破坏可用性
- **WHEN** 用户进入 Focus Mode（或右侧 AI Panel 折叠）
- **THEN** 系统 MUST 不出现“只能靠鼠标点到某个隐藏角落”的入口
- **AND THEN** 若面板在 Focus Mode 被折叠，系统 MUST 仍可通过命令面板（Command Palette）打开对应面板或给出明确不可用提示

---

### Requirement: P0-001 知识图谱（Knowledge Graph）MUST 在 writenow-frontend 可用

知识图谱是 WriteNow 的差异化能力之一。`writenow-frontend` MUST 提供可发现的知识图谱入口，并暴露后端已有的图谱/实体/关系能力。

#### Scenario: 打开知识图谱面板并展示图谱
- **WHEN** 用户打开 Knowledge Graph 面板
- **THEN** 系统 MUST 通过 `kg:graph:get` 拉取图谱并可视化展示（可先用列表/简易图，后续再升级）
- **AND THEN** 加载/空态/错误态 MUST 可判定且可恢复（不得 silent failure）

#### Scenario: 实体/关系 CRUD 可用
- **WHEN** 用户在面板中创建/更新/删除实体或关系
- **THEN** 系统 MUST 使用 `kg:entity:*` / `kg:relation:*` 通道完成操作并刷新视图
- **AND THEN** 失败 MUST 显示可读错误信息（遵循 `api-contract` 的错误码语义：`INVALID_ARGUMENT/TIMEOUT/CANCELED/DB_ERROR/INTERNAL` 等）

---

### Requirement: P0-002 人物（Characters）管理面板 MUST 可用

人物卡是长篇创作刚需。`writenow-frontend` MUST 提供人物管理入口并暴露后端人物 CRUD 能力。

#### Scenario: 列表与创建/编辑/删除
- **WHEN** 用户打开 Characters 面板
- **THEN** 系统 MUST 使用 `character:list` 展示人物列表
- **AND THEN** 用户 MUST 可通过 `character:create/update/delete` 完成人物卡 CRUD，并在 UI 中立刻可见结果

#### Scenario: 写作过程可快速引用人物信息（最小可用）
- **WHEN** 用户在编辑器写作且需要查阅人物信息
- **THEN** 系统 SHOULD 提供“查看/复制/插入人物名称或要点”的最小交互（不要求一次性交付完整关系图）

---

### Requirement: P0-003 写作约束（Constraints + Judge）面板 MUST 可用

写作约束（禁用词、术语表、格式/字数等）是“可控的 AI/一致性”的关键组成。`writenow-frontend` MUST 提供约束配置入口并暴露后端 `constraints:*` 与 `judge:*` 能力。

#### Scenario: 约束配置可读写
- **WHEN** 用户打开 Constraints 面板
- **THEN** 系统 MUST 使用 `constraints:get` 展示当前约束配置
- **AND THEN** 用户修改后 MUST 可通过 `constraints:set` 保存，并在刷新后保持一致

#### Scenario: Judge 模型状态可见且可操作
- **WHEN** 用户打开 Constraints 面板或 Settings 中的 Judge 区域
- **THEN** 系统 MUST 展示 `judge:model:getState` 的状态（未就绪/下载中/就绪/错误）
- **AND THEN** 用户 MUST 能触发 `judge:model:ensure`（并看到进度或明确结果）

---

### Requirement: P0-004 语义搜索 MUST 可发现且可诊断

`writenow-frontend` 已具备 Search 面板，但语义搜索 MUST 达到“可发现 + 可诊断 + 可落地定位”的可用标准，并补齐与索引维护相关的缺口。

#### Scenario: 语义搜索返回结果并支持跳转
- **WHEN** 用户在 Search 面板切换到语义搜索并输入自然语言查询
- **THEN** 系统 MUST 使用 `search:semantic` 返回结果并展示相似度分数
- **AND THEN** 用户点击结果后 MUST 能打开对应文档并尽可能定位到相关片段（允许分阶段：先打开文件，后定位高亮）

#### Scenario: 模型/索引未就绪时可恢复
- **WHEN** `search:semantic` 返回 `MODEL_NOT_READY` 或 `DB_ERROR`
- **THEN** UI MUST 给出可操作的下一步（例如：引导去“索引管理/重建索引”，或显示“下载/初始化模型”提示）
- **AND THEN** 错误信息不得泄露敏感信息（遵循 `api-contract`）

---

### Requirement: P0-005 上下文调试器（Context Debugger）MUST 提供可观测入口

上下文工程是 WriteNow 的核心。`writenow-frontend` MUST 提供上下文调试入口，展示与“上下文加载/规则片段/设定文件/对话记录”相关的状态与证据，以支持用户与开发者定位质量问题。

#### Scenario: 上下文资源可视化（最小可用）
- **WHEN** 用户打开 Context 面板（或 Developer 子页面）
- **THEN** 系统 MUST 展示 `context:writenow:status`（exists/watching/rootPath）
- **AND THEN** 系统 MUST 能拉取并展示 `context:writenow:rules:get` 与 `context:writenow:settings:list/read` 的内容摘要与加载错误列表（`errors[]`）

#### Scenario: 文件监听可控
- **WHEN** 用户需要开启/关闭设定文件监听
- **THEN** 系统 MUST 可通过 `context:writenow:watch:start/stop` 控制监听状态并在 UI 中同步反映

---

### Requirement: P0-006 大纲（Outline）必须支持编辑、拖拽与保存

当前 Outline 面板仅用于展示与导航。`writenow-frontend` MUST 支持大纲的编辑、拖拽重排与保存，使其成为结构化写作的可用入口。

#### Scenario: 编辑并保存大纲
- **WHEN** 用户在 Outline 面板中新增/重命名/删除节点
- **THEN** 系统 MUST 通过 `outline:save` 保存
- **AND THEN** 刷新或重启后再打开同一文档，`outline:get` MUST 返回一致的结构

#### Scenario: 拖拽重排不丢失数据
- **WHEN** 用户拖拽调整大纲节点顺序
- **THEN** 系统 MUST 保持树结构合法（防止形成环/非法层级）
- **AND THEN** 保存后顺序 MUST 持久化

---

### Requirement: P1-001 自定义 SKILL 创建/编辑 MUST 可用

WriteNow 需要支持用户自定义技能。`writenow-frontend` MUST 暴露 `skill:write`，提供创建/编辑的最小可用 UI，并与现有 Skills 面板保持一致。

#### Scenario: 创建一个可运行的自定义 SKILL
- **WHEN** 用户在 Skills 面板发起“新建自定义技能”
- **THEN** 系统 MUST 通过 `skill:write` 创建技能并回到列表可见
- **AND THEN** 用户 MUST 能启用该技能并在 AI Panel/命令面板中运行它

#### Scenario: 校验失败可诊断
- **WHEN** 用户提交的技能内容不合法
- **THEN** UI MUST 展示可读错误并保留未提交内容（不得 silent failure）

---

### Requirement: P1-002 对话记录（Conversations）管理面板 MUST 可用

对话记录是可追溯与偏好学习的基础。`writenow-frontend` MUST 提供对话记录入口并暴露 `context:writenow:conversations:*` 能力。

#### Scenario: 查看历史对话并打开详情
- **WHEN** 用户打开 Conversations 面板
- **THEN** 系统 MUST 使用 `context:writenow:conversations:list` 展示列表
- **AND THEN** 用户选择一条记录后 MUST 使用 `context:writenow:conversations:read` 展示消息与分析摘要

#### Scenario: 保存对话与分析更新可触发
- **WHEN** 用户希望将当前会话保存为一条可复用记录
- **THEN** 系统 MUST 可通过 `context:writenow:conversations:save` 保存
- **AND THEN** 系统 SHOULD 支持 `context:writenow:conversations:analysis:update` 触发分析更新（失败可恢复）

---

### Requirement: P1-003 记忆面板 MUST 补齐“偏好学习”与“注入预览”闭环

记忆既要可控（可见/可删/可关），也要可增长（可学习）。`writenow-frontend` MUST 在 UI 上补齐偏好学习触发与注入预览，并确保错误可诊断。

#### Scenario: 触发偏好学习并可见结果
- **WHEN** 用户在记忆相关 UI 触发“从对话学习偏好”
- **THEN** 系统 MUST 调用 `memory:preferences:ingest` 并在完成后刷新记忆列表
- **AND THEN** 若失败，UI MUST 显示错误并允许重试

#### Scenario: 注入预览可发现
- **WHEN** 用户希望知道下一次 AI 运行会注入哪些记忆
- **THEN** 系统 MUST 提供 `memory:injection:preview` 的可发现入口（可在 AI Panel 或 Memory/Context 面板）

---

### Requirement: P1-004 Judge 设置 MUST 在 Settings 中可管理

Judge（L2 本地模型约束检查）需要可发现、可诊断、可恢复。`writenow-frontend` MUST 在 Settings 中提供 Judge 管理入口。

#### Scenario: 查看与确保模型就绪
- **WHEN** 用户打开 Settings 的 Judge 区域
- **THEN** 系统 MUST 展示 `judge:model:getState`
- **AND THEN** 用户 MUST 可触发 `judge:model:ensure` 并看到结果（成功/失败/超时/取消）

#### Scenario: L2 prompt 配置可用（如适用）
- **WHEN** 用户需要调整 L2 prompt（或查看当前 prompt）
- **THEN** 系统 SHOULD 通过 `judge:l2:prompt` 提供可读写入口（若后端仅支持读则明确提示）

---

### Requirement: P1-005 编辑器微交互 MUST 显著提升“打字手感”

编辑器微交互是写作体验的核心差距之一。系统 MUST 在不破坏性能预算的前提下，提升光标、选区、滚动与排版可调能力，并提供可回退开关（Settings）。

#### Scenario: 用户可感知的输入/滚动优化
- **WHEN** 用户在中等规模文档中连续输入与滚动
- **THEN** 应用 MUST 保持稳定帧率与低输入延迟（不出现明显抖动/卡顿）
- **AND THEN** 关键微交互配置 MUST 可在 Settings 中开关或调整（例如行高/段间距/光标样式）

---

### Requirement: P2-001 MUST 提供“手动重建索引”入口

语义搜索依赖 embedding 与索引。系统 MUST 在 Settings 或 Search 中提供“重建/更新索引”的可发现入口。

#### Scenario: 手动触发索引重建并可观测
- **WHEN** 用户点击“重建索引”
- **THEN** 系统 MUST 通过 `embedding:index` 执行索引写入
- **AND THEN** UI MUST 展示进度/结果（至少：indexedCount），并在失败时给出可诊断错误与重试入口

---

### Requirement: P2-002 Corkboard（索引卡）视图 MUST 支持章节卡片化与拖拽重排

为对标 Scrivener，系统 MUST 提供 Corkboard 视图，让用户以卡片方式组织章节与摘要，并与 Outline/正文保持一致（高级体验可增量优化）。

#### Scenario: Corkboard 可用且与大纲一致
- **WHEN** 用户打开 Corkboard 视图
- **THEN** 系统 MUST 展示与 Outline 一致的章节卡片（标题 + 摘要）
- **AND THEN** 用户拖拽重排后，Outline 的顺序 MUST 同步变化并可保存

---

### Requirement: P2-003 写作目标系统 MUST 支持项目/每日目标与进度可视化

系统 MUST 支持写作目标（项目目标 + 每日目标）与进度可视化，并与现有统计能力形成闭环（高级策略如自动调整可后续增量）。

#### Scenario: 设置目标并看到进度
- **WHEN** 用户设置每日目标（例如 2000 字）并进行写作
- **THEN** 系统 MUST 展示目标进度（例如进度条/百分比），并在一天内持续更新
- **AND THEN** 目标配置 MUST 持久化（重启后保持）

---

### Requirement: P3-001 时间线视图 MUST 支持事件/伏笔的结构化管理（最小可用）

时间线视图用于伏笔追踪与一致性检查。系统 MUST 定义并支持最小可用形态与验收标准；更高级能力可在后续迭代增量交付。

#### Scenario: 录入事件并可视化查看
- **WHEN** 用户在时间线中新增一个事件并关联到某篇文档/章节
- **THEN** 系统 MUST 能在时间线中按时间顺序展示该事件
- **AND THEN** 事件 MUST 支持最小字段（时间/标题/备注/关联引用），并可编辑与删除

---

### Requirement: 本规范内的所有新增功能 MUST 具备真实 E2E 覆盖

#### Scenario: 每张任务卡至少 1 条真实 E2E
- **WHEN** 某个 task card 被标记为 done
- **THEN** 其 Tests 清单中的 Playwright E2E MUST 全部通过（真实 UI + 真实持久化 + 真实 RPC）
- **AND THEN** 禁止 stub/假数据替代 E2E（遵循 repo-root `AGENTS.md`）

