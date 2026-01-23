# Proposal: issue-125-theia-windows-smoke-yarn-cmd

## Why
The Windows smoke workflow currently fails during the start steps because `Start-Process -FilePath "yarn"`
attempts to execute a shim and errors with `%1 is not a valid Win32 application`.

We need the workflow to reliably start the Theia browser/electron targets on Windows for validation evidence.

## What Changes
- Update `.github/workflows/theia-windows-smoke.yml` to run Yarn via `cmd.exe /c yarn ...` for long-running start
  processes that need to be killed after a short smoke window.
- Rerun the workflow and capture evidence in RUN_LOG.

## Impact
- Affected specs:
  - `openspec/_ops/task_runs/ISSUE-125.md`
- Affected code:
  - `.github/workflows/theia-windows-smoke.yml`
- Breaking change: NO
- User benefit: Windows smoke workflow becomes executable end-to-end (install/build/start).
