# Notes: issue-117-theia-scaffold

## Goals
- Production Theia scaffold under `writenow-theia/` (browser + electron) with a minimal core extension (`writenow-core`).
- Cross-platform (Linux + Windows) validation for start flows and native modules (`better-sqlite3`, `sqlite-vec`).

## Decisions
- Keep the initial dependency set minimal (no “double stack”), and use a single production scaffold distinct from `theia-poc/`.
- Treat `better-sqlite3` and `sqlite-vec` as backend webpack externals to avoid breaking native addon resolution.

## Open questions / follow-ups
- If Windows native builds require additional toolchains (VS Build Tools / Python), record exact requirement and decide whether to codify in docs or CI later.

