# Proposal: issue-121-theia-windows-smoke-fix

## Why
The opt-in Windows smoke workflow (`theia-windows-smoke`) currently fails during `yarn install:win` because
`writenow-theia/scripts/win-msvc-env.ps1` rejects the argument shape produced by Yarn.

This blocks our ability to validate the Theia scaffold on Windows in a clean environment.

## What Changes
- Make `win-msvc-env.ps1` accept arbitrary arguments (including flags starting with `-`) by relying on `$args`
  instead of PowerShell parameter binding.
- Align `writenow-theia` Windows helper scripts / workflow usage to the fixed invocation.
- Rerun the workflow and record evidence in RUN_LOG.

## Impact
- Affected specs:
  - `openspec/_ops/task_runs/ISSUE-121.md`
- Affected code:
  - `writenow-theia/scripts/win-msvc-env.ps1`
  - `.github/workflows/theia-windows-smoke.yml`
- Breaking change: NO
- User benefit: Windows install/build/start scripts become usable, and the workflow provides reliable Windows evidence.
