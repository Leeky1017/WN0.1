# Proposal: issue-131-theia-windows-smoke-electron-log-match

## Why
The Windows smoke workflow currently fails even when Electron starts successfully, due to an invalid PowerShell regex used to match the frontend marker log.

## What Changes
- Switch the Electron smoke step to search marker strings via literal matching (no regex pitfalls).
- Assert the backend native-smoke success marker to validate better-sqlite3 + sqlite-vec load on Windows.

## Impact
- Affected specs: none
- Affected code: `.github/workflows/theia-windows-smoke.yml`
- Breaking change: NO
- User benefit: reliable Windows validation evidence for Theia Electron startup + native modules.
