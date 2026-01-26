## 1. Preservation / Sync (must not lose local work)
- [ ] 1.1 将控制面（main）上的本地未提交变更迁移到隔离 worktree 分支（patch + untracked 资产）
- [ ] 1.2 校验工作区无遗漏：`git status` 只剩预期变更；关键目录（demo、tokens、composed 组件）均已纳入版本管理
- [ ] 1.3 首次提交用于“保全同步”（可拆成后续功能提交），并 push 到远端

## 2. Testing
- [ ] 2.1 按 `.cursor/plans/frontend-completion-sprint_28130b62.plan.md` 补齐缺口：为 API 侧边栏视图编写真实 Playwright E2E（至少 StatsView + HistoryView）
- [ ] 2.2 覆盖边界场景（空数据、快速切换/连续保存、失败提示可观测且可恢复）
- [ ] 2.3 本地跑通：lint / typecheck / unit tests / e2e；失败→修到绿，并记录证据到 RUN_LOG

## 3. Documentation
- [ ] 3.1 创建并持续更新 `openspec/_ops/task_runs/ISSUE-251.md`（命令 + 关键输出 + 证据路径，只追加）
- [ ] 3.2 若发现 `openspec/specs/writenow-spec/spec.md` 或相关 Sprint spec 与实现不一致，补齐同步更新（禁止文档漂移）
- [ ] 3.3 PR 描述包含 `Closes #251`，并开启 auto-merge；合并后归档 Rulebook task
