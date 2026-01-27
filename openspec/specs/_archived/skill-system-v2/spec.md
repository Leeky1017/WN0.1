# SKILL System V2（可复用 / 可升级 / 可组合）

Status: partially delivered; remaining tasks paused (2026-01-24; unblocked by Theia baseline; needs re-scheduling)

## Purpose

在不改变现有 3 个内置写作 SKILL（润色/扩写/精简）行为与 UX 闭环（选中 → SKILL → Diff → 确认 → 应用 → 版本）的前提下，交付 SKILL System V2 的架构规范，使 SKILL 成为可工程化管理的能力载体：

- **可复用**：可在项目/设备间导入导出与分发（Skill Package）。
- **可升级**：具备版本、变更审计、升级助手与回滚能力。
- **可组合**：支持 workflow（多 SKILL 串联）与路由（按场景/模型能力选择子 SKILL/变体）。
- **可兼容多模型**：在顶级/中端/低端模型下均有明确可用策略（语义/规则分层路由）。

本规范是 `openspec/specs/writenow-spec/spec.md` 的「核心概念 → SKILL 系统」在“自定义/工程化/组合/多模型”方向的可执行增量，并与 Sprint 2 的 SKILL 运行闭环保持一致。

## Requirements

### Requirement: SKILL 定义 MUST 采用 `SKILL.md` 文件作为单一事实源（SSOT），DB 仅作为运行时索引

WriteNow MUST 对齐业界 Agent Skills 的工程化载体：`SKILL.md` + YAML frontmatter + Markdown 正文。`skills` 表继续存在，但其内容 MUST 可由文件重建（file → index），避免“文件/DB 双源漂移”。

#### Scenario: 文件为源、DB 为索引
- **WHEN** 任意 SKILL 被安装/创建/修改/删除
- **THEN** 系统 MUST 以 `SKILL.md` 为权威来源解析出结构化定义，并将必要索引字段写入 DB（用于列表/搜索/排序/权限/启用态）
- **THEN** 任意时候 MUST 可通过重新扫描文件系统完全重建 DB 索引（不依赖 DB 中的 prompt 字段为事实源）

#### Scenario: 内置 SKILL 单源化且不改变功能
- **WHEN** 应用启动并初始化内置 SKILL
- **THEN** 内置 SKILL 的定义 MUST 来自内置 `SKILL.md`（随应用分发），而不是在前端/主进程各自硬编码两份
- **THEN** 用户在 UI 中触发“润色/扩写/精简”得到的模型输入输出语义 MUST 与 V1 等价（允许 prompt 文本等价重排，但不得改变输出约束与应用闭环）

---

### Requirement: SKILL 系统 MUST 支持多作用域（Builtin / Global / Project）与可观测的发现/索引机制

SKILL 的来源与作用域 MUST 明确区分，并可在 UI 中解释与调试（来源、版本、是否有效、最后索引时间）。

#### Scenario: 三层作用域发现
- **WHEN** 系统进行 SKILL 发现
- **THEN** MUST 按以下作用域扫描并合并（优先级从高到低，支持覆盖/重载规则见 design）：
  - Builtin：应用资源内置技能
  - Global：用户全局技能目录（跨项目可用）
  - Project：项目 `.writenow/skills/`（仅该项目可用）

#### Scenario: 文件变更监听与增量索引
- **WHEN** 任一 SKILL 文件发生变更（新增/修改/删除）
- **THEN** MUST 以增量方式更新索引（避免全量扫描导致卡顿）
- **THEN** UI MUST 能展示该 SKILL 的状态（valid/invalid/disabled）与错误原因（可恢复）

---

### Requirement: SKILL 定义 MUST 有明确的结构化字段、校验规则与长度控制策略

SKILL MUST 同时对写作者友好（UI 友好）并可被系统稳定解析与治理（版本、路由、约束、预算）。

#### Scenario: SKILL 结构字段（最小可用）
- **WHEN** 系统解析一个 `SKILL.md`
- **THEN** MUST 至少得到以下字段（详见 design/skill-format.md）：
  - `id`（稳定唯一）
  - `name`、`description`
  - `version`（SemVer）
  - `tags`（rewrite/generate/analyze/assist 等）
  - `prompt`（system + 可选 template/variables）
  - `context`（上下文注入规则：Rules/Settings/Retrieved/Immediate 的选择与预算倾向）
  - `output`（format + constraints）
  - `modelProfile`（模型 tier 与默认模型偏好）

#### Scenario: 长度上限与拆分
- **WHEN** 单个 SKILL 的可注入指令/参考内容超过阈值（默认建议上限：≤ 5000 tokens，或按模型 tier 配置）
- **THEN** 系统 MUST 给出可操作的拆分路径：
  - 将长内容移入 `references/` 并按需加载（progressive disclosure）
  - 或拆为 Skill Package 内多个子 SKILL，由路由选择
- **THEN** MUST 禁止“静默截断”导致指令不完整（失败必须可观测、可恢复）

---

### Requirement: SKILL 系统 MUST 支持 `references/` 按需引用（Progressive Disclosure）与参数化选择

系统 MUST 支持在 Skill Package 内使用 `references/` 存放可扩展参考规范文件，并以 progressive disclosure 方式按需注入：默认仅索引/展示 refs 元数据，不在运行时自动把 refs 正文注入模型 Prompt；只有当用户选择（或 workflow 明确需要）时才读取并注入。

#### Scenario: 平台适配改写（refs 扫描 → 选择后按需加载）
- **WHEN** 用户触发“平台适配”类 SKILL（例如把文章改写成微信公众号/知乎/小红书/微博长文）
- **THEN** UI MUST 从该 SKILL 的 `references/` 目录扫描可用平台列表并展示给用户（文件名或 frontmatter 元数据）
- **THEN** 在用户选择目标平台前，系统 MUST NOT 读取并注入 refs 正文内容（避免无意义 token 占用）
- **THEN** 用户选择平台后，系统 MUST 读取所选 ref 文件正文，并将其作为本次运行的 skill-scoped 上下文注入到 Prompt（可在 Context Viewer 中可见来源与 token）

#### Scenario: refs 可扩展（用户自定义平台）
- **WHEN** 用户在该 SKILL 的 `references/` 新增一个 ref 文件（例如 `my-blog.md`）
- **THEN** 系统 MUST 增量发现并更新平台列表，无需重启
- **THEN** 新增 ref MUST 可被选择并参与生成（失败必须可观测、可恢复）

#### Scenario: refs 注入与 Token 预算
- **WHEN** 用户选择的 ref 文件导致本次 Prompt 超出 Token 预算（尤其是 low tier 模型）
- **THEN** 系统 MUST 先尝试选择更短的 skill variant（如 low-tier variant）并减少可选上下文层（settings/retrieved）
- **THEN** 若仍无法满足预算，系统 MUST 以可理解错误码失败（`INVALID_ARGUMENT`），并提示用户缩短 ref 内容或拆分为更小 refs

---

### Requirement: 系统 MUST 支持三种 SKILL 创建路径（手动 / AI 辅助 / 风格学习），并保证隐私与可撤销

#### Scenario: 手动编写（高级用户）
- **WHEN** 用户在 UI 中选择“新建 SKILL”
- **THEN** 系统 MUST 生成一份可编辑的 `SKILL.md` 模板，并提供校验/预览（含最终 Prompt 结构与 token 估算）

#### Scenario: AI 辅助创建（自然语言 → SKILL.md）
- **WHEN** 用户在 AI 面板/Skill Studio 输入“我想要一个用于 XX 的写作技能”并点击生成
- **THEN** 系统 MUST 产出候选 `SKILL.md`（含元数据、prompt、约束、上下文规则），并要求用户确认后才落盘
- **THEN** 生成过程 MUST 支持取消/重试，并在失败时返回可理解错误码（`TIMEOUT`/`CANCELED`/`UPSTREAM_ERROR` 等）

#### Scenario: 风格学习（历史作品 → 风格 SKILL）
- **WHEN** 用户选择“从作品学习风格”并授权范围（项目/选中文档/选定版本集）
- **THEN** 系统 MUST 在本地生成可审计的风格摘要与约束（优先本地模型/离线处理；若需云端必须明确提示并征得同意）
- **THEN** 用户 MUST 可一键撤销学习结果（删除生成的 SKILL 与中间产物）

---

### Requirement: 系统 MUST 支持 Skill Package（技能包）与 workflow（多步组合），并提供可解释的路由机制

#### Scenario: Skill Package 安装与启用
- **WHEN** 用户导入一个 Skill Package（本地目录/压缩包/市场下载）
- **THEN** 系统 MUST 校验 package 元数据与结构，解析其中多个 SKILL，并写入索引（包含来源、版本、许可证、作者等）
- **THEN** 用户 MUST 能启用/禁用整个 package 或其中单个 SKILL

#### Scenario: workflow（组合执行）
- **WHEN** 用户触发一个 workflow SKILL
- **THEN** 系统 MUST 以可取消、可恢复的方式按步骤执行（逐步产出中间结果并可回滚到原文）
- **THEN** 任一步失败 MUST 返回稳定错误码，并保证 pending 状态被清理（不得卡死在 loading）

#### Scenario: 路由（选择子 SKILL/变体）
- **WHEN** 一个 package/workflow 提供多个子 SKILL/变体（例如：不同文风、不同模型 tier）
- **THEN** 系统 MUST 在 “用户显式选择” 与 “自动路由” 间提供清晰优先级：
  1) 用户显式指定（固定使用）
  2) 自动路由（规则/语义/混合，取决于模型 tier）
  3) 兜底默认（稳定且可预测）

---

### Requirement: 多模型兼容 MUST 采用分层路由策略（顶级语义 / 中端混合 / 低端规则），并可在 UI 中解释

#### Scenario: 顶级模型（语义路由）
- **WHEN** 当前模型 tier 为 High（如 Claude 3.5 / GPT-4o）
- **THEN** 路由 SHOULD 可使用轻量语义分类选择子 SKILL/变体（并缓存结果），同时保留规则兜底

#### Scenario: 中端模型（规则 + 语义混合）
- **WHEN** 当前模型 tier 为 Mid
- **THEN** 路由 MUST 优先规则匹配（标签/关键词/上下文信号），语义仅用于消歧（且严格限制 token 开销）

#### Scenario: 低端模型（纯规则路由）
- **WHEN** 当前模型 tier 为 Low（本地小模型/小上下文窗口）
- **THEN** 路由 MUST 完全基于规则（不额外调用模型），并自动选择 “短 prompt / 少上下文” 变体

---

### Requirement: SKILL 演化 MUST 支持版本管理、升级助手与 A/B 对比（可选），并保留审计线索

#### Scenario: SemVer + 修订历史
- **WHEN** 用户升级一个 SKILL（例如 1.0.0 → 1.1.0）
- **THEN** 系统 MUST 记录升级来源、时间、变更摘要与可回滚点（文件层面与索引层面）

#### Scenario: 升级助手（旧版迁移）
- **WHEN** 系统检测到旧格式/旧字段（V1 DB-only 或旧 frontmatter）
- **THEN** MUST 提供升级建议与一键迁移（生成新 `SKILL.md`，并确保内置 3 SKILL 迁移后仍可运行）

#### Scenario: A/B 对比（可选开关）
- **WHEN** 用户对某 SKILL 开启 A/B 测试并执行多次
- **THEN** 系统 SHOULD 记录不同版本的效果信号（接受/拒绝率、回滚率、耗时、token 等），并提供可视化对比（不上传内容正文）

## Out of Scope（本规范不强制）

- 允许 skill 包携带可执行脚本并在本机运行（出于安全与治理，后续单独规范）
- 市场/云端同步的具体商业实现（仅要求本地导入导出与可扩展接口）
- “自动无限生长”的自我改写技能（仅定义升级与对比机制，不允许静默改写）

## Notes（实现约束与阶段）

- **P1（基础）**：格式落地 + 发现/索引 + UI 列表 + 手动/AI 辅助创建（不含 package 路由与风格学习）。
- **P2（组合）**：Skill Package + workflow + 路由（多模型兼容）。
- **P3（学习）**：风格学习与升级助手增强（隐私优先、本地优先）。

## References

- 核心规范：`openspec/specs/writenow-spec/spec.md`（「核心概念 → SKILL 系统」；数据库 schema 的 `skills` 表）
- Sprint 2：`openspec/specs/sprint-2-ai/spec.md`（SKILL 运行闭环与 IPC 边界）
- Sprint 2.5：`openspec/specs/sprint-2.5-context-engineering/spec.md`（`.writenow/` 与分层上下文）
- 研究材料：`docs/reference/agent-skills/README.md`（对比 Codex/Claude skills 与工程化载体）
