# Proposal: issue-330-p3-001-litellm-proxy

## Why
WriteNow 需要为多模型支持提供统一入口（路由/缓存/fallback/观测），但又必须保证桌面端默认路径稳定且不引入额外进程。LiteLLM Proxy 可作为 **P3 可选能力**：通过显式开关将请求层切换为 OpenAI-compatible HTTP 入口，从而减少业务层分叉并为未来扩展留出空间。

## What Changes
- 在 `electron/ipc/ai.cjs` 增加 LiteLLM Proxy 路由：当 `ai.proxy.enabled=true` 时，AI 请求通过 HTTP 发送到 `${ai.proxy.baseUrl}/v1/chat/completions`（支持 streaming），否则保持现有 provider SDK 直连路径。
- 新增/完善配置解析：`ai.proxy.enabled/baseUrl/apiKey`（支持 env 覆盖），并明确与现有 provider 配置的优先级与失败语义（稳定错误码、可重试、无 prompt 明文日志）。
- 增加 E2E：覆盖默认路径与（环境变量 opt-in 的）开启 Proxy 路径。

## Impact
- Affected specs: `openspec/specs/sprint-open-source-opt/task_cards/p3/P3-001-litellm-proxy.md`
- Affected code: `electron/ipc/ai.cjs`、`tests/e2e/**`（以及可选 `litellm/**` 示例配置）
- Breaking change: NO（默认关闭）
- User benefit: Power user / Dev 模式可用统一代理接入多模型与缓存/观测能力，同时保持普通用户的默认路径零依赖。
