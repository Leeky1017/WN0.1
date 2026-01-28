# Proposal: LiteLLM Proxy Settings UI

## Why

目前 LiteLLM Proxy 需要通过环境变量配置（`WN_AI_PROXY_ENABLED`、`WN_AI_PROXY_BASE_URL`、`WN_AI_PROXY_API_KEY`），对普通用户不友好。需要在 Settings UI 中添加可视化配置界面，让用户可以直接在应用内启用/禁用代理并配置相关参数。

## What Changes

1. **IPC Contract 扩展**：添加 `ai:proxy:settings:get`、`ai:proxy:settings:update`、`ai:proxy:test` 三个 channel
2. **后端实现**：
   - `WritenowBackendService` 添加 AI Proxy settings handlers
   - 设置持久化到 SQLite `settings` 表
   - 环境变量优先于 SQLite 配置
3. **前端实现**：
   - `useAiProxySettings` hook 封装 RPC 调用
   - `SettingsPanel` 添加 "AI 代理（高级）" 可折叠区域
   - 包含启用开关、Base URL 输入、API Key 输入、测试连接按钮

## Impact

- 用户可以在 Settings UI 中直接配置 AI 代理
- 环境变量仍然有效（优先级更高），兼容现有部署方式
- 不影响默认用户体验（默认关闭）
