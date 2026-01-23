# Proposal: issue-129-theia-windows-smoke-electron-quoting

## Why
The Windows smoke workflow currently fails in the Electron start step due to a PowerShell parser error caused by
invalid string escaping when concatenating stdout/stderr.

This blocks using the workflow as a repeatable Windows Electron start validation gate.

## What Changes
- Fix the PowerShell script snippet in `.github/workflows/theia-windows-smoke.yml` so it can safely combine logs
  and assert the presence of `[writenow-core] frontend started`.
- Rerun the workflow and record evidence in RUN_LOG.

## Impact
- Affected specs:
  - `openspec/_ops/task_runs/ISSUE-129.md`
- Affected code:
  - `.github/workflows/theia-windows-smoke.yml`
- Breaking change: NO
- User benefit: Windows Electron start validation becomes reliable and self-documenting via logs.
