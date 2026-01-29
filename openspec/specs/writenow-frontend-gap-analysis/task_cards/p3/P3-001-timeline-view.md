# P3-001: 时间线视图（伏笔追踪）

Status: pending

## Goal

交付最小可用的“时间线”视图，用于记录事件与伏笔，并支持与文档/章节建立引用关系，提升长篇创作的一致性与可管理性。

> 注意：时间线通常需要新增数据模型与持久化路径。本任务必须先确认“存储与写入通道”是否已有；若缺失，必须先补齐 IPC 契约与实现（遵循 `api-contract` + 契约自动化），不得在前端做假数据/stub。

## Dependencies

- `openspec/specs/writenow-frontend-gap-analysis/spec.md`
- `openspec/specs/writenow-frontend-gap-analysis/design/05-p2-professional-writing-features.md`
- `openspec/specs/api-contract/spec.md`

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-frontend/src/features/timeline/TimelinePanel.tsx`（或独立页面/面板） |
| Add | `writenow-frontend/src/features/timeline/useTimeline.ts` |
| Add | `writenow-frontend/src/features/timeline/index.ts` |
| Update | `writenow-frontend/src/components/layout/activity-bar.tsx`（若作为新 tab）或 `OutlinePanel.tsx`（若作为子视图） |
| Update | `writenow-frontend/src/stores/layoutStore.ts`（若新增 tab） |
| Update | `writenow-frontend/src/components/layout/AppShell.tsx`（若新增 tab） |
| Add | `writenow-frontend/tests/e2e/write-mode/timeline.spec.ts` |
| (可能) Update | `electron/ipc/**` + `src/types/ipc-generated.ts`（若需要新增 timeline 的读写通道） |

## Acceptance Criteria

- [ ] UI 可发现：用户能打开时间线视图（入口明确、i18n 完整）
- [ ] 支持事件 CRUD：
  - [ ] 新增事件（when/title/note/refs）
  - [ ] 编辑/删除事件
  - [ ] 按时间顺序展示
- [ ] 引用（refs）规则：
  - [ ] refs 必须为 project-relative（不得泄露绝对路径）
  - [ ] 至少支持关联到某个文档（path 或 articleId）
- [ ] 持久化：
  - [ ] 数据必须真实落盘并可回读（禁止 stub）
  - [ ] 若需要新增 IPC：必须符合 Envelope + 错误码，并通过契约生成/校验门禁

## Tests

- [ ] Playwright E2E：新增 1 个事件 → 列表出现 → 刷新后仍存在（证明真实持久化）

