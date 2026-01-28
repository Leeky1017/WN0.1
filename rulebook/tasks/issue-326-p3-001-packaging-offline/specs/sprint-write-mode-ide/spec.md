# Spec Delta: P3-001 Packaging & Offline (issue-326)

## Purpose

将 Write Mode 的“可发布性”变成工程硬门禁：打包链路必须可重复、可诊断、离线可用，并避免把运行时编译/下载成本转嫁给用户。

## Requirements

### R1. Packaging pipeline MUST build Theia backend and verify artifacts

- 打包命令 MUST 先构建 `writenow-theia/browser-app`（含 native rebuild）再执行 electron-builder。
- 打包前 MUST 校验后端入口存在（例如 `browser-app/lib/backend/main.*`）。
- `schema.sql` MUST 可在后端运行时被加载（缺失时打包 MUST fail-fast 或在打包阶段补齐到入口目录）。

### R2. Fonts MUST be offline (no Google Fonts hard dependency)

- Renderer MUST 不依赖在线字体资源（例如 Google Fonts）完成首次渲染。
- 字体加载 SHOULD 遵循性能预算：仅默认字体进入热路径（避免影响输入延迟与冷启动）。

### R3. Bundled local LLM model MUST be usable offline when present

- 当 `process.resourcesPath/models/<model>.gguf` 存在且用户启用本地续写时，系统 MUST 能在不下载的情况下完成模型可用性保障（例如按需复制到 `userData/models` 并校验）。
- 模型保障流程 MUST 提供可观测失败语义（稳定错误码 + 可读信息），且 MUST NOT 阻塞冷启动进入可输入状态。

### R4. Packaging smoke MUST exist and be automatable

- MUST 提供可被 CI/release 调用的打包 smoke（脚本或最小 E2E）。
- smoke MUST 验证：应用可启动（至少后端 ready）且日志落盘可取证（`main.log`）。

