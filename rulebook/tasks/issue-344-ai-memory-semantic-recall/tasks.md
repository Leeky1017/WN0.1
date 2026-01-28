## 1. Implementation
- [ ] 1.1 创建新 Sprint Spec：`openspec/specs/sprint-ai-memory-semantic-recall/`（spec + design + task_cards）
- [ ] 1.2 更新 `openspec/specs/writenow-spec/spec.md` 路线图：新增该 Sprint（Draft）并与新 spec 双向引用
- [ ] 1.3 补齐 Rulebook task：新增 `specs/ai-memory-semantic-recall/spec.md`（spec delta 指向 OpenSpec SSOT）
- [ ] 1.4 创建并维护 RUN_LOG：`openspec/_ops/task_runs/ISSUE-344.md`（Runs 只追加不回写）

## 2. Testing
- [ ] 2.1 OpenSpec 校验：`openspec validate --specs --strict --no-interactive`
- [ ] 2.2 Rulebook task 校验：`rulebook task validate issue-344-ai-memory-semantic-recall`

## 3. Documentation
- [ ] 3.1 在 RUN_LOG 追加关键命令与关键输出（Issue/worktree/validate 等）
- [ ] 3.2 PR body 包含 `Closes #344`，并回填 RUN_LOG 的 `PR:` 链接
