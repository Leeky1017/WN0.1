# P0-001: 知识图谱面板（Knowledge Graph）

Status: pending

## Goal

在 `writenow-frontend` 的 Write Mode 侧边栏提供可发现的“知识图谱”入口，并暴露后端已有 `kg:*` 能力（图谱加载 + 实体/关系 CRUD），做到最小可用与可诊断。

## Dependencies

- `openspec/specs/writenow-frontend-gap-analysis/spec.md`
- `openspec/specs/writenow-frontend-gap-analysis/design/02-p0-feature-entrypoints.md`
- `openspec/specs/api-contract/spec.md`（错误码/Envelope）

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-frontend/src/features/knowledge-graph/KnowledgeGraphPanel.tsx` |
| Add | `writenow-frontend/src/features/knowledge-graph/useKnowledgeGraph.ts` |
| Add | `writenow-frontend/src/features/knowledge-graph/index.ts` |
| Update | `writenow-frontend/src/components/layout/activity-bar.tsx` |
| Update | `writenow-frontend/src/stores/layoutStore.ts` |
| Update | `writenow-frontend/src/components/layout/AppShell.tsx` |
| Update | `writenow-frontend/src/locales/zh-CN.json` |
| Update | `writenow-frontend/src/locales/en.json` |
| Add | `writenow-frontend/tests/e2e/write-mode/knowledge-graph-panel.spec.ts` |

## Acceptance Criteria

- [ ] ActivityBar 存在 “知识图谱”入口，点击可打开面板（稳定选择器：`data-testid="activity-tab-knowledgeGraph"` 或等价）
- [ ] 面板初次加载会调用 `kg:graph:get` 并展示结果（最小可用：实体列表 + 关系列表/简易图）
- [ ] 支持实体 CRUD：`kg:entity:create/update/delete`，操作成功后 UI 立即刷新
- [ ] 支持关系 CRUD：`kg:relation:create/update/delete`（允许分阶段：P0 先做 create/delete，update 可在同卡或后续补齐）
- [ ] 错误可诊断且可恢复：
  - [ ] `DB_ERROR/IO_ERROR/INTERNAL` 显示可读错误并提供重试
  - [ ] `INVALID_ARGUMENT` 显示字段级或表单级错误提示（不吞错）
- [ ] 不泄露敏感信息：不得把绝对路径/堆栈直接渲染到 UI

## Tests

- [ ] Playwright E2E：打开知识图谱面板 → 能看到至少一个加载态与结果态（或明确空态）
- [ ] Playwright E2E：创建一个实体 → 列表中出现 → 删除后消失

