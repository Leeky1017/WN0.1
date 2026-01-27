# Sprint：AI Memory（上下文管理与记忆系统）

## 元信息

| 字段 | 值 |
|------|-----|
| 规范名称 | sprint-ai-memory |
| 状态 | Draft |
| 创建时间 | 2026-01-27 |
| 上游依赖 | `openspec/specs/writenow-spec/spec.md`, `openspec/specs/api-contract/spec.md`, repo-root `AGENTS.md` |
| 目标 | 将“AI 记忆 + 上下文工程 + SKILL 动态注入”的关键约束沉淀为可执行、可验收的 Sprint 规范与任务卡 |
| 范围 | P0–P2：context_rules 注入、KV-cache 稳定前缀、偏好自动注入、反馈追踪、full→compact 压缩、文件化设定按需加载 |
| 非目标 | 本 Sprint 不要求落地完整知识图谱/StyleVector；但 MUST 交付其设计文档以固定未来接口与数据模型 |

---

## 技术栈锁定（必读 · 禁止替换）

> **警告**：以下技术/策略已锁定。执行本 Sprint 的实现任务时 **禁止替换为其他方案**；如需变更，必须先提交 RFC 并获得批准。

| 类别 | 锁定选型 | 禁止替换为 |
|------|----------|-----------|
| IPC 契约 | `IpcResponse<T>` + 稳定错误码（见 `api-contract`） | “抛异常/返回任意结构/吞错” |
| 本地存储 | SQLite（含 JSON 字段） | 云端记忆服务、外部数据库（Redis/Mongo/…） |
| 大内容记忆 | 文件化（项目内 `.writenow/` 或等价目录）+ 路径引用 | 把全文/大设定常驻 prompt |
| 上下文组装 | Append-only + 确定性序列化 | 动态删除/重排导致 KV-cache 失效 |
| Agent 能力扩展 | 复用现有 IPC “Tools”（`electron/ipc/*.cjs`） | 新增 MCP/外部工具栈作为主路径 |

### 必读设计文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 系统概览 | `design/00-overview.md` | 模块边界、数据流、落地点 |
| 6 层记忆架构 | `design/01-memory-layers.md` | Layer 定义、序列化与 Token 预算 |
| KV-cache 优化 | `design/02-kv-cache-optimization.md` | 稳定前缀、确定性序列化、masking |
| 偏好学习 | `design/03-user-preference-learning.md` | 显式/隐式偏好、数据模型、注入策略 |
| SKILL 动态注入 | `design/04-skill-context-injection.md` | `context_rules` 规则、注入矩阵、实现点 |
| 知识图谱 | `design/05-knowledge-graph.md` | 实体关系/时序、未来接口与演进路径 |

### 非规范补充材料（实现计划）

> 说明：以下内容为“工程落地补充材料”，用于执行与验收时的实现决策说明；**不替代本 Spec**，如有冲突以本 Spec 为准。

- `.cursor/plans/memos_设计借鉴方案_fed49a61.plan.md`：借鉴 MemOS/Mem0 的本地优先记忆工程落地计划（数据模型一步到位、语义召回接入点、stablePrefixHash 口径等）

---

## Purpose

WriteNow 的核心体验是“选中 → SKILL → diff → 应用”。要让用户感知到“Agent 比我更懂我正在写的东西”，关键不是堆检索/堆工具，而是把 **上下文工程** 做到稳定、可控、低成本：

- **更少、但更相关**：不同 SKILL 只注入其需要的上下文（Dynamic Context Discovery）
- **更稳定**：system prompt 结构与静态信息尽可能保持稳定，以最大化 KV-cache 复用
- **更可控**：记忆可查看/可删除/可关闭；失败路径可观测且可恢复
- **本地优先**：WriteNow 运行在用户本地，文件系统与 SQLite 天然可用，应成为“无限记忆”的底座

本 Sprint 规范是 `writenow-spec` 中“上下文工程/记忆系统”路线的可执行增量（Spec-first），并以 repo-root `AGENTS.md` 为交付硬约束。

---

## Requirements

### Requirement: MUST 采用 6 层上下文/记忆模型并定义稳定的注入顺序

系统 MUST 使用 6 层模型组织上下文与记忆，并为每层定义：来源、更新频率、序列化格式、最大 Token 预算与失败语义（缺失/超时/取消）。

#### Scenario: 构建一次 SKILL 调用的上下文包
- **GIVEN** 已确定 `skillId` 与（可选）`projectId`
- **WHEN** 用户触发任意 `ai:skill:run`
- **THEN** 系统 MUST 按固定顺序注入 Layer 0→5（见 `design/01-memory-layers.md`）
- **AND THEN** Layer 0–3 MUST 作为“稳定前缀”优先保持结构稳定（见 `design/02-kv-cache-optimization.md`）
- **AND THEN** 任意层缺失/失败 MUST 可判定（`IpcResponse<T>` + 稳定错误码），不得 silent failure

### Requirement: MUST 支持 SKILL 的 `context_rules` 声明式上下文注入

SKILL 定义 MUST 支持 `context_rules`/`context-requirements`（声明其所需上下文），系统 MUST 基于该声明精准注入上下文，禁止“一刀切把所有上下文都塞进 prompt”。

#### Scenario: 精准注入（只给需要的）
- **GIVEN** SKILL 已声明合法的 `context_rules`
- **WHEN** 某个 SKILL 声明 `surrounding: 500` 且不声明 `characters`
- **THEN** 系统 MUST 仅注入选区与前后文（按预算截断）
- **AND THEN** 系统 MUST NOT 注入人物设定/世界观等与本次 SKILL 无关的大内容

#### Scenario: 注入规则不可解析/非法
- **GIVEN** 系统已读取到 SKILL 定义与其 `context_rules` 原始值
- **WHEN** SKILL 的 `context_rules` 无法解析或包含非法值
- **THEN** 系统 MUST 返回 `ok: false` 且 `error.code = "INVALID_ARGUMENT"`
- **AND THEN** 错误信息 MUST 可读且包含定位线索（例如字段名），不得包含敏感信息

#### Scenario: `surrounding` 的单位与裁剪规则固定
- **GIVEN** SKILL 声明 `context_rules.surrounding = N`
- **WHEN** 系统为本次 SKILL 组装选区前后文
- **THEN** 系统 MUST 将 `N` 解释为“字符数（Unicode code points）”
- **AND THEN** 系统 MUST 以段落边界优先裁剪；必要时可退化到句子边界；不得进行不可解释的硬截断

#### Scenario: `context_rules` 未知字段被拒绝
- **GIVEN** `context_rules` 包含规范未定义的字段
- **WHEN** 系统校验 `context_rules`
- **THEN** 系统 MUST 返回 `ok: false` 且 `error.code = "INVALID_ARGUMENT"`

### Requirement: MUST 实现 KV-cache 友好的稳定前缀（Stable Prefix）模板

系统 MUST 使用稳定的 system prompt 模板（固定章节顺序与格式），并遵循 Append-only 与确定性序列化，以最大化 KV-cache 复用与成本降低。

#### Scenario: 同一 SKILL 类型在相同静态条件下复用前缀
- **GIVEN** Layer 0–3 的内容与顺序未变化
- **WHEN** 用户对同一项目重复触发同一 SKILL 类型（且 Layer 0–3 未变化）
- **THEN** 系统 MUST 生成字节级稳定的前缀文本（除 requestId/时间戳等显式动态字段外）
- **AND THEN** 变更仅允许追加到末尾（Append-only），不得在前缀中间插入/删除/重排

#### Scenario: stablePrefixHash 的口径稳定且可用于验收
- **GIVEN** 系统已构建 Layer 0–3 的稳定前缀文本
- **WHEN** 系统返回本次 run 的诊断信息
- **THEN** 系统 MUST 返回 `stablePrefixHash`（仅基于 Layer 0–3 的稳定前缀计算）
- **AND THEN** `stablePrefixHash` MUST NOT 受时间戳、随机数、requestId 等动态字段影响

#### Scenario: 行为控制使用 masking 而非删除
- **GIVEN** 当前运行缺少某些必要条件（例如无 projectId、无选区）
- **WHEN** 某些能力在当前上下文不可用（例如缺少 projectId、无选区）
- **THEN** 系统 SHOULD 通过“策略字段/权重/masking”降低其被选中概率
- **AND THEN** 系统 SHOULD NOT 通过动态删除大段 prompt/工具说明来实现（避免 KV-cache 失效）

### Requirement: MUST 将用户偏好自动注入到 SKILL 调用链路

系统 MUST 在 `ai:skill:run` 链路中自动选择并注入用户偏好（显式规则 + 隐式学习结果），并保证用户可见/可控（可查看注入了什么、可删除/关闭）。

#### Scenario: 默认自动注入（无需手动预览）
- **GIVEN** memory 存储可用（或可判定为不可用）
- **WHEN** 用户触发任意 SKILL
- **THEN** 系统 MUST 自动拉取可用的偏好条目并注入到稳定模板的“用户偏好”章节
- **AND THEN** 若无偏好条目，系统 MUST 注入稳定的空占位（避免结构漂移）

### Requirement: MUST 追踪采纳/拒绝反馈并反哺偏好学习

系统 MUST 提供可审计的反馈通路，将用户对 SKILL 结果的采纳/拒绝行为转化为偏好信号，并写入本地持久化存储。

#### Scenario: 采纳/拒绝触发偏好信号入库
- **GIVEN** `runId` 对应的运行记录存在且可追溯
- **WHEN** 用户对某次 SKILL 运行执行 `accept | reject | partial`
- **THEN** 系统 MUST 记录事件（runId、skillId、时间、动作、样本片段引用）
- **AND THEN** `accept/reject` MUST 触发偏好学习管线更新（见 `design/03-user-preference-learning.md`）

#### Scenario: 用户取消/超时
- **GIVEN** 用户触发取消或请求超过超时阈值
- **WHEN** 反馈上报或偏好更新过程中发生取消或超时
- **THEN** 系统 MUST 返回 `CANCELED` 或 `TIMEOUT`，并保证 pending 状态被清理（不挂起）

### Requirement: MUST 支持历史结果 Full → Compact 压缩并可按需回溯

系统 MUST 支持将历史上下文/运行结果从 Full 形态压缩为 Compact 摘要，用于长期会话与成本控制；并 MUST 保留从 Compact 回溯到 Full 的路径（文件/DB 引用）。

#### Scenario: 历史记录自动压缩
- **GIVEN** 历史对话/运行记录达到 compaction 阈值
- **WHEN** 项目历史对话/运行记录超过阈值（token 或条目数）
- **THEN** 系统 MUST 生成结构化 Compact 摘要并持久化
- **AND THEN** 后续注入 SHOULD 优先使用 Compact（Full 仅在按需查看/回溯时加载）

### Requirement: MUST 支持人物/世界观/设定的文件化存储与按需加载

系统 MUST 将大体量的项目设定（人物卡、世界观、风格指南等）以文件形式持久化，并在 SKILL 需要时按需读取、裁剪并注入；默认注入路径引用与必要片段，避免常驻 prompt。

#### Scenario: 设定按需加载
- **GIVEN** 项目设定存在于文件或 SQLite 中（或能判定为缺失）
- **WHEN** SKILL 声明需要 `project-settings` 或 `characters`
- **THEN** 系统 MUST 从文件/SQLite 中按需加载对应内容并按预算裁剪
- **AND THEN** 系统 MUST 在 prompt 中包含稳定的“来源引用”（文件路径/条目 ID），便于可追溯与回溯

#### Scenario: 来源引用必须去敏并且可移植
- **GIVEN** 系统需要在 prompt 或日志中输出“来源引用”
- **WHEN** 引用来源是文件路径
- **THEN** 引用 MUST 使用 project-relative 路径（例如 `.writenow/...` 或项目根相对路径）
- **AND THEN** 引用 MUST NOT 包含用户机器的绝对路径（避免敏感信息与不可移植性）

### Requirement: SHOULD 固化知识图谱的数据模型与检索接口（设计先行）

系统 SHOULD 提供项目知识图谱的实体/关系/时序数据模型，并定义最小可用的检索接口与一致性检查用例；实现可在后续 Sprint 落地，但设计 MUST 在本 Sprint 完成。

#### Scenario: 一致性检查的图谱查询
- **GIVEN** 图谱数据可用（或能判定为不可用）
- **WHEN** 用户运行“一致性检查”类 SKILL
- **THEN** 系统 SHOULD 能查询“人物/事件/时间点”的关系与状态变更
- **AND THEN** 系统 SHOULD 能返回可解释的证据引用（事件/段落/来源文件）
