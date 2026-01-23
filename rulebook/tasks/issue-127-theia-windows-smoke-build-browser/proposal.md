# Proposal: issue-127-theia-windows-smoke-build-browser

## Why
The Windows smoke workflow starts the browser target without running the browser build/bundle first, which
causes Theia to fail at runtime with missing `src-gen/backend/main.js`.

We need the workflow to be a valid Windows start signal for the scaffold.

## What Changes
- Add a browser build step (`yarn build:browser`) to `theia-windows-smoke` before starting the browser target.
- Make the start step resilient when the process exits early (avoid failing in cleanup).

## Impact
- Affected specs:
  - `openspec/_ops/task_runs/ISSUE-127.md`
- Affected code:
  - `.github/workflows/theia-windows-smoke.yml`
- Breaking change: NO
- User benefit: Windows smoke workflow can validate browser start reliably.
