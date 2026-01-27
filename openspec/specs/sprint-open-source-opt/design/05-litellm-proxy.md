# 05 - LiteLLM Proxy 多模型统一（可选）

本设计文档定义 LiteLLM Proxy 的引入方式与边界：它是 **P3 可选能力**，用于多模型统一、缓存与 fallback；默认路径不引入额外进程。

---

## 目标

- 统一 OpenAI/Anthropic/其他 provider 的调用接口（减少业务层分叉）。
- 提供“缓存 + fallback + 观测”能力，避免在业务代码中堆叠多套重试/路由逻辑。

## 非目标（Non-goals）

- 不将 LiteLLM 作为 P0/P1 的默认依赖。
- 不在本 Sprint 强制把所有 AI 请求迁移到 Proxy（避免双栈并存）。

---

## 架构概览

```
┌──────────────────────────────┐
│ Backend / AI proxy layer      │
│ - assembles prompt            │
│ - handles cancel/timeout      │
└───────────────┬──────────────┘
                │
        default │ direct provider SDK
                │
                ▼
     ┌──────────────────────┐
     │ Provider APIs         │
     │ OpenAI / Anthropic    │
     └──────────────────────┘

(optional)
┌──────────────────────────────┐
│ Backend / AI proxy layer      │
└───────────────┬──────────────┘
                │ HTTP
                ▼
     ┌──────────────────────┐
     │ LiteLLM Proxy         │
     │ - routing             │
     │ - caching             │
     │ - fallback            │
     └──────────────┬───────┘
                    ▼
           Provider APIs
```

---

## 引入策略（桌面场景优先）

### Option A：随应用打包 LiteLLM（不推荐默认）

- Pros：对用户透明。
- Cons：LiteLLM 依赖 Python 生态；桌面打包体积大、升级复杂；跨平台兼容成本高。

### Option B：Power user / Dev 模式外置 Proxy（推荐）

- 在本地以独立进程运行 LiteLLM（用户自行安装或团队提供脚本）。
- WriteNow 只需支持：
  - `ai.proxy.enabled` 开关
  - `ai.proxy.baseUrl` 配置
  - `ai.proxy.apiKey`（如需要）

### Option C：团队托管 Proxy（未来协作版再评估）

- 桌面“本地优先”冲突较大，除非进入“团队协作/云服务”阶段。

---

## 配置示例

> 说明：以下为 LiteLLM 常见配置形态；具体字段以 LiteLLM 官方文档为准。

```yaml
# litellm.config.yaml
model_list:
  - model_name: gpt-4o
    litellm_params:
      model: openai/gpt-4o
  - model_name: claude-sonnet
    litellm_params:
      model: anthropic/claude-sonnet-4-20250514

litellm_settings:
  cache: true
  cache_params:
    type: disk
    ttl: 600
```

---

## 接入点（WriteNow 侧）

### 单链路原则

- **默认**：直连 provider SDK（保持现有实现）。
- **可选**：当 `ai.proxy.enabled=true` 时，AI 请求层 **仅走 LiteLLM**（不得保留“同一次请求两种路径尝试”的双栈逻辑）。

### 伪代码（请求分发）

```ts
type AiProxyConfig = {
  enabled: boolean
  baseUrl: string
  apiKey?: string
}

async function sendChatCompletion(input: { model: string; messages: unknown[] }, cfg: AiProxyConfig) {
  if (!cfg.enabled) {
    return await sendViaProviderSdk(input)
  }

  // Why: Keep business logic stable; swap transport via config.
  return await fetch(`${cfg.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
    body: JSON.stringify(input),
  })
}
```

---

## 缓存与隐私

- LiteLLM 缓存 MUST 明确范围：仅缓存“稳定前缀/系统指令”或由 proxy 默认策略决定。
- 桌面场景下若启用磁盘缓存：
  - MUST 使用用户数据目录（`app.getPath('userData')`）
  - SHOULD 支持“一键清空缓存”
  - MUST 避免在日志中落盘 prompt 明文

---

## 可观测性

开启 LiteLLM 时 WriteNow MUST 能观测到：
- 请求延迟（P50/P95）
- 成功率与错误码分布
- cache hit/miss（若 proxy 暴露）
- fallback 触发次数

最小要求：日志中输出 `requestId/runId/model/latencyMs`，并禁止记录完整 prompt。
