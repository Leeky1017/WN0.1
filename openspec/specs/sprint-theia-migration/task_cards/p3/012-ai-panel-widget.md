# 012: AI Panel Widget（Theia Widget 化）

## Context

AI 面板是 WriteNow 的核心交互入口。迁移到 Theia 后，需要将现有 AI 面板 UI/状态机重做为 Theia Widget，并把 streaming 事件流迁移到 Theia RPC/notifications。

## Requirements

- 实现 AI Panel Widget（挂载到预留的右侧面板区）。
- 接入 Theia RPC：支持请求发起、流式响应、取消、错误展示（失败语义可判定）。
- 复用现有 ContextAssembler/RAG/retrieval 逻辑（在 backend）并在 UI 中提供可观测入口（debug/context viewer，最小可用即可）。

## Acceptance Criteria

- [ ] AI Panel Widget 可打开/关闭/聚焦，布局与主题符合基础骨架。
- [ ] 至少一个端到端 AI 流式请求在 Theia 上可跑通（含取消），且失败路径可观测。
- [ ] 不存在 silent failure：错误码/错误信息可定位，pending 状态被清理。

## Dependencies

- `007`
- `008`
- `010`

## Estimated Effort

- L（3–5 天）

