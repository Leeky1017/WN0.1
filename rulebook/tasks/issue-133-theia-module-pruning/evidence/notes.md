# Notes: issue-133-theia-module-pruning

## Findings
- The current Theia scaffold already does **not** depend on `@theia/debug`, `@theia/git`, `@theia/languages`, `@theia/task`, `@theia/search-in-workspace`, `@theia/plugin-ext*` (direct deps).
- `@theia/terminal` and `@theia/process` were directly included in both `writenow-theia/browser-app` and `writenow-theia/electron-app` and map to programmer IDE features (terminal/process management) that WriteNow should not expose.
- `@theia/markers` is pulled **transitively** by `@theia/monaco` (needed for the editor). Removing it entirely is not feasible without dropping Monaco; instead we disable the Problems UI entrypoints via a late `rebind(ProblemContribution)` override in `writenow-core`.

## Decisions Made
- Prune `@theia/terminal` + `@theia/process` from app deps, and remove `node-pty` from Theia rebuild module list (terminal-only native module).
- Keep `@theia/markers` as a transitive dependency (required by `@theia/monaco`) but hide the Problems UI entrypoints by overriding `ProblemContribution` with a no-op implementation.

## Open Questions / Later
- If `@theia/process` becomes unused after pruning terminal/markers, consider a follow-up to remove it too (needs a clean dependency audit + startup verification).
