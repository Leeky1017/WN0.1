# FRONTEND-P0-001: 设计 Tokens SSOT + Light/Dark 映射

Status: done
Issue: #86
PR: <fill-after-created>
RUN_LOG: openspec/_ops/task_runs/ISSUE-86.md

## Goal

建立 WriteNow 前端的 Design Tokens 单一事实源（Primitive → Semantic → Component），并完成 Light/Dark 主题映射，为后续 UI 迁移与主题扩展提供稳定底座。

## Dependencies

- 无（P0 基础设施）

## Expected File Changes

- Add: `src/styles/tokens.css` 或 `src/styles/tokens.ts`（SSOT，二选一）
- Update: `src/styles/theme.css`（改为消费/映射 `--wn-*` token，保留兼容层）
- Update: `src/index.css`（如需对接 Tailwind theme variables）
- Update: `src/main.tsx` / `src/App.tsx`（如需增加 `data-theme` 切换挂载点）
- Add/Update: `src/stores/preferencesStore.ts`（主题与密度等偏好持久化，如尚不存在）

## Acceptance Criteria

- [x] 所有“语义 token”统一使用 `--wn-*` 命名，并在 Light/Dark 下存在同构映射
- [x] 不新增硬编码颜色；新增/修改 UI 样式参数必须可追溯到 tokens SSOT
- [x] 关键界面在 Light/Dark 下无“亮灰色乱入块”（用视觉回归 + 手动矩阵验证）

## Tests

- [x] 新增视觉回归基线（主界面/编辑器/侧边栏/AI 面板/状态栏）覆盖 Light/Dark
