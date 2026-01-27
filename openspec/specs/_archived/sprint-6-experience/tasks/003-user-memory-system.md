# 任务 003: 外挂记忆系统（User Memory）

Status: done
Issue: #71
PR: https://github.com/Leeky1017/WN0.1/pull/77
RUN_LOG: openspec/_ops/task_runs/ISSUE-71.md

## 目标

实现外挂记忆（user memory）的最小可用闭环：支持记忆项的查看/新增/编辑/删除（区分全局与项目级），并在 AI 调用时按规则注入上下文；同时提供“本次注入了哪些记忆”的透明入口与开关控制。

## 依赖

- 本地数据库能力（SQLite / `better-sqlite3`）
- Sprint 2 AI 能力（或等价 AI 调用通路）：用于在请求构建阶段注入记忆
- （建议）命令面板（任务 005）：用于快速打开「记忆」面板

## 实现步骤

1. 数据库表与 CRUD：
   - 按核心规范建立/迁移 `user_memory` 表
   - 提供 CRUD：list（按 `project_id`/type 过滤）、create、update、delete
2. IPC + Preload API：
   - 新增 `memory:*` IPC（例如：`memory:list`/`memory:create`/`memory:update`/`memory:delete`）
   - 在 `preload` 暴露 `window.writenow.memory`
3. 渲染进程状态管理：
   - 新增 `src/stores/memoryStore.ts`：记忆列表、过滤、保存状态、错误状态
4. UI（最小闭环）：
   - 新增侧边栏视图（例如 `src/components/sidebar-views/MemoryView.tsx`）展示与编辑记忆项
   - 记忆项字段：type（`preference`/`feedback`/`style`）、content、scope（global/project）
   - 提供开关：启用/禁用“记忆注入”
5. 注入策略（AI 请求构建阶段）：
   - 组装顺序建议：用户偏好（preference）→ 项目知识（后续扩展）→ 历史反馈（feedback）
   - 遵循“最小必要”：默认只注入最近/最相关若干条（数量与长度需限制）
   - 提供透明入口：显示本次注入记忆列表（用于审计/排查）

## 新增/修改文件

- `electron/ipc/memory.cjs`（或 `electron/ipc/database.cjs`）- `user_memory` 表 + CRUD（新增/修改）
- `electron/preload.cjs` - 暴露 `memory` API（修改）
- `src/stores/memoryStore.ts` - 记忆状态管理（新增）
- `src/components/sidebar-views/MemoryView.tsx`（或在 Settings/AI Panel 中实现）- 记忆管理 UI（新增）
- （可选）`src/stores/aiStore.ts` / `electron/ipc/ai.cjs` - AI 请求构建处注入记忆（修改）

## 验收标准

- [x] 支持新增/编辑/删除记忆项，重启后仍存在（持久化）
- [x] 记忆项支持全局与项目级区分（`project_id` 可为空）
- [x] AI 调用时会按规则注入记忆（可通过日志/可视化入口确认）
- [x] 用户可查看“本次注入了哪些记忆”，并可关闭记忆注入

## 参考

- Sprint 6 规范：`openspec/specs/sprint-6-experience/spec.md`
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 265-294 行（外挂记忆系统理念/注入/更新）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 829-837 行（`user_memory` 表）
