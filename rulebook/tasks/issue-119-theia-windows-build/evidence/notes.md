# Notes — Issue #119 (Windows Theia scaffold build unblock)

## Context
- Task 004 scaffold (`writenow-theia/`) is merged via Issue #117 / PR #118.
- Native Windows `yarn install` is blocked by `drivelist` building from source and failing with `llvm-lib.exe` (`/LTCG:INCREMENTAL`).

## Observed Error (from prior RUN_LOG)
- `drivelist` install script: `prebuild-install --runtime napi || node-gyp rebuild`
- Fallback build can fail if the toolchain selects LLVM's librarian (`llvm-lib`) which does not accept `/LTCG:INCREMENTAL`.

## Working Hypotheses
- `prebuild-install` could not download a suitable prebuild (network/proxy/rate-limit), triggering node-gyp fallback.
- The node-gyp/MSBuild toolset selection is using an LLVM-based toolchain (ClangCL/llvm-lib) rather than MSVC (v143), causing the flag incompatibility.

## Potential Fix Directions
- Document and enforce a supported toolchain on Windows:
  - VS 2022 Build Tools with MSVC v143 + Windows SDK + Python 3
  - Avoid LLVM toolset selection; ensure MSVC toolset is used.
- Add deterministic Yarn Classic usage (Corepack pin) to reduce “works on my machine” variance.
- Optional: add a Windows smoke workflow to reproduce in a clean environment and prevent regressions.

