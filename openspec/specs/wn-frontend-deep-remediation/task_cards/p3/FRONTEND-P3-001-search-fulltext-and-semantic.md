# FRONTEND-P3-001: 搜索升级（全文 + 语义）

## Goal

搜索从“文件名”升级为“文件名 + 正文全文 + 语义检索”，并提供结果高亮、相关性排序与命中导航，成为写作者在项目中定位内容的核心能力。

## Dependencies

- SQLite FTS5（全文索引）
- sqlite-vec / embedding pipeline（语义搜索，需后端/本地模型支持）

## Expected File Changes

- Update: `electron/ipc/`（search IPC：fts + semantic）
- Update/Add: `src/components/Sidebar/Search.tsx`（搜索 UI 与结果列表）
- Add: `src/components/Search/SearchResults.tsx`
- Add: `tests/e2e/frontend-search.spec.ts`

## Acceptance Criteria

- [ ] 支持全文搜索并高亮命中，点击可跳转到命中位置（上/下一处命中）
- [ ] 语义搜索入口与全文搜索统一（同一输入框/切换），结果按相关性排序
- [ ] 大项目下搜索响应时间可接受（有明确缓存/分页策略）

## Tests

- [ ] Playwright E2E：创建含特定文本的文档 → 搜索 → 命中列表正确 → 跳转高亮正确

