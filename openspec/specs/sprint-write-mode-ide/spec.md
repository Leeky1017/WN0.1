# Sprint：IDE Write Mode（低成本 · 高质量 · 性能优先）

## 元信息

| 字段 | 值 |
|------|-----|
| 规范名称 | sprint-write-mode-ide |
| 状态 | Draft |
| 创建时间 | 2026-01-27 |
| 上游依赖 | `openspec/specs/writenow-spec/spec.md`, `openspec/specs/api-contract/spec.md`, `openspec/specs/sprint-open-source-opt/spec.md`, `openspec/specs/sprint-ai-memory/spec.md` |
| 目标 | 用相对最低的研发成本，交付“体验/性能优先”的 IDE Write Mode（写作主路径），并通过强制质量门禁（真实 E2E + 可观测性）保持高质量 |
| 关键约束 | 安装包体积不设上限；性能与体验优先；旧实现若不如新方案 MUST 统一到新实现（禁止向后兼容/双栈并存） |

---

## 技术栈锁定（必读 · 禁止替换）

> **警告**：以下技术选型已经过评估并锁定。执行任务时 **禁止替换为其他方案**。如需变更，必须先提交 RFC 并获得批准。

### 必读设计文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 总体策略与分期 | `design/00-strategy.md` | “低成本/高质量”执行策略、DoD、质量门禁 |
| Write Mode 形态 | `design/01-write-mode-ux.md` | 交互与 UI 结构（Focus/Write Mode） |
| 编辑器性能方案 | `design/02-editor-performance.md` | 性能预算、测量方法、TipTap/渲染优化 |
| 质量门禁与观测 | `design/03-quality-gates.md` | E2E 测试矩阵、性能回归、日志与诊断 |
| 单链路迁移与清理 | `design/04-migration-unification.md` | 移除旧路径/双栈、契约对齐、收口规则 |
| 打包与分发策略 | `design/05-packaging.md` | “体积换体验”的策略（模型随包、预编译、更新） |

### 锁定的核心技术（禁止替换）

| 类别 | 锁定选型 | 禁止替换为 |
|------|---------|-----------|
| 前端 | **Vite + React + TypeScript（严格模式）** | 任何降低类型安全与可维护性的替换 |
| UI 组件 | **shadcn/ui + Radix UI** | 另起一套组件库体系 |
| 编辑器 | **TipTap（ProseMirror）** | Monaco/Quill/Slate（写作主编辑器） |
| 桌面容器 | **Electron + electron-vite** | 引入第二套桌面容器并存 |
| 状态管理 | **Zustand** | Redux/MobX 双栈并存 |
| E2E | **Playwright（真实 UI + 真实持久化 + 真实 IPC）** | stub/假数据/只做 unit 测试代替 E2E |
| AI 优化 | **Provider 原生 Prompt Caching +（可选）本地 LLM** | 自建缓存双栈、或在业务层堆叠多 provider 逻辑 |

---

## Purpose

WriteNow 的价值来自“写作主路径”的极致体验：打开项目 → 进入 Write Mode → 连续输入与编辑 → 保存与恢复 → AI 辅助（可控/可取消/可追溯）→ 版本对比。

本 Sprint 的交付目标是：

1. **把 Write Mode 定义成产品级 SSOT**：明确 UI 形态、交互模型、性能预算与质量门禁。
2. **把“低成本/高质量”变成工程约束**：以最少的代码与最少的分叉实现最高质量（单链路、强门禁、可观测）。
3. **把旧实现统一到新实现**：任何旧路径若不如新方案，必须替换而不是兼容。

### Non-goals（明确不做，以降低成本）

- 本 Sprint **不**引入云同步/多人协作/账号体系。
- 本 Sprint **不**追求“支持所有 Markdown/富文本特性”，只做写作主路径所需最小集合（其余按任务卡增量）。
- 本 Sprint **不**复制第二套编辑器/第二套 AI 入口（禁止双栈），所有新能力必须进入 Write Mode 的唯一链路。

---

## Requirements

### Requirement: Write Mode MUST 成为桌面端的默认写作主路径

WriteNow 桌面端 MUST 以 Write Mode 为默认工作流入口（面向“创作连续输入”设计），并保证在不理解 Markdown 的情况下也能高效写作。

#### Scenario: 启动后进入可写状态
- **WHEN** 用户启动应用并打开最近项目/新建项目
- **THEN** 应用 MUST 在可接受时间内进入“可编辑”状态（光标可输入、无阻塞弹窗）
- **AND THEN** 默认视图 MUST 为 Write Mode（内容居中、干扰最小、写作主操作可达）

#### Scenario: Focus/Zen 模式作为 Write Mode 的子状态
- **WHEN** 用户触发 Focus/Zen（快捷键或命令面板）
- **THEN** 应用 MUST 隐藏非必要 UI（侧栏/状态栏/工具栏按规则折叠）并保留必要反馈（保存状态、字数、错误提示）
- **AND THEN** 用户 MUST 可用 `Esc` 或相同快捷键退出且状态可持久化

---

### Requirement: Write Mode MUST 有明确的交互模型（键盘优先）

Write Mode MUST 提供键盘优先的 IDE 级交互：文件切换、命令面板、保存、撤销/重做、AI 取消、版本对比。

#### Scenario: 键盘可完成写作闭环
- **WHEN** 用户仅使用键盘写作
- **THEN** MUST 可完成：打开命令面板 → 打开/创建文档 → 编辑 → 保存 → 查看版本历史 → 回退

#### Scenario: 冲突与快捷键策略稳定
- **WHEN** 快捷键在不同 OS/布局下存在冲突
- **THEN** 系统 MUST 有稳定优先级规则（以写作主路径优先）
- **AND THEN** 所有关键快捷键 MUST 在设置页可发现且可修改（或至少可禁用）

---

### Requirement: 命令面板（Command Palette）MUST 成为 Write Mode 的“第一入口”

Write Mode MUST 内建命令面板，用于“低成本统一入口”（避免按钮散落、行为不可发现）。命令面板 MUST 覆盖：
- 文件：快速打开/新建/重命名/删除
- 写作：切换 Focus/Zen、切换编辑模式（rich/markdown）、查找替换
- AI：打开 AI Panel、运行 Skill、取消 AI、接受/拒绝当前 diff（如存在）
- 设置：打开设置（主题、快捷键、AI provider、本地模型）

#### Scenario: 以键盘打开命令面板并打开文件
- **WHEN** 用户按下 `Cmd/Ctrl+K`
- **THEN** 命令面板 MUST 打开并可立即输入检索（无需鼠标聚焦）
- **AND THEN** 用户选择某个文件项后，编辑器 MUST 打开对应文件并进入可输入状态

#### Scenario: 命令面板的“最近使用”降低重复成本
- **WHEN** 用户使用命令面板打开文件/执行命令/运行 Skill
- **THEN** 系统 MUST 记录“最近使用”并在下一次打开时优先展示（数量/持久化规则见 `design/01-write-mode-ux.md`）

---

### Requirement: 文件树（Explorer）MUST 使用真实后端数据并支持基础文件操作

Write Mode MUST 以真实后端（`file:*` 通道）驱动文件树与文件操作，禁止主路径使用静态 stub 数据。

#### Scenario: 文件列表与创建/删除可用
- **WHEN** 用户进入 Write Mode
- **THEN** 文件树 MUST 展示真实 `file:list` 返回的文档
- **AND THEN** 用户创建/删除文件时，系统 MUST 通过 `file:create` / `file:delete` 执行并实时刷新 UI

#### Scenario: 重命名必须保持内容不丢失
- **WHEN** 用户重命名文件
- **THEN** 系统 MUST 保证重命名前内容完整迁移到新文件（实现可为 read→create→write→delete；细节见 `design/04-migration-unification.md`）

---

### Requirement: 性能与体验 MUST 通过“可量化预算”约束

项目 MUST 为 Write Mode 定义性能预算，并在 CI/回归中持续监测，任何回归必须阻断合并或提供明确豁免记录。

#### Scenario: 输入延迟预算
- **WHEN** 用户在中等规模文档中连续输入
- **THEN** 关键输入路径 MUST 保持低延迟（无明显掉帧；输入与渲染不阻塞）

#### Scenario: 大文档与大项目可用
- **WHEN** 项目文件数与文档长度达到“极限规模”（明确阈值见 `design/02-editor-performance.md`）
- **THEN** 应用 MUST 仍可编辑、保存与切换文件，不得出现卡死或长时间无响应

---

### Requirement: 数据可靠性 MUST 达到“写作 IDE 级别（不丢稿）”

Write Mode MUST 实现本地优先的可靠保存与恢复策略：自动保存、崩溃恢复、明确的 dirty 状态、可诊断错误。

#### Scenario: 自动保存与断电恢复
- **WHEN** 用户在编辑过程中应用崩溃/强制退出
- **THEN** 重启后 MUST 恢复到最近可恢复内容（至少保证“最后一次自动保存”可恢复）
- **AND THEN** 恢复过程 MUST 可解释（恢复点时间戳/来源）

#### Scenario: 保存失败可观测且可重试
- **WHEN** 保存发生 I/O 错误或权限问题
- **THEN** UI MUST 显示可理解错误并允许重试/另存为
- **AND THEN** 错误 MUST 以稳定错误码落地（不得只打印 console）

---

### Requirement: 可观测性 MUST 覆盖 Write Mode 全链路（便于低成本排障）

Write Mode 的关键链路 MUST 可观测并可复现诊断：
- 性能：必须有可读取的 `performance.mark/measure`（编辑器就绪、文件切换、保存、AI 取消清理）
- 可靠性：保存失败/恢复必须有稳定错误码与可读信息
- AI：runId、状态（thinking/streaming/canceled/timeout）必须可见且可落盘

#### Scenario: 失败可定位
- **WHEN** 用户报告“卡顿/保存失败/AI 卡住”
- **THEN** 系统 MUST 能提供最小诊断包：main log + renderer log（如有）+（E2E 场景）Playwright trace
- **AND THEN** 日志 MUST 不包含敏感信息（API key/prompt 明文/完整文件路径等）

---

### Requirement: AI 能力 MUST 与 Write Mode 融合且保持“可控/可取消/可追溯”

Write Mode 中的 AI（改写、diff、tab 续写、本地模型）MUST 具备：
- 用户确认才应用（diff/accept/reject）
- 取消/超时语义明确（`CANCELED`/`TIMEOUT`）
- 可追溯（runId、版本节点、观测）

#### Scenario: AI Diff 必须在编辑器内可读
- **WHEN** 用户触发 AI 改写
- **THEN** 系统 MUST 以可读方式展示 diff，并提供 Accept/Reject
- **AND THEN** Accept 后 MUST 形成新版本节点并可对比

#### Scenario: Tab 续写不依赖网络（可选）
- **WHEN** 用户启用本地 LLM Tab 续写
- **THEN** 系统 SHOULD 在离线环境仍可工作
- **AND THEN** 未启用/未安装模型时 MUST 无噪声异常且状态可理解

> AI 成本与开源方案优化细节：见 `openspec/specs/sprint-open-source-opt/spec.md`。

---

### Requirement: 质量门禁 MUST 以“真实 E2E”作为主标准

任何影响 Write Mode 主路径的变更 MUST 有真实 E2E 测试覆盖（真实 UI + 真实持久化 + 真实 IPC），并覆盖边界分支（取消/超时/错误码）。

#### Scenario: 主路径 E2E 覆盖
- **WHEN** CI 运行 E2E
- **THEN** MUST 覆盖：启动 → 打开文档 → 输入 → 自动保存 → 关闭重开验证内容

#### Scenario: AI 边界分支覆盖
- **WHEN** CI 运行 AI 相关 E2E
- **THEN** MUST 覆盖：成功、取消、超时、上游错误，并在失败时落盘 trace/screenshot

---

### Requirement: E2E 稳定性 MUST 依赖“稳定选择器与可控测试环境”

为了降低维护成本，Write Mode MUST 提供稳定的 UI 选择器（`data-testid`）与可控的 E2E 环境开关（独立 userData、禁用自动更新等）。

#### Scenario: 选择器稳定
- **WHEN** UI 结构重构（布局/组件拆分）
- **THEN** 关键路径的 `data-testid` MUST 保持稳定（例如 `tiptap-editor`、`wm-save-indicator`、`ai-panel`、`cmdk`）

#### Scenario: E2E 环境可重复
- **WHEN** Playwright 在 CI 或本地运行
- **THEN** 测试 MUST 使用隔离的 `WN_USER_DATA_DIR=<tmp>` 并确保不会污染真实用户数据
- **AND THEN** 自动更新/首次引导等非主路径流程 MUST 在 E2E 模式下可被跳过或稳定处理（具体开关见 `design/03-quality-gates.md`）

---

### Requirement: 旧实现 MUST 统一到新实现（禁止双栈并存）

为保持最低维护成本与最高质量，系统 MUST 采用“单链路”策略：
- 新方案落地即替换旧方案
- 不保留向后兼容代码路径
- 任何迁移必须提供明确“删除点”（remove-by date / PR）

#### Scenario: 禁止双入口与双状态
- **WHEN** 新旧实现都能完成同一用户任务
- **THEN** 必须选择更优实现作为唯一入口，并删除另一条路径

#### Scenario: 契约对齐与类型 SSOT
- **WHEN** IPC/JSON-RPC/数据模型发生变更
- **THEN** MUST 以 `src/types/ipc-generated.ts` 作为唯一契约基线并通过自动化校验阻断漂移

---

## 三、记忆层（引用，不在本 Sprint 重复定义）

记忆层方案 MUST 以 `openspec/specs/sprint-ai-memory/spec.md` 为准。本 Sprint 不重复定义记忆层的架构/数据模型/任务拆解。
