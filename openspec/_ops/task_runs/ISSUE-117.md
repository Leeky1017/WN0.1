# ISSUE-117
- Issue: #117
- Branch: task/117-theia-scaffold
- PR: <fill>

## Plan
- Scaffold a production Theia workspace under `writenow-theia/` (browser + electron + core extension).
- Validate start flows on Linux (WSL2) and Windows (native PowerShell), incl. native modules.
- Land docs + task card updates with full RUN_LOG evidence.

## Runs
### 2026-01-23 14:24 scaffold (generator-theia-extension)
- Command: `mkdir -p writenow-theia && cd writenow-theia && npx --yes yo theia-extension` (interactive: `Empty` + `writenow-core`)
- Key output: `create writenow-core/...` + `create browser-app/package.json` + `create electron-app/package.json`
- Evidence: `writenow-theia/package.json`, `writenow-theia/browser-app/package.json`, `writenow-theia/electron-app/package.json`, `writenow-theia/writenow-core/`

### 2026-01-23 14:46 sysdeps (WSL2 workaround for pkg-config + X11 headers)
- Command: `cd writenow-theia && mkdir -p .sysdeps/debs .sysdeps/root && cd .sysdeps/debs && apt-get download pkgconf pkgconf-bin libpkgconf3 pkg-config libx11-dev libxkbfile-dev libxau-dev libxdmcp-dev libxcb1-dev x11proto-dev xtrans-dev libpthread-stubs0-dev libx11-6 libxkbfile1 libxau6 libxdmcp6 libxcb1 && for deb in *.deb; do dpkg-deb -x \"$deb\" ../root; done`
- Key output: `.sysdeps/root/usr/bin/pkg-config` + `.sysdeps/root/usr/include/X11/Xlib.h`
- Evidence: `writenow-theia/.sysdeps/` (gitignored), `writenow-theia/README.md` (commands documented)

### 2026-01-23 14:48 deps (WSL2 yarn install; GitHub API 403 → use token)
- Command: `cd writenow-theia && SYSROOT=$PWD/.sysdeps/root ... GITHUB_TOKEN=$(gh auth token) yarn install`
- Key output: `success Saved lockfile.` + `theia check:theia-version ... ✅ No issues were found`
- Evidence: `writenow-theia/yarn.lock`

### 2026-01-23 14:49 build (WSL2 browser target)
- Command: `cd writenow-theia && SYSROOT=$PWD/.sysdeps/root ... yarn build:browser`
- Key output: `webpack ... compiled` (OK)
- Evidence: `writenow-theia/browser-app/gen-webpack.config.js`, `writenow-theia/browser-app/webpack.config.js`

### 2026-01-23 14:50 build (WSL2 electron target)
- Command: `cd writenow-theia && SYSROOT=$PWD/.sysdeps/root ... yarn build:electron`
- Key output: `Processed \"better-sqlite3\"` + `✔ Rebuild Complete` + `webpack ... compiled successfully`
- Evidence: `writenow-theia/electron-app/gen-webpack.config.js`, `writenow-theia/electron-app/webpack.config.js`

### 2026-01-23 14:50 start (WSL2 browser target)
- Command: `cd writenow-theia && SYSROOT=$PWD/.sysdeps/root ... yarn --cwd browser-app rebuild && timeout 25s yarn --cwd browser-app start --hostname 127.0.0.1 --port 3012`
- Key output: `[writenow-core] native smoke completed successfully` + `Theia app listening on http://127.0.0.1:3012.`
- Evidence: `writenow-theia/writenow-core/src/node/writenow-core-backend-contribution.ts`

### 2026-01-23 14:50 start (WSL2 electron target)
- Command: `cd writenow-theia && SYSROOT=$PWD/.sysdeps/root ... yarn --cwd electron-app rebuild && timeout 25s yarn --cwd electron-app start`
- Key output: `[writenow-core] native smoke completed successfully` + `[writenow-core] frontend started`
- Evidence: `writenow-theia/writenow-core/src/browser/writenow-core-contribution.ts`

### 2026-01-23 14:52 Windows (native PowerShell) yarn install (blocked)
- Command: `Set-Location C:\\tmp\\writenow-theia-issue117; corepack yarn install`
- Key output: `error ...\\drivelist: Command failed` (native build requires toolchain)
- Evidence: local Windows copy at `C:\\tmp\\writenow-theia-issue117` (rsync from WSL worktree)

### 2026-01-23 15:05 Windows (native PowerShell) install Build Tools + SDK + LLVM (partial)
- Command: `winget install Microsoft.VisualStudio.2022.BuildTools ...` (+ follow-up component installs)
- Key output: VS Build Tools installed under `C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools`
- Evidence: `vswhere -all -products * -format json` shows Build Tools instance; LLVM toolchain present under `...\\VC\\Tools\\Llvm\\x64\\bin\\clang-cl.exe`

### 2026-01-23 15:10 Windows (native PowerShell) yarn install (still blocked)
- Command: `Set-Location C:\\tmp\\writenow-theia-issue117; corepack yarn install`
- Key output: `drivelist` build fails with `llvm-lib.exe` (`/LTCG:INCREMENTAL: no such file or directory`)
- Evidence: command output (kept to key error lines only; do not paste env)

### 2026-01-23 15:12 Windows native modules smoke (better-sqlite3 + sqlite-vec)
- Command: `Set-Location C:\\tmp\\wn-native-npm-117; npm install better-sqlite3@12.6.2 sqlite-vec@0.1.7-alpha.2 && node -e \"... vec0 smoke ...\"`
- Key output: `native-smoke-ok [ { rowid: 1, distance: 0 } ]`
- Evidence: `writenow-theia/writenow-core/src/node/writenow-core-backend-contribution.ts` (same smoke logic)

### 2026-01-23 15:18 openspec validate (strict)
- Command: `npx openspec validate --specs --strict --no-interactive`
- Key output: `Totals: 14 passed, 0 failed (14 items)`
- Evidence: `openspec/specs/**`

### 2026-01-23 15:18 rulebook task validate
- Command: `rulebook task validate issue-117-theia-scaffold`
- Key output: `✅ Task issue-117-theia-scaffold is valid` (warning: `No spec files found`)
- Evidence: `rulebook/tasks/issue-117-theia-scaffold/`
