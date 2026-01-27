# Sprint：Theia Migration（验证 + 基础迁移）

## Purpose

本 Sprint 的目标是：**验证 Eclipse Theia 框架对 WriteNow 的可行性，并完成基础迁移**，为后续能力迭代建立一个**工业级可靠**、可裁剪、可扩展的应用框架与工程化基线。

本规范是 `openspec/specs/writenow-spec/spec.md` 在 “Theia 迁移” 范围内的可执行增量（Spec-first：PoC → Scaffold → Core Migration），并以本仓库治理规范 `AGENTS.md` 作为交付硬约束。

## Requirements

### Requirement: 在正式迁移前 MUST 完成 3 个关键 PoC 并形成明确结论

在投入大规模重写前，团队 MUST 用最短路径验证 Theia 迁移的三条主风险线，并把结论固化为可复现的 PoC 记录与决策文档（含限制、失败语义与回滚路径）。

#### Scenario: Theia + TipTap 集成 PoC（输入/焦点/快捷键）
- **WHEN** 团队在 Theia 前端实现一个最小 TipTap/ProseMirror Editor Widget
- **THEN** 必须验证输入法、焦点切换、全局/局部快捷键（尤其 Save/Undo/Redo/Cmd+K）可被一致治理（可解释、可调试、可扩展）

#### Scenario: Theia + native 依赖 PoC（better-sqlite3 + sqlite-vec）
- **WHEN** 团队在 Theia backend 加载 `better-sqlite3` 与 `sqlite-vec`
- **THEN** 必须验证扩展加载、建表、向量写入与查询在目标平台可运行，且打包/分发路径可明确（失败必须可观测）

#### Scenario: 存储语义 PoC（userData-first vs workspace-first）
- **WHEN** 团队将 WriteNow 的“项目/文件/DB/.writenow”概念映射到 Theia 的 workspace + file explorer 语义
- **THEN** 必须做出存储语义决策（userData-first 或 workspace-first，或明确的混合模型），并给出其对 File Explorer、索引器、watcher 与 E2E 测试的影响清单

---

### Requirement: MUST 使用 Theia 官方生成器搭建最小可运行应用壳体，并裁剪非必要模块

团队 MUST 以 `generator-theia-extension` 创建最小应用壳体（frontend + backend），并以“精简但可靠”为目标裁剪不需要的 IDE 模块，避免在迁移初期引入无关复杂度。

#### Scenario: 应用壳体最小闭环
- **WHEN** 应用启动
- **THEN** 必须具备可运行的 Theia shell、基础布局与稳定的扩展加载机制（frontend/backend contribution 可工作）

#### Scenario: 模块裁剪（移除非目标能力）
- **WHEN** 团队评估默认打包模块
- **THEN** 必须裁剪/禁用：调试器、终端、Git 面板、语言服务器、问题面板、任务运行器等不属于 WriteNow “创作 IDE” 的能力

#### Scenario: 品牌与基础布局可配置
- **WHEN** 团队配置应用外观
- **THEN** 必须完成应用品牌（名称/图标/主题入口）与基础布局（ActivityBar/Side panels/Main editor/AIPanel 等）骨架，且为后续 Widget 迁移提供明确插槽

---

### Requirement: MUST 实现 TipTap Editor Widget 并接入文件类型绑定与 Save/Dirty 生命周期

团队 MUST 在 Theia 中实现自定义 Editor Widget 嵌入 TipTap，并确保 `.md` 文件可以由该 Widget 打开；同时必须解决焦点与快捷键冲突，并接入 Theia 的保存/脏态生命周期，保证一致的用户体验与数据一致性。

#### Scenario: `.md` 文件使用 TipTap 打开
- **WHEN** 用户在 File Explorer 打开一个 `.md` 文件
- **THEN** 系统必须用 TipTap Editor Widget 打开该文件，并能正确读写磁盘内容（Markdown 作为 SSOT）

#### Scenario: 焦点与快捷键冲突可治理
- **WHEN** TipTap 编辑区获得焦点
- **THEN** 编辑器内部快捷键（输入/编辑）与 Theia 全局快捷键必须按“分层路由”策略协作，不允许出现不可解释的吞键/重复触发

#### Scenario: Save/Dirty 生命周期一致
- **WHEN** 文档被修改、保存、或保存失败
- **THEN** Theia shell 必须能正确展示 dirty 状态；保存失败必须可观测且可重试；成功保存必须清理 pending 状态（不允许卡死在保存中）

---

### Requirement: MUST 将 IPC 层迁移到 Theia RPC 机制，并复用现有 contract pipeline

团队 MUST 将现有 Electron IPC handlers 迁移到 Theia 的 JSON-RPC 机制，复用当前的 `handleInvoke` 注入模式与 IPC 合约 pipeline（合约 SSOT、生成、漂移护栏），避免迁移期出现“双栈并存”与契约漂移。

#### Scenario: `handleInvoke` 机制映射到 Theia RPC
- **WHEN** 团队在 Theia backend 注册一个“可调用能力”
- **THEN** 必须通过等价的 `handleInvoke(channel, handler)` 注册模式实现（可被 contract 工具识别），并通过 RPC 暴露到 frontend

#### Scenario: IPC 边界错误语义保持稳定
- **WHEN** backend handler 发生错误/超时/取消
- **THEN** MUST 返回可判定的 `ok: true|false` 结果（稳定错误码 + 可读信息），且不得向 frontend 泄漏堆栈与内部异常对象

#### Scenario: 合约漂移被 CI 阻断
- **WHEN** channel 集合或 payload/response 类型发生变更
- **THEN** contract pipeline 必须生成并校验一致（禁止手改生成文件），漂移必须被 CI/本地校验阻断

---

### Requirement: MUST 迁移数据层（SQLite/RAG/Embedding）并明确 native + 资产兼容性边界

团队 MUST 迁移 SQLite 初始化与 schema、RAG 管线（indexer/retrieval）、以及 Embedding 服务；并针对 native 模块与 ONNX/模型资产给出明确的兼容性验证路径（尤其跨平台分发与 CPU 特性差异）。

#### Scenario: SQLite 初始化与 schema 可复用
- **WHEN** Theia backend 启动并初始化 WriteNow 数据层
- **THEN** 必须完成 schema 初始化/迁移，并能在真实持久化路径落盘（可定位、可备份、可恢复）

#### Scenario: RAG 管线可运行
- **WHEN** 用户对项目执行索引/检索
- **THEN** indexer 与 retrieval 必须可工作（含 FTS + vec），并具备可观测的日志与失败恢复路径

#### Scenario: Embedding 服务资产兼容性被验证
- **WHEN** Embedding 服务在目标环境首次运行
- **THEN** 必须验证 ONNX 资产与 CPU/OS 兼容性；不兼容时必须有可观测的失败与降级/替代策略

## Out of Scope（本 Sprint 不包含）

- 知识图谱可视化的重写（**迁移时复用现有实现**，仅做接线与壳体迁移）
- SKILL Studio UI
- 时间线、人物出场追踪等新能力（在 Theia 框架稳定后再规划）
- `node-llama-cpp`（Judge 功能）：根据 PoC 结果决定是否保留/替换

## Notes

- 本 Sprint 创建后，以下既有规范工作应暂停以避免与迁移方向冲突：
  - `openspec/specs/wn-frontend-deep-remediation/`（暂停，待 Theia 框架落地后重规划）
  - `openspec/specs/skill-system-v2/`：任务 004–010 暂停；任务 001–003 的后端工作可选择性继续（需意识到 RPC/IPC 机制将改变）
  - `openspec/specs/sprint-ide-advanced/`：暂不启动（先有框架再谈能力）
  - Sprint 6 剩余任务暂停，待框架稳定后再恢复排期

## References

- 产品与路线图基线：`openspec/specs/writenow-spec/spec.md`
- 治理与交付约束：`AGENTS.md`
- 代码复用评估（含 PoC 建议顺序）：`CODEBASE_REUSABILITY_VIEWPOINT.md`
- GPT/Theia 调研结论（brain artifacts）：`brain_artifacts/theia-research-findings.md`
- Theia ↔ WriteNow 能力融合地图（brain artifacts）：`brain_artifacts/theia-wn-capability-map.md`

## 状态同步触发点

- Phase 0 PoC 全部通过 → 更新 writenow-spec 路线图，标记 PoC 完成
- Phase 1 框架搭建完成 → 更新 writenow-spec 架构章节，确认 Theia 为正式框架
- Phase 2 核心迁移完成 → 更新 writenow-spec，移除旧架构描述
- 任何 Phase 失败 → 更新 writenow-spec，记录失败原因和备选方案
