## 1. Implementation
- [x] 1.1 增加 Proxy 配置解析：`ai.proxy.enabled/baseUrl/apiKey`（env 覆盖 + 失败语义）。
- [x] 1.2 在 `electron/ipc/ai.cjs` 接入 LiteLLM HTTP 传输（stream/non-stream + cancel/timeout + 稳定错误码 + 可观测日志）。
- [x] 1.3 （可选）新增 `litellm/` 示例配置文件与最小排障说明（默认不启用）。
- [x] 1.4 明确单链路：启用后所有 AI 请求走 Proxy；关闭则保持现有 provider SDK 直连。

## 2. Testing
- [x] 2.1 E2E：默认路径不依赖 LiteLLM；启用 Proxy（env opt-in）时关键 AI 请求可验证走 Proxy。
- [x] 2.2 运行 `npm run lint` + `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive` 并记录 RUN_LOG。

## 3. Documentation
- [ ] 3.1 更新 task card 验收勾选与完成元信息（Status/Issue/PR/RUN_LOG）
- [ ] 3.2 增补配置说明与排障路径（在 task card / 文档中可追溯）
