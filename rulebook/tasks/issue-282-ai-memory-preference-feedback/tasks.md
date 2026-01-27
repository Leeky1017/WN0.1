## 1. Implementation
- [ ] 1.1 实现 P1-001：ai:skill:run 前自动拉取偏好并注入稳定模板（用户偏好章节；确定性 + 空占位）
- [ ] 1.2 实现 P1-002：新增 ai:skill:feedback（accept/reject/partial）+ SQLite 落盘 + accept/reject 联动 ingest
- [ ] 1.3 更新 SQLite schema（新增反馈表 + index）
- [ ] 1.4 更新 IPC contract + 重新生成 ipc-generated.ts（root + theia）
- [ ] 1.5 增加/更新 E2E 覆盖注入与反馈（并写入 RUN_LOG 证据）
- [ ] 1.6 新增 RUN_LOG：`openspec/_ops/task_runs/ISSUE-282.md`

## 2. Validation
- [ ] 2.1 `npm run contract:check`
- [ ] 2.2 `npx playwright test tests/e2e/<new-or-updated>.spec.ts`

## 3. Delivery
- [ ] 3.1 提交 commit（message 含 `(#282)`）
- [ ] 3.2 创建 PR（body 含 `Closes #282`）并开启 auto-merge
- [ ] 3.3 记录关键命令/输出到 RUN_LOG，回填 PR 链接

