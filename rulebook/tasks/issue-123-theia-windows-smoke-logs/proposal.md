# Proposal: issue-123-theia-windows-smoke-logs

## Why
The opt-in Windows smoke workflow currently reaches the Theia start steps, but fails because PowerShell
`Start-Process` forbids `RedirectStandardOutput` and `RedirectStandardError` pointing to the same file.

This prevents us from using the workflow as a reliable Windows validation signal.

## What Changes
- Update `.github/workflows/theia-windows-smoke.yml` to redirect stdout/stderr to separate files (or use a safer
  capture mechanism) and keep the logs available as evidence.
- Rerun the workflow and capture the run link + key output in RUN_LOG.

## Impact
- Affected specs:
  - `openspec/_ops/task_runs/ISSUE-123.md`
- Affected code:
  - `.github/workflows/theia-windows-smoke.yml`
- Breaking change: NO
- User benefit: Windows scaffold validation becomes repeatable (install/build/start) with observable logs.
