## 1. Implementation
- [x] 1.1 新增 OpenSpec：`openspec/specs/writenow-frontend-gap-analysis/`（spec + design + task cards）
- [x] 1.2 更新 `openspec/project.md`：新增 spec 索引条目
- [ ] 1.3 补齐 Rulebook spec delta：`rulebook/tasks/issue-365-frontend-gap-analysis-spec/specs/writenow-frontend-gap-analysis/spec.md`

## 2. Testing
- [x] 2.1 OpenSpec strict validate：`npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- [ ] 2.2 Rulebook task validate：`rulebook task validate issue-365-frontend-gap-analysis-spec`

## 3. Documentation
- [ ] 3.1 创建 RUN_LOG：`openspec/_ops/task_runs/ISSUE-365.md`（Plan + Runs；Runs 只追加）
- [ ] 3.2 PR 创建后回填 RUN_LOG：PR 链接 + checks 证据（必须与 PR URL 一致）
- [ ] 3.3 交付收口：Issue/PR/RUN_LOG 链接齐全，可复现命令写入 Runs
