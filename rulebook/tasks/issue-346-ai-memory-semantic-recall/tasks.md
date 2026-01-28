## 1. Implementation
- [ ] 1.1 IPC contract（SSOT）：`MemoryInjectionPreviewRequest` 增加 `queryText?: string`；同步 `UserMemory` 审计字段；必要时扩展 preview 响应以区分 stable vs semantic（保持向后兼容）
- [ ] 1.2 Theia DB：`user_memory` 升级到 v10（新增列 + 索引）并新增 `migrateToV10`（不破坏存量数据）
- [ ] 1.3 VectorStore：新增 `user_memory_vec(vec0)` 建表/维度校验/TopK 查询/upsert/delete
- [ ] 1.4 MemoryService：preview 接入 `queryText` 语义召回 + 降级策略（sqlite-vec 不可用/维度冲突/空 query）+ 软删除默认过滤
- [ ] 1.5 Frontend：确保 query-dependent 召回只进入 `userContent`（动态层），不影响稳定前缀与 `stablePrefixHash`

## 2. Testing
- [ ] 2.1 Playwright E2E：覆盖空 query / sqlite-vec 不可用 / 维度冲突降级 + `stablePrefixHash` 不变 + 软删除默认不可见但可审计
- [ ] 2.2 本地验证并记录证据到 RUN_LOG：`npm run lint`、`npm test`、`npm run build`、`npx playwright test`
- [ ] 2.3 门禁校验：`npm run contract:generate && npm run contract:check`、`openspec validate --specs --strict --no-interactive`、`rulebook task validate issue-346-ai-memory-semantic-recall`

## 3. Documentation
- [ ] 3.1 RUN_LOG：`openspec/_ops/task_runs/ISSUE-346.md`（Runs 只追加不回写，含关键命令/关键输出/证据路径）
- [ ] 3.2 Task cards 收口：将 `openspec/specs/sprint-ai-memory-semantic-recall/task_cards/**` 的验收勾选为 `[x]`，并回填 `Status/Issue/PR/RUN_LOG`
- [ ] 3.3 PR：body 包含 `Closes #346`，并启用 auto-merge（squash）
