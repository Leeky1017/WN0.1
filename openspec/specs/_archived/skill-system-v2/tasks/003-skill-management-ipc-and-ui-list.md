# 任务 003: SKILL 管理 IPC + UI 列表（移除前端硬编码）

Status: done
Issue: #94
PR: https://github.com/Leeky1017/WN0.1/pull/101
RUN_LOG: openspec/_ops/task_runs/ISSUE-94.md

## 目标

提供技能列表与管理能力的 IPC 契约与实现：渲染进程通过 IPC 获取技能列表/详情/状态，并在 UI 中展示与触发；同时移除 `src/lib/skills.ts` 的硬编码内置列表，消除双源。

## 依赖

- 任务 002：SKILL 发现与索引服务（DB 中已有索引可供查询）

## 实现步骤

1. 扩展 IPC contract（`src/types/ipc-generated.ts`）：
   - `skill:list`：返回可用技能列表（含来源、版本、enabled、valid、错误摘要）
   - `skill:read`：读取某技能详情（含解析后的结构化定义、`references.slots`）
   - `skill:refs:list`（或等价能力）：返回某 skill 的 refs 可选项元数据（用于 UI 下拉；正文不返回）
   - `skill:toggle`：启用/禁用（技能或 package）
2. 主进程实现 IPC handlers：
   - 所有接口返回 `IpcResponse<T>`（禁止 throw 穿透）
   - 错误码稳定：`NOT_FOUND` / `INVALID_ARGUMENT` / `DB_ERROR` / `IO_ERROR`
3. 渲染进程 UI 接入：
   - AI 面板技能列表来自 IPC（取代 `BUILTIN_SKILLS`）
   - invalid skill 在 UI 中显示为不可用并展示错误提示（不影响其他技能）
   - 若 skill 声明了 refs slot（例如 platform），UI 在运行前展示可选项并收集参数
4. 保持现有 3 个内置技能可用：
   - skillId 保持兼容（例如 `builtin:polish`）
   - 触发与 Diff 体验不改变
5. E2E：真实 UI 交互验证
   - 列表可见 + 点击运行
   - invalid skill 不可运行且错误可见
   - refs slot 选择：新增/选择 ref 后运行可成功（或预算失败分支可观测）

## 新增/修改文件

- `electron/ipc/skills.cjs`（新增/修改）：skill:list/read/toggle
- `electron/ipc/contract/ipc-contract.cjs`（修改）：新增 channels
- `src/types/ipc-generated.ts`（自动生成更新）
- `src/components/AIPanel.tsx`（修改）：技能列表改为动态来源
- `src/stores/aiStore.ts`（修改）：运行前读取 skill 定义（替代 BUILTIN_SKILLS）
- `tests/e2e/`（新增/修改）：skill list + run + invalid 分支

## 验收标准

- [x] IPC 提供 skill:list/read/toggle，且所有失败分支有稳定错误码与可理解 message
- [x] AI 面板技能列表不再依赖硬编码常量，且内置 3 技能仍可触发
- [x] invalid skill 不可运行并在 UI 有明确提示（不影响其他技能）
- [x] E2E 覆盖列表展示、运行、错误分支

## 参考

- IPC 错误码：`src/types/ipc-generated.ts`
- 规范：`openspec/specs/skill-system-v2/spec.md`
