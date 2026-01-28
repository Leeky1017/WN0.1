# ISSUE-342

- Issue: #342
- Branch: task/342-task-card-sync
- PR: https://github.com/Leeky1017/WN0.1/pull/343

## Plan

- 更新 4 个 Task Card 状态为 done
- 补充 Issue/PR/RUN_LOG 元数据
- 勾选已完成的验收项
- 运行 openspec validate 验证

## Runs

### 2026-01-28 Task Card 状态同步

**变更清单：**

1. `openspec/specs/sprint-open-source-opt/task_cards/p1/P1-001-ai-diff-extension.md`
   - 状态: Todo → done
   - 添加: Issue #291, PR #294, RUN_LOG ISSUE-291.md
   - 勾选所有任务清单和验收标准

2. `openspec/specs/sprint-ai-memory/task_cards/p1/P1-001-auto-preference-injection.md`
   - 状态: Pending → done
   - 添加: Issue #282, PR #284, RUN_LOG ISSUE-282.md
   - 勾选已完成项（UI 透明性入口标注为"后续增强"）

3. `openspec/specs/sprint-ai-memory/task_cards/p1/P1-002-auto-feedback-tracking.md`
   - 状态: Pending → done
   - 添加: Issue #282, PR #284, RUN_LOG ISSUE-282.md
   - 勾选所有任务清单和验收标准

4. `openspec/specs/sprint-write-mode-ide/task_cards/p3/P3-001-packaging-offline.md`
   - 状态: Planned → done
   - 添加: Issue #326, PR #331, RUN_LOG ISSUE-326.md
   - 勾选所有任务清单和验收标准

5. `openspec/specs/writenow-spec/spec.md`（路线图状态同步）
   - Sprint AI-Memory Phase 0: 🚧 → ✅，添加 Phase 1/2 完成记录
   - Sprint Open-Source-Opt Phase 0: 🚧 → ✅，P1-001 AI Diff Extension 完成
   - Sprint Write Mode IDE: 添加 Phase 3（P3-001 Packaging Offline）完成

**验证（第二次，含 writenow-spec 更新）：**
- Command: `npx openspec validate --specs --strict`
- Key output:
  ```
  ✓ spec/api-contract
  ✓ spec/sprint-ai-memory
  ✓ spec/sprint-open-source-opt
  ✓ spec/sprint-write-mode-ide
  ✓ spec/writenow-spec
  Totals: 5 passed, 0 failed (5 items)
  ```
- Evidence: 5 specs validated, all passed
