# Sprint：Open Source Optimization（开源方案优化）

## 元信息

| 字段 | 值 |
|------|-----|
| 规范名称 | sprint-open-source-opt |
| 状态 | Draft |
| 创建时间 | 2026-01-27 |
| 上游依赖 | writenow-spec/spec.md, api-contract/spec.md |
| 输入来源 | `.cursor/plans/wn_open_source_optimization_c81686d6.plan.md` |
| 目标 | 基于成熟开源/第三方方案优化 WriteNow：降低 LLM 成本、补齐编辑器 AI 交互（Diff/Suggestion + Tab 续写）、完善 E2E、评估知识图谱与多模型统一 |

---

## 技术栈锁定（必读 · 禁止替换）

> **警告**：以下技术选型已经过评估并锁定。执行任务时 **禁止替换为其他方案**。如需变更，必须先提交 RFC 并获得批准。

### 必读设计文档

执行任何工程任务前，**必须先阅读以下设计文档**：

| 文档 | 路径 | 说明 |
|------|------|------|
| 整体策略概述 | `design/00-overview.md` | 范围、分期、关键权衡 |
| Prompt Caching | `design/01-prompt-caching.md` | OpenAI/Anthropic 原生缓存接入与观测 |
| TipTap AI Extension | `design/02-tiptap-ai-extension.md` | 自研 Diff/Suggestion Extension 设计 |
| 本地 LLM Tab 续写 | `design/03-local-llm-tab.md` | node-llama-cpp、模型下载与 UX |
| Graphiti 评估 | `design/04-graphiti-evaluation.md` | Graphiti 可行性与 SQLite 图模拟 |
| LiteLLM Proxy | `design/05-litellm-proxy.md` | 多模型统一（可选） |

### 锁定的核心技术（禁止替换）

| 类别 | 锁定选型 | 禁止替换为 |
|------|---------|-----------|
| Prompt Caching | **OpenAI / Anthropic 原生 Prompt Caching** | 自建 prompt cache 服务（如 Redis/自研缓存层）作为 P0 默认路径 |
| 编辑器 AI Diff | **TipTap Extension + ProseMirror Plugin/Decorations** | 付费 TipTap AI Toolkit（本 Sprint 默认不采购） |
| 本地 LLM | **node-llama-cpp（llama.cpp Node 绑定，Electron 支持）** | 需要独立守护进程/复杂安装链路的本地推理栈（默认） |
| E2E | **Playwright（Electron E2E）** | 仅单元/组件测试替代 E2E |
| 知识图谱评估 | **Graphiti（Zep）评估路径 + SQLite 图模拟先行** | 直接引入 Neo4j 作为硬依赖（评估前） |
| 多模型统一（可选） | **LiteLLM Proxy** | 多套 provider SDK + 多套路由/重试逻辑并存 |

---

## Purpose

本 Sprint 将 `.cursor/plans/wn_open_source_optimization_c81686d6.plan.md` 的路线图转化为可执行 OpenSpec 规范与任务卡。

核心原则：
- **不造轮子**：优先使用成熟方案（Provider 原生缓存、Playwright、LiteLLM 等）。
- **本地优先**：本地 LLM / 本地持久化为桌面产品核心差异化。
- **单链路**：不保留双栈并存（可选能力必须明确开关、默认路径唯一）。

---

## Requirements

### Requirement: LLM 调用 MUST 启用 Provider 原生 Prompt Caching（P0）

系统 MUST 通过 OpenAI/Anthropic 提供的原生 Prompt Caching 降低重复上下文 token 成本，并保持回退路径可用。

#### Scenario: OpenAI 请求结构可稳定命中缓存
- **WHEN** WriteNow 调用 OpenAI Chat/Responses 生成
- **THEN** system 指令与工具/格式定义 MUST 保持稳定前缀（避免每次请求前缀漂移）
- **AND THEN** 调用方 MUST 将可缓存部分放在 prompt 前部（确保满足 provider 的缓存命中前置条件）

#### Scenario: Anthropic 请求显式启用 ephemeral cache
- **WHEN** WriteNow 调用 Anthropic Messages API
- **THEN** system block 中的稳定前缀 MUST 设置 `cache_control: { type: 'ephemeral' }`
- **AND THEN** 仅稳定、可复用的指令块 SHOULD 被标记为可缓存（避免把用户敏感内容误纳入缓存块）

#### Scenario: 缓存不可用时仍可用且可诊断
- **WHEN** provider 不支持/拒绝缓存或命中率极低
- **THEN** 系统 MUST 自动回退为非缓存调用路径
- **AND THEN** 必须记录可观测指标（命中/未命中/节省 token 估算）以便诊断

---

### Requirement: 编辑器 MUST 提供自研 TipTap AI Diff/Suggestion 能力（P1）

编辑器 MUST 通过自研 TipTap Extension 实现 AI 改写的 **Diff 高亮 + Accept/Reject**，并与现有 streaming 基础能力集成。

#### Scenario: AI streaming 过程中显示实时 diff/suggestion
- **WHEN** 用户在编辑器触发 AI 改写并接收 streaming delta
- **THEN** 编辑器 MUST 以 decoration/mark 的形式展示 AI 建议（新增/删除/替换的差异表达必须可视）
- **AND THEN** UI MUST 提供 Accept/Reject 操作且可在键盘与鼠标两种路径完成

#### Scenario: Accept/Reject 的失败语义明确且可恢复
- **WHEN** 用户点击 Reject 或取消本次 AI 运行
- **THEN** 编辑器 MUST 清理所有临时 decoration 并恢复到一致状态（不得残留“幽灵高亮”）
- **AND THEN** 若撤销失败/文档版本漂移，系统 MUST 给出可判定错误并允许重试

#### Scenario: 版本系统与 diff 应用一致
- **WHEN** 用户 Accept AI 修改
- **THEN** 系统 MUST 将应用后的内容作为新版本写入版本历史（或等价的持久化版本节点）
- **AND THEN** 版本 diff MUST 能解释“应用了哪些建议”（至少可追溯到 runId/时间戳）

---

### Requirement: 系统 MUST 提供本地 LLM 的 Tab 续写（P1）

系统 MUST 提供 Cursor 风格的 Tab 续写：停顿触发、灰色预览、Tab 接受、Esc 取消，并默认不要求用户下载模型（按需 opt-in）。

#### Scenario: 未下载模型时功能可关闭且不报错
- **WHEN** 用户未启用本地续写或本地模型不存在
- **THEN** UI MUST 显示“未启用/未安装模型”的可理解状态
- **AND THEN** 不得在控制台/日志中产生噪声级异常（除非用于诊断且可被聚合）

#### Scenario: 停顿触发 + 取消语义正确
- **WHEN** 用户停止输入达到触发阈值（如 800ms）
- **THEN** 系统 SHOULD 在后台调用本地 LLM 生成短续写
- **AND THEN** 用户继续输入/切换文档/光标移动 MUST 取消正在进行的生成并清理 ghost suggestion

#### Scenario: 用户确认后才下载模型且进度可观测
- **WHEN** 用户在设置页选择启用本地续写
- **THEN** 系统 MUST 明示模型体积/存储位置/离线可用性，并获得用户确认后下载
- **AND THEN** 下载 MUST 提供进度（percent / bytes）与失败可重试能力

---

### Requirement: E2E 测试 MUST 覆盖核心用户路径（P2）

项目 MUST 使用 Playwright（含 Electron 目标）为核心用户路径提供真实 E2E 覆盖：真实 UI、真实持久化、真实 IPC（禁止 stub）。

#### Scenario: 核心创作路径可回归
- **WHEN** CI 或开发者运行 `npx playwright test`
- **THEN** MUST 覆盖：启动应用 → 创建/打开文档 → 编辑 → 保存/自动保存 → 关闭重开验证持久化

#### Scenario: AI 路径包含边界分支
- **WHEN** 运行 AI 改写/Tab 续写相关用例
- **THEN** MUST 覆盖：成功、取消（CANCELED）、超时（TIMEOUT）、上游错误（UPSTREAM_ERROR）等分支
- **AND THEN** 任一失败 MUST 留下可定位证据（截图/trace/日志）

---

### Requirement: 知识图谱方案 MUST 以 Graphiti 为目标进行评估（P2）

团队 MUST 对 Graphiti 进行可行性评估，并以 **SQLite 图模拟** 作为先行验证路径。

#### Scenario: 先验证需求再引入重依赖
- **WHEN** 团队需要验证“人物/设定关系检索 + 时序事实”能力
- **THEN** MUST 先在本地 SQLite 中用关系表模拟图结构完成 PoC
- **AND THEN** 评估报告 MUST 给出是否引入 Neo4j/托管服务的决策建议与风险清单

---

### Requirement: 系统 MUST 支持通过 LiteLLM Proxy 进行多模型统一（P3，可选）

系统 MUST 支持通过 LiteLLM Proxy 统一 OpenAI/Anthropic 等多模型接口，并提供缓存、fallback 与观测；该能力 MUST 以可选开关形式存在（默认关闭）。

#### Scenario: 默认路径不引入额外进程
- **WHEN** 用户未开启 LiteLLM Proxy
- **THEN** 系统 MUST 继续使用现有 provider SDK 直连路径

#### Scenario: 开启后路由与缓存可验证
- **WHEN** 用户开启 LiteLLM Proxy 并配置模型列表
- **THEN** 关键请求 MUST 经过 Proxy 且可通过日志/指标验证
- **AND THEN** 缓存命中与 fallback MUST 可观测

---

## 三、记忆层（引用，不在本 Sprint 重复定义）

记忆层方案 **MUST** 以 `sprint-ai-memory` 规范为准。本 Sprint 不重复定义记忆层的架构/数据模型/任务拆解。

- 参考：`openspec/specs/sprint-ai-memory/spec.md`
