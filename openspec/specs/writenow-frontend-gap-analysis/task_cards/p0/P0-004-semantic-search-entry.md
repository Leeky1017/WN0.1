# P0-004: 语义搜索入口与可恢复性增强

Status: pending

## Goal

把 `search:semantic` 在 `writenow-frontend` 中提升到“可发现 + 可诊断 + 可恢复”的可用标准：不仅能搜到结果，还要在模型/索引未就绪时提供明确的修复路径。

## Dependencies

- `openspec/specs/writenow-frontend-gap-analysis/spec.md`
- `openspec/specs/writenow-frontend-gap-analysis/design/02-p0-feature-entrypoints.md`
- `openspec/specs/api-contract/spec.md`（错误码：`MODEL_NOT_READY/DB_ERROR/TIMEOUT/CANCELED`）

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Update | `writenow-frontend/src/features/search/SearchPanel.tsx` |
| Update | `writenow-frontend/src/features/search/useSearch.ts` |
| Add | `writenow-frontend/tests/e2e/write-mode/semantic-search.spec.ts` |

> 说明：Search 面板已存在语义 Tab；本任务聚焦“可恢复性与定位能力”，不是从零开始。

## Acceptance Criteria

- [ ] Search 面板“语义”模式可发现并可用（清晰区分“全文 vs 语义”）
- [ ] 语义搜索结果展示相似度（score）并保持稳定排序
- [ ] 点击结果：
  - [ ] 至少能打开对应文档
  - [ ] SHOULD 尽可能定位到相关片段（允许第一阶段仅打开文件，第二阶段做高亮/滚动定位）
- [ ] `MODEL_NOT_READY` / `DB_ERROR` 的可恢复路径：
  - [ ] UI 明确提示原因（例如“模型未就绪/索引不可用”）
  - [ ] 提供可操作入口（例如：跳转到 Settings 的“索引管理/模型管理”，或直接触发重建索引入口）
- [ ] 错误语义清晰：区分 `TIMEOUT` 与 `CANCELED`，并提供重试按钮

## Tests

- [ ] Playwright E2E：在 Search 面板切换到语义模式并输入查询 → 至少触发一次请求并展示“搜索中/结果/空态”之一
- [ ] Playwright E2E：当返回 `MODEL_NOT_READY` 时，UI 展示可操作提示（例如“去设置/重建索引”按钮）

