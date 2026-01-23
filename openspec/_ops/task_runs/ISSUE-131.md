# ISSUE-131
- Issue: #131
- Branch: task/131-theia-windows-smoke-electron-log-match
- PR: https://github.com/Leeky1017/WN0.1/pull/132

## Plan
- Fix `theia-windows-smoke` electron step to assert markers via literal match (avoid invalid regex).
- Add a native-smoke success marker assertion to validate better-sqlite3 + sqlite-vec on Windows.
- Rerun the workflow and capture evidence links / key output in this RUN_LOG.

## Runs
### 2026-01-23 09:12 investigate (main workflow run failure)
- Command: `gh run view 21280548005 --log --job 61249260688`
- Key output: `Invalid pattern '\\[writenow-core\\] frontend started' ... [x-y] range in reverse order.`
- Evidence: `https://github.com/Leeky1017/WN0.1/actions/runs/21280548005`

### 2026-01-23 09:19 trigger (workflow_dispatch on branch)
- Command: `gh workflow run theia-windows-smoke --ref task/131-theia-windows-smoke-electron-log-match`
- Key output: `triggered workflow_dispatch`
- Evidence: `https://github.com/Leeky1017/WN0.1/actions/runs/21281026590`

### 2026-01-23 09:29 verify (branch run succeeded; found browser native module mismatch)
- Command: `gh run view 21281026590 --log --job 61250820731 | rg "HTTP GET ok|\\[writenow-core\\]"`
- Key output: `root ERROR [writenow-core] open database (better-sqlite3) failed: The module ...better_sqlite3.node`
- Evidence: `https://github.com/Leeky1017/WN0.1/actions/runs/21281026590`

### 2026-01-23 09:32 rerun (added browser native smoke assertion; file lock failure)
- Command: `gh run view 21281374671 --log --job 61251951409 | rg "better-sqlite3|EPERM|node-gyp failed"`
- Key output: `Error while reverting "better-sqlite3": Error: EPERM: operation not permitted, unlink ...better_sqlite3.node`
- Evidence: `https://github.com/Leeky1017/WN0.1/actions/runs/21281374671`

### 2026-01-23 09:50 verify (branch run succeeded; browser + electron smoke markers)
- Command: `gh run view 21281639645 --log --job 61252797044 | rg "HTTP GET ok|\\[writenow-core\\]"`
- Key output: `root INFO [writenow-core] native smoke completed successfully` + `root INFO [writenow-core] frontend started` + `HTTP GET ok`
- Evidence: `https://github.com/Leeky1017/WN0.1/actions/runs/21281639645`
