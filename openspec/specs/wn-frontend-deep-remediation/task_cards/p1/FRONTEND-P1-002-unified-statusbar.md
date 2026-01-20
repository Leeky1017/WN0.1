# FRONTEND-P1-002: 统一 StatusBar（≤24px + 渐进披露 + 番茄钟低干扰）

## Goal

将分散/重复的状态信息合并到窗口底部单一超细 StatusBar，并把番茄钟/字数目标改为低干扰呈现（微型进度 + 悬停展开）。

## Dependencies

- `FRONTEND-P1-001`（布局稳定后再做信息架构迁移）

## Expected File Changes

- Update: `src/components/StatsBar.tsx`（迁移/降级为嵌入式/悬浮组件或移除）
- Update/Add: `src/components/StatusBar/StatusBar.tsx`（新的统一状态栏）
- Update: `src/components/Editor/`（移除重复状态展示）
- Add: `tests/e2e/frontend-statusbar.spec.ts`

## Acceptance Criteria

- [ ] 顶部与底部不再重复展示字数/保存状态等信息
- [ ] StatusBar 高度 ≤ 24px，信息分区清晰（左：文件/保存；中：编辑信息；右：辅助功能）
- [ ] 番茄钟不再“审美入侵”：默认不占用固定全局横条，仅以微型进度呈现（可展开详情）

## Tests

- [ ] Playwright E2E：写作 → 自动保存状态可见；切换番茄钟 → 微型进度可见且可展开

