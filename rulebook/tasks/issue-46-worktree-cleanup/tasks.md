## 1. Implementation
- [ ] 1.1 Add `scripts/agent_worktree_cleanup.sh` with safety checks and `--dry-run`
- [ ] 1.2 Update workflow docs to require cleanup after merge

## 2. Verification
- [ ] 2.1 Run `bash -n scripts/agent_worktree_cleanup.sh`
- [ ] 2.2 Dry-run cleanup on a known merged issue worktree

## 3. Delivery
- [ ] 3.1 Update `openspec/_ops/task_runs/ISSUE-46.md` with commands + key outputs
- [ ] 3.2 Create PR with `Closes #46` and enable auto-merge
