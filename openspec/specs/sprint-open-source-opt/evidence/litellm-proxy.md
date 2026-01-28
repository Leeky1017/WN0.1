# LiteLLM Proxy（P3-001）集成说明（可选）

## 概览

- Status: **可选能力（默认关闭）**
- Why: 为多模型统一、缓存/路由/观测提供统一入口；默认路径保持直连 provider SDK，不引入额外进程。

## 开关与配置

### 环境变量（推荐：Power user / Dev 模式）

- 启用 Proxy：`WN_AI_PROXY_ENABLED=1`
- Proxy 地址（必填）：`WN_AI_PROXY_BASE_URL=http://127.0.0.1:4000`
- Proxy API Key（可选）：`WN_AI_PROXY_API_KEY=...`

> 启用 Proxy 后，WriteNow **不会**强制要求 `WN_AI_API_KEY`（provider key）。provider 的真实密钥由 LiteLLM 自身配置管理。

### LiteLLM 示例

见仓库内 `litellm/`：
- `litellm/README.md`
- `litellm/litellm.config.yaml`

## 实现要点（单链路）

- 当 `ai.proxy.enabled`/`WN_AI_PROXY_ENABLED` 开启时：AI 请求仅走 LiteLLM（OpenAI-compatible `/v1/chat/completions`）。
- 关闭时：保持现有 provider SDK 直连路径（不做同一次请求的“双栈重试/回退”）。

## 可观测性

最小要求：日志输出 `runId/transport/model/latencyMs`，禁止记录 prompt 明文。

实现侧已加入：
- Theia backend：`transport=litellm` / `latencyMs=...`（见 `writenow-theia/writenow-core/src/node/services/ai-service.ts`）
- Legacy IPC：在 `electron/ipc/ai.cjs` 内记录 `transport`（默认关闭不变）

## E2E

- 默认路径（不启用 Proxy）继续使用原有测试覆盖
- 启用 Proxy：使用 fake LiteLLM（HTTP server）提供确定性 SSE streaming 响应，验证写作模式 AI diff 流程可跑通：
  - `writenow-frontend/tests/e2e/_utils/fake-litellm.ts`
  - `writenow-frontend/tests/e2e/write-mode/litellm-proxy.spec.ts`

