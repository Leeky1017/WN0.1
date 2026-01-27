# 任务 003: 云同步核心逻辑

## 目标

实现 Pro 用户的云同步最小闭环：将本地项目/文档等核心创作资产同步到 Supabase PostgreSQL，并支持新设备拉取、离线队列、失败可重试与可诊断（local-first，不阻塞本地写作）。

## 依赖

- 任务 001：Supabase Auth（用户身份与 `user_id`）
- 任务 005：Pro 权限控制（仅 Pro 可开启云同步）
- 本地数据模型（SQLite）已具备项目/文档等资产的持久化能力（来自 Sprint 5 及之前）

## 实现步骤

1. 同步范围与数据模型（最小集合）：
   - 明确 Sprint 7 同步范围：至少包含项目（projects）与文档/文章（articles/documents）
   - 设计云端表结构：包含 `user_id`、`updated_at`（或版本号）、以及删除标记（tombstone）策略
2. 同步引擎（客户端）：
   - 设计 `sync:*` IPC：`sync:enable` / `sync:disable` / `sync:run` / `sync:getStatus`
   - 实现本地队列：离线或失败时记录待同步变更（可基于事件或基于表扫描/游标）
3. 初始化同步（首次开启）：
   - 将本地数据上传并建立云端基线（或先拉取再合并，策略可选但必须可恢复）
4. 增量同步：
   - Push：本地变更 → 云端 upsert
   - Pull：云端变更 → 本地 upsert
   - 需要游标/水位线：避免每次全量扫描
5. 可见性与诊断：
   - 同步状态在 UI 可见（正在同步/失败/离线/冲突待处理）
   - 错误需包含可理解信息与重试入口

## 新增/修改文件（建议）

- `electron/ipc/sync.cjs` - 同步引擎与队列（新增）
- `electron/ipc/supabase.cjs` - Supabase client/请求封装（新增/修改）
- `src/stores/syncStore.ts` - 同步状态与触发（新增）
- `src/components/settings/CloudSyncSection.tsx` - 云同步开关与状态（新增/修改）

## 验收标准

- [ ] Pro 用户可开启云同步，并完成初始化同步
- [ ] 新设备登录后可拉取云端数据并本地落盘
- [ ] 离线写作产生的变更会进入队列，网络恢复后自动重试直至成功
- [ ] 同步失败可见且可重试，且不会影响本地写作与保存

## 参考

- Sprint 7 规范：`openspec/specs/sprint-7-cloud/spec.md`
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 376-379 行（数据存储：本地 SQLite / 云端 Supabase PostgreSQL）
