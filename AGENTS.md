# WriteNow — Agent Instructions

本仓库目标：构建一个 AI 驱动的文字创作 IDE（创作者的 Cursor）。

## 规范导航（Agent 阅读顺序：1 → 5）

1) 宪法与治理：`AGENTS.md`
2) 项目规范（产品/架构/路线图）：`openspec/specs/writenow-spec/spec.md`
3) 当前 Sprint（Theia 迁移）：`openspec/specs/sprint-theia-migration/spec.md`
4) 任务执行（任务清单）：`rulebook/tasks/issue-N-slug/`
5) 运行证据（运行日志）：`openspec/_ops/task_runs/ISSUE-N.md`

补充：工程标准（入口与指针）
- 工程规范入口：`docs/README.md`
- 代码规范：`docs/code-standards.md`
- 测试规范：`docs/testing-standards.md`
- Style guard：`docs/style-guard.md`

## 文档权威（必须遵守）

- 项目权威规范（产品/架构/路线图）：`openspec/specs/writenow-spec/spec.md`
- Sprint 增量规范：`openspec/specs/sprint-*/spec.md`（必须引用并保持与 `writenow-spec` 一致）
- 本文件（治理/执行规范）：`AGENTS.md`
- `AGENTS.md` 与 `writenow-spec` 必须双向引用：
  - 从 `AGENTS.md` 进入 `writenow-spec` 了解项目与路线图
  - 从 `writenow-spec` 进入 `AGENTS.md` 了解治理与交付约束
- `docs/` 仅保留入口/指针，禁止形成第二套规范体系

## 宪法级约束（必须遵守）

### 代码质量
- 代码必须同时“正确”和“好”
- 正确：功能符合需求；边界处理完备；失败路径可观测且可恢复
- 好：可读性强、可维护、可测试、风格一致
- 禁止 `any` 类型；类型必须完备（TS 严格模式下可编译）
- 注释只解释 why（原因/约束/不变量），不写 what（实现细节复述）

### 一致性
- 全项目必须始终保持统一（命名、结构、错误处理、状态管理）
- 必须遵循已定义的契约规范（尤其是 IPC contract：`src/types/ipc-generated.ts`）

### 测试
- 所有功能必须有 E2E 测试（用户路径优先）
- 每个关键节点必须做极限/边界测试（空值、极值、取消、超时、错误码分支）
- 禁止使用假数据/stub 测试（E2E 必须走真实持久化与真实 UI 交互）
- 禁止“假装测试”：未运行就宣称通过；未断言就宣称覆盖
- 宁可多测，不要省事

## 代码原则（必须遵守）

- 拒绝隐式注入：所有依赖必须显式传入（函数参数/构造参数/React props + context 明确 Provider）；禁止在业务逻辑中读取全局状态/魔法变量（`window`/`globalThis`/随机环境变量/隐式单例）。
- 一条链路一套实现：禁止“向后兼容/双栈并存”；升级即替换旧实现，不保留两套代码路径。
- 不写非必要代码：禁止过度抽象；禁止“未来可能用到”的工具函数/通用层；先跑通最短链路再扩展。
- 显式注释：
  - 新增/修改的函数与功能必须有 JSDoc，说明 why（设计意图/约束/不变量/失败语义）。
  - 复杂逻辑必须有行内注释，说明 why（为什么这么做、哪些边界要保护）。

## 异常与防御性编程（必须遵守）

- IPC 边界必须返回可判定结果：必须使用 `IpcResponse<T>`（`ok: true|false`）并提供稳定错误码与可读信息（`error.code` + `error.message`）；禁止把异常/堆栈穿透到渲染进程。
- 禁止 silent failure：任何 `catch` 必须显式处理（返回 `IpcErr` / rethrow / 上报日志），不得吞掉异常或只打印不改变状态。
- 超时/取消必须有明确状态：
  - IPC 错误码必须使用 `TIMEOUT` / `CANCELED`（见 `src/types/ipc-generated.ts`）。
  - UI/状态机必须能区分“失败 / 超时 / 取消”，并保证 pending 状态被清理（不会卡死在 loading）。

## 工作留痕（任务执行流程，必须遵守）

### 0) 入口与隔离

- GitHub 是并发与交付唯一入口：Issue → Branch → PR → Checks → Auto-merge
- Issue 号 `N` 是任务唯一 ID：
  - 分支名：`task/<N>-<slug>`
  - 每个 commit message 必须包含 `(#N)`
  - PR body 必须包含 `Closes #N`
- 必须使用 worktree 隔离开发（控制面 `main` + 工作面 worktree）：
  - `git fetch origin`
  - `git worktree add -b "task/${N}-${SLUG}" ".worktrees/issue-${N}-${SLUG}" origin/main`

### 1) RUN_LOG（强制）

- 开始任何实现前，必须创建运行日志：`openspec/_ops/task_runs/ISSUE-<N>.md`
- 日志必须按优秀实例格式书写：`openspec/_ops/task_runs/ISSUE-51.md`、`openspec/_ops/task_runs/ISSUE-52.md`
- 每个关键步骤必须记录：Command + Key output + Evidence（路径/文件/链接）；`Runs` 章节只追加不回写

### 2) Task card 收口（强制）

- 若该 Issue 对应 OpenSpec task card（`openspec/specs/**/task_cards/*.md` 或 `openspec/specs/**/tasks/*.md`）：
  - 完成后必须将验收标准从 `- [ ]` 改为 `- [x]`（不得遗漏）
  - 顶部必须补齐完成状态元数据（完成后追加/补充，示例）：
    - `Status: done`
    - `Issue: #<N>`
    - `PR: <link>`
    - `RUN_LOG: openspec/_ops/task_runs/ISSUE-<N>.md`

### 3) Sprint Spec 状态同步（强制）

- 当某 Sprint 的任务完成并合并后，必须同步 `openspec/specs/writenow-spec/spec.md` 顶部状态与路线图进度，确保不会与实际实现漂移。

### 4) 状态同步（强制）

- 当项目状态发生以下变化时，必须同步更新上游文档，禁止文档滞后于实际状态：
  - Sprint 重大里程碑完成（PoC 全部通过、Phase 完成、Sprint 结束）时，必须更新 writenow-spec 的“当前状态”和“路线图”章节。
  - 架构决策变更（如 Theia 迁移确认）时，必须更新 writenow-spec 的“系统架构”章节。
  - 工作暂停或恢复时，必须更新 writenow-spec，说明哪些 Spec 已暂停及原因。
- 违反此规则视为任务未完成。

## 禁止事项（硬禁）

- 禁止兼容旧方案/保留两套实现（有问题就替换，不留双路径）
- 禁止假数据/stub 测试；禁止“写个测试但不跑”
- 禁止不做验证就说“已完成”（最少：lint/test/e2e/openspec 的相关门禁需有证据）
- 禁止 silent failure（任何失败必须可观测、可定位、可恢复或可重试）

## 当前 Sprint / 进度

当前 Sprint 状态与路线图以 `openspec/specs/writenow-spec/spec.md` 为准（禁止在本文件重复维护进度清单以避免漂移）。
