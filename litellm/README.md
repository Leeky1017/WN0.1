# LiteLLM Proxy（可选，默认关闭）

本目录提供 LiteLLM Proxy 的**示例配置**，用于 Power user / Dev 模式下的多模型统一与缓存/观测能力验证。

## WriteNow 侧开关（env）

> 说明：WriteNow 默认路径不依赖 LiteLLM。仅当你明确开启开关时，AI 请求才会通过 Proxy（单链路）。

- 启用 Proxy：
  - `WN_AI_PROXY_ENABLED=1`
- Proxy 地址（必填）：
  - `WN_AI_PROXY_BASE_URL=http://127.0.0.1:4000`
- Proxy 访问密钥（可选，取决于你的 LiteLLM 部署）：
  - `WN_AI_PROXY_API_KEY=...`

## LiteLLM 配置示例
- `litellm.config.yaml`：示例 `model_list` + `litellm_settings.cache`。
- 具体字段请以 LiteLLM 官方文档为准；该文件仅用于快速对齐 WriteNow 的 OpenAI-compatible 调用形态。

## Debug / Troubleshooting
- 若启用 Proxy 后报错：
  - `INVALID_ARGUMENT: AI proxy baseUrl is not configured` → 检查 `WN_AI_PROXY_BASE_URL` 或设置项 `ai.proxy.baseUrl`
  - `PERMISSION_DENIED / RATE_LIMITED / UPSTREAM_ERROR` → 查看 LiteLLM 日志与其上游 provider 配置

