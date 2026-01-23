# ISSUE-131
- Issue: #131
- Branch: task/131-theia-windows-smoke-electron-log-match
- PR: <fill>

## Plan
- Fix `theia-windows-smoke` electron step to assert markers via literal match (avoid invalid regex).
- Add a native-smoke success marker assertion to validate better-sqlite3 + sqlite-vec on Windows.
- Rerun the workflow and capture evidence links / key output in this RUN_LOG.

## Runs
### 2026-01-23 09:12 investigate (main workflow run failure)
- Command: `gh run view 21280548005 --log --job 61249260688`
- Key output: `Invalid pattern '\\[writenow-core\\] frontend started' ... [x-y] range in reverse order.`
- Evidence: `https://github.com/Leeky1017/WN0.1/actions/runs/21280548005`

