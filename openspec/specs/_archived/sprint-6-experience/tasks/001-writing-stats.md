# 任务 001: 创作统计功能（Writing Stats）

Status: done
Issue: #70
PR: https://github.com/Leeky1017/WN0.1/pull/73
RUN_LOG: openspec/_ops/task_runs/ISSUE-70.md

## 目标

实现可落地、可恢复的创作统计闭环：自动记录每日字数、写作时长（分钟）、创建文章数、使用 SKILL 次数，并在侧边栏统计视图与顶部状态栏中展示趋势与目标进度。

## 依赖

- 本地数据库能力（SQLite / `better-sqlite3`）
- 文件系统闭环（至少包含：创建/保存文档事件，用于统计入账）
- 任务 002：番茄钟（用于 `writing_minutes` 的最小闭环口径）
- （可选）Sprint 2 AI 能力：用于 `skills_used` 入账（可先预留 hook）

## 实现步骤

1. 明确统计口径（Sprint 6 最小闭环）：
   - `word_count`：以“保存成功后的正文内容”计算（建议对中文按非空白字符计数；对英文按词/空白分词可后续扩展）
   - `writing_minutes`：至少以番茄钟专注分钟累计（避免依赖复杂的活跃输入检测）
   - `articles_created`：在创建文档成功后入账（`+1`）
   - `skills_used`：在触发任意 SKILL 成功发送请求时入账（`+1`，Sprint 6 可仅打通统计通路）
2. 数据库与写入策略：
   - 按核心规范建立/迁移 `writing_stats` 表（`date` 主键，`YYYY-MM-DD` 本地日期）
   - 实现 `upsert`：按日期写入并做字段增量更新（避免读改写竞争）
   - 写入节流：按“保存成功/番茄钟完成”等确定性事件写入，避免每次输入都落盘
3. 主进程统计服务 + IPC：
   - 新增 `stats:*` IPC（例如：`stats:getRange`/`stats:getToday`/`stats:increment`）
   - 在 `preload` 暴露 `window.writenow.stats`，供渲染进程调用
4. 事件接入点（最小闭环）：
   - 文档创建成功：`articles_created += 1`
   - 文档保存成功：更新当日 `word_count`（建议按“当前文档最新字数”覆盖或按差量累计，需统一口径）
   - 番茄钟专注完成：`writing_minutes += N`
   - SKILL 使用：`skills_used += 1`（若 Sprint 6 未实现真实 AI，可先在 UI 交互处记录）
5. Zustand Store + UI 替换占位：
   - 新增 `src/stores/statsStore.ts`：加载今日/最近 7 天/累计统计
   - 将 `src/components/StatsBar.tsx`、`src/components/sidebar-views/StatsView.tsx` 的静态数据替换为真实数据
6. 目标与展示（可选但建议）：
   - 支持“每日目标字数”设置（先存于 `settings` 或 local config），用于状态栏进度条
   - 提供简单导出（CSV/JSON）以便用户备份（Sprint 6 可选）

## 新增/修改文件

- `electron/ipc/stats.cjs`（或 `electron/ipc/database.cjs`）- `writing_stats` 表初始化 + CRUD + 聚合查询（新增/修改）
- `electron/preload.cjs` - 暴露 `stats` API（修改）
- `src/stores/statsStore.ts` - 统计状态与加载/刷新动作（新增）
- `src/components/StatsBar.tsx` - 顶部统计条使用真实数据（修改）
- `src/components/sidebar-views/StatsView.tsx` - 侧边栏统计视图接入真实数据（修改）

## 验收标准

- [x] `writing_stats` 可持久化落盘，应用重启后统计不丢失
- [x] 保存文档后，当日 `word_count` 会按统一口径更新
- [x] 完成番茄钟专注阶段后，当日 `writing_minutes` 增量入账
- [x] 创建新文档后，当日 `articles_created` 增量入账
- [x] 统计视图展示今日与最近趋势（至少最近 7 天）

## 参考

- Sprint 6 规范：`openspec/specs/sprint-6-experience/spec.md`
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 839-846 行（`writing_stats` 表）
