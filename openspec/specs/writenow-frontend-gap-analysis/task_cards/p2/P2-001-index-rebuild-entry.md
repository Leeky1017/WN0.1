# P2-001: 手动重建索引入口（embedding:index）

Status: pending

## Goal

提供“重建索引”入口，允许用户在语义搜索不可用/质量下降时手动触发 embedding 索引构建，并能看到可观测结果（至少 `indexedCount`）。

## Dependencies

- `openspec/specs/writenow-frontend-gap-analysis/spec.md`
- `openspec/specs/writenow-frontend-gap-analysis/design/05-p2-professional-writing-features.md`
- `openspec/specs/api-contract/spec.md`（错误码：`MODEL_NOT_READY/DB_ERROR/TIMEOUT/CANCELED`）

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-frontend/src/features/indexing/IndexingSection.tsx`（或放入 Settings/Search） |
| Add | `writenow-frontend/src/features/indexing/useIndexing.ts` |
| Add | `writenow-frontend/src/features/indexing/index.ts` |
| Update | `writenow-frontend/src/features/settings/SettingsPanel.tsx`（集成入口） |
| Update | `writenow-frontend/src/features/search/SearchPanel.tsx`（MODEL_NOT_READY 时引导跳转） |
| Add | `writenow-frontend/tests/e2e/write-mode/index-rebuild.spec.ts` |

## Acceptance Criteria

- [ ] Settings 或 Search 中存在“重建索引”入口（可发现，i18n 完整）
- [ ] 触发重建索引后：
  - [ ] 系统枚举当前项目/文档集合（禁止 stub；允许基于 `file:list`）
  - [ ] 读取必要内容并调用 `embedding:index`（namespace=`articles`）
  - [ ] 展示进度与结果（至少：indexedCount）
- [ ] 错误可恢复：
  - [ ] `MODEL_NOT_READY`：提示用户去下载/初始化模型（可直接链到相关设置入口）
  - [ ] `TIMEOUT`/`CANCELED`：语义明确，且 pending 状态被清理
  - [ ] `DB_ERROR/INTERNAL`：展示错误并允许重试
- [ ] 性能与安全：
  - [ ] 大项目时需要分批处理（避免 UI 卡死）
  - [ ] 不在日志/UI 输出绝对路径或敏感内容

## Tests

- [ ] Playwright E2E：打开索引管理入口 → 点击重建 → 至少出现“进行中/完成/失败提示”之一（可接受后端未就绪路径，但必须可诊断）

