# Third-party assets (packaging/offline)

> Why: P3-001 需要记录随包资源的来源/许可证/版本/校验信息，避免发布后出现合规与可追溯性问题。

## Fonts (bundled in renderer assets)

These fonts are bundled for offline rendering (no Google Fonts hard dependency).

- **Inter Variable**
  - Source: `@fontsource-variable/inter@5.2.8` (https://fontsource.org/fonts/inter)
  - License: OFL-1.1 (see `node_modules/@fontsource-variable/inter/LICENSE`)
  - Package publish hash: `b8ad7daf87329f52`
- **Noto Serif SC Variable**
  - Source: `@fontsource-variable/noto-serif-sc@5.2.10` (https://fontsource.org/fonts/noto-serif-sc)
  - License: OFL-1.1 (see `node_modules/@fontsource-variable/noto-serif-sc/LICENSE`)
  - Package publish hash: `510fa6b6bbdfb305`

## Local LLM models (optional, bundled via extraResources)

Model files are **not** committed to git by default. Packaging-time download is supported via `scripts/prepare-packaging.mjs`,
then electron-builder bundles them into `process.resourcesPath/models`.

- **Qwen2.5 0.5B Instruct (GGUF)**
  - Source URLs and SHA256 are defined in `electron/main.ts` (`LOCAL_LLM_MODELS`).
  - License: MUST be verified before distribution (record source + license in `openspec/specs/sprint-write-mode-ide/design/05-packaging.md`).

