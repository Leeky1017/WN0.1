# Proposal: issue-293-local-llm-tab

## Why
为实现 `sprint-open-source-opt` 的 P1 要求，需要在桌面端提供 **本地 LLM 的 Cursor 风格 Tab 续写**（停顿触发、ghost text、Tab 接受、Esc/输入取消），以降低云端 LLM 成本并提供离线可用的写作体验。

## What Changes
- 增加 `localLlm:*` IPC surface：主进程负责本地推理/取消/超时/状态广播，渲染进程通过 preload 暴露的 `electronAPI.localLlm` 调用。
- 更新 IPC contract（SSOT）：新增通道 + 请求/响应类型，并通过 `npm run contract:generate` 同步到各端生成文件。
- 新增编辑器侧 TipTap Tab 续写 extension 模块（停顿触发、ghost text 渲染、Tab 接受、Esc/继续输入取消），并保持与现有 TipTapEditor 集成点解耦（本阶段不改集成点）。

## Impact
- Affected specs:
  - `openspec/specs/sprint-open-source-opt/spec.md`（P1: Local LLM Tab Autocomplete）
  - `openspec/specs/api-contract/spec.md`（IPC envelope / 错误码约束沿用）
- Affected code:
  - `writenow-frontend/electron/main.ts`（新增 `localLlm:*` handlers 注册）
  - `writenow-frontend/electron/preload.ts`（expose `electronAPI.localLlm`）
  - `electron/ipc/contract/ipc-contract.cjs` → `src/types/ipc-generated.ts`（同步到各端）
  - `writenow-frontend/src/lib/editor/extensions/tab-completion.ts`（新增 extension 模块）
- Breaking change: NO（新增能力默认关闭，且 IPC 失败语义为可判定返回）
- User benefit: 本地续写降低成本、提升隐私与离线可用性，并提供更流畅的写作补全体验。

## Notes（模型/隐私/排障）

- **模型体积（示例默认）**：
  - Qwen2.5 0.5B Instruct Q4_K_M：约 398MB
  - Qwen2.5 0.5B Instruct Q2_K：约 339MB（低配）
- **存储位置**：`app.getPath('userData')/models`（每用户独立）
- **隐私**：Tab 续写在本地 `node-llama-cpp` 推理；不需要上传文档内容到云端
- **排障**：
  - 设置 `WN_LOCAL_LLM_MODEL_PATH` 可使用自定义本地 GGUF 路径（推荐用于开发/E2E）
  - 设置 `WN_DISABLE_GPU=1` 可强制 CPU（更稳；适合 CI/无 GPU 环境）
  - 查看 `{userData}/logs/main.log` 获取主进程日志与错误码
