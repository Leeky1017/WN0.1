# 任务 002: 番茄钟实现（Pomodoro Timer）

Status: done
Issue: #70
PR: https://github.com/Leeky1017/WN0.1/pull/73
RUN_LOG: openspec/_ops/task_runs/ISSUE-70.md

## 目标

实现稳定的番茄钟能力：支持专注/休息阶段、开始/暂停/继续/结束、可配置时长、跨重启恢复，并与创作统计联动（专注分钟计入 `writing_stats.writing_minutes`）。

## 依赖

- 任务 001：创作统计（用于 `writing_minutes` 入账）
- （可选）命令面板（任务 005）：用于快捷触发「开始/暂停番茄钟」

## 实现步骤

1. 定义状态机与数据模型：
   - 阶段：`focus` / `break`（可扩展 `long_break`）
   - 状态：`idle` / `running` / `paused`
   - 字段：`phase`、`remainingMs`、`startedAt`、`pausedAt`、`durations`（focus/break 分钟）
2. Zustand Store：
   - 新增 `src/stores/pomodoroStore.ts`，统一管理倒计时与 UI 状态
   - 倒计时建议基于时间戳计算（避免 `setInterval` 漂移），并处理系统休眠/唤醒
3. 持久化与恢复：
   - 将番茄钟状态写入本地（`settings` 表或 `localStorage`）
   - 重启后根据 `startedAt/pausedAt` 计算剩余时间，恢复到正确阶段（或弹出“是否恢复”提示）
4. UI 接入（优先最小改动）：
   - 将 `src/components/StatsBar.tsx` 的番茄钟占位逻辑迁移为使用 `pomodoroStore`
   - 提供最小设置入口：调整专注时长（与休息时长可选）
   - 阶段结束提示：in-app modal/toast；可扩展为系统通知（Electron）
5. 与创作统计联动：
   - 专注阶段完成时调用统计 API：`writing_minutes += focusMinutesCompleted`
   - 若中途结束，按策略决定是否入账（建议：仅对完成的整分钟入账或按实际秒数向下取整）

## 新增/修改文件

- `src/stores/pomodoroStore.ts` - 番茄钟状态机与持久化（新增）
- `src/components/StatsBar.tsx` - 使用 store 管理番茄钟与 UI（修改）
- `electron/ipc/stats.cjs` / `electron/preload.cjs` - 写作时长入账 API（若尚未提供）（修改）
- （可选）`electron/main.cjs` - 系统通知/托盘支持（新增/修改）

## 验收标准

- [x] 番茄钟支持开始/暂停/继续/结束，倒计时显示准确
- [x] 应用重启后番茄钟可恢复到正确状态（或给出明确恢复提示）
- [x] 专注阶段完成后，`writing_stats.writing_minutes` 会增量入账
- [x] 调整专注时长后，下一次番茄钟按新配置运行
- [x] 阶段结束有明确提示（至少 in-app）

## 参考

- Sprint 6 规范：`openspec/specs/sprint-6-experience/spec.md`
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 839-846 行（`writing_stats` 表）
