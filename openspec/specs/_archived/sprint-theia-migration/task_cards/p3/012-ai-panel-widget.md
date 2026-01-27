# 012: AI Panel Widget（Theia Widget 化）

Status: done  
Issue: #156  
PR: https://github.com/Leeky1017/WN0.1/pull/157  
RUN_LOG: openspec/_ops/task_runs/ISSUE-156.md

## Context

AI 面板是 WriteNow 的核心交互入口。迁移到 Theia 后，需要将现有 AI 面板 UI/状态机重做为 Theia Widget，并把 streaming 事件流迁移到 Theia RPC/notifications。

## Requirements

- 实现 AI Panel Widget（挂载到预留的右侧面板区）。
- 接入 Theia RPC：支持请求发起、流式响应、取消、错误展示（失败语义可判定）。
- 复用现有 ContextAssembler/RAG/retrieval 逻辑（在 backend）并在 UI 中提供可观测入口（debug/context viewer，最小可用即可）。

## Implementation Notes

- Streaming 方案：复用 Theia 内置 WebSocket JSON-RPC 通道，通过 **client callback（notifications）** 推送 `delta/done/error`：
  - frontend：`WebSocketConnectionProvider.createProxy(WRITENOW_AI_RPC_PATH, client)`，client 暴露 `onStreamEvent`.
  - backend：`JsonRpcConnectionHandler<AiServiceClient>(..., client => server.setClient(client))`，server 侧在生成过程中调用 `client.onStreamEvent(...)` 推送事件。
- Anthropic API Key 配置（任选其一，建议前者）：
  - `WN_AI_API_KEY=...`
  - `ANTHROPIC_API_KEY=...`
  - 可选：`WN_AI_MODEL` / `WN_AI_BASE_URL` / `WN_AI_TIMEOUT_MS` / `WN_AI_MAX_TOKENS` / `WN_AI_TEMPERATURE`

## Acceptance Criteria

- [x] AI Panel Widget 可打开/关闭/聚焦，布局与主题符合基础骨架。
- [x] 至少一个端到端 AI 流式请求在 Theia 上可跑通（含取消），且失败路径可观测。
- [x] 不存在 silent failure：错误码/错误信息可定位，pending 状态被清理。

## Dependencies

- `007`
- `008`
- `010`

## Estimated Effort

- L（3–5 天）
