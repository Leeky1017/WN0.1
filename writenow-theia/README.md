# WriteNow — Theia app scaffold (Phase 1)

This directory contains the **production** Theia workspace for WriteNow (separate from the Phase 0 PoC under `theia-poc/`).

## Structure

```text
writenow-theia/
├── browser-app/   # Browser target
├── electron-app/  # Electron target
└── writenow-core/ # Core extension (frontend + backend)
```

## Prerequisites

- Node.js >= 18
- Yarn Classic (1.x)
  - We pin via Corepack: `corepack prepare yarn@1.22.22 --activate`
- Platform build toolchain for native dependencies:
  - Linux: `python3`, `make`, `g++` (and `pkg-config` + X11 headers for `native-keymap`)
  - Windows: Visual Studio Build Tools + Python 3 (see notes below)

Theia upstream prerequisites: see `https://github.com/eclipse-theia/theia/blob/master/doc/Developing.md#prerequisites`.

## Install

```bash
cd writenow-theia
corepack enable
corepack prepare yarn@1.22.22 --activate
yarn install
```

If you see `@vscode/ripgrep` failing with `Request failed: 403` (GitHub API rate-limit), set `GITHUB_TOKEN` and retry:

```bash
GITHUB_TOKEN=... yarn install
```

## Run (Browser target)

```bash
yarn --cwd browser-app start
```

Then open the printed URL (default `http://localhost:3000`).

## Run (Electron target)

```bash
yarn build:electron
yarn --cwd electron-app start
```

## Native modules (better-sqlite3 + sqlite-vec)

`writenow-core` runs a small backend smoke test at startup. You should see logs like:

```text
[writenow-core] native smoke completed successfully
```

### Switching targets (important)

`better-sqlite3` must be built for the current runtime ABI:

- Browser target (host Node ABI): `yarn --cwd browser-app rebuild`
- Electron target (Electron ABI): `yarn --cwd electron-app rebuild`

If you built the Electron target and then start the Browser target (or vice‑versa), run the matching `rebuild` first.

Note: some upstream native deps (e.g. `drivelist`, `keytar`) ship as **Node-API (N-API)** prebuilds and should not require Electron-specific rebuilds.

## Linux / WSL2 sysdeps workaround (pkg-config / X11 headers)

If you cannot install system packages (no sudo) and you hit errors like:

- `/bin/sh: 1: pkg-config: not found`
- missing X11 headers during `native-keymap` build

You can vendor a **local sysroot** into `.sysdeps/root` (gitignored) and run `yarn` commands with env vars:

```bash
cd writenow-theia

mkdir -p .sysdeps/debs .sysdeps/root
cd .sysdeps/debs
apt-get download pkgconf pkgconf-bin libpkgconf3 pkg-config \
  libx11-dev libxkbfile-dev libxau-dev libxdmcp-dev libxcb1-dev \
  x11proto-dev xtrans-dev libpthread-stubs0-dev \
  libx11-6 libxkbfile1 libxau6 libxdmcp6 libxcb1
for deb in *.deb; do dpkg-deb -x "$deb" ../root; done

cd ../..
SYSROOT=$PWD/.sysdeps/root \
PATH="$SYSROOT/usr/bin:$PATH" \
PKG_CONFIG_PATH="$SYSROOT/usr/lib/x86_64-linux-gnu/pkgconfig:$SYSROOT/usr/share/pkgconfig" \
PKG_CONFIG_SYSROOT_DIR="$SYSROOT" \
LD_LIBRARY_PATH="$SYSROOT/usr/lib/x86_64-linux-gnu:$SYSROOT/usr/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" \
yarn install
```

## Windows notes

- Native builds may require:
  - Visual Studio Build Tools (C++ workload / MSVC v143) + Windows SDK
  - Python 3
- If `drivelist` falls back to a source build and fails with `llvm-lib.exe` (e.g. `/LTCG:INCREMENTAL`), ensure you're using the **MSVC** toolset (not LLVM/ClangCL) and retry from a fresh install.
- Setting `GITHUB_TOKEN` is recommended on Windows to avoid GitHub API rate limits during dependency install.
- For convenience, this workspace ships a small wrapper that forces an MSVC environment via `VsDevCmd.bat`:
  - `yarn install:win`
  - `yarn build:electron:win`
  - `yarn start:electron:win`
- See `openspec/_ops/task_runs/ISSUE-117.md` / `openspec/_ops/task_runs/ISSUE-119.md` for the exact commands and outputs verified on Windows.
