# Tasks: LiteLLM Proxy Settings UI

## Implementation

- [x] 添加 IPC Contract 类型定义（`AiProxySettings*`）
- [x] 在 `electron/ipc/ai.cjs` 添加 IPC handlers
- [x] 同步生成 `ipc-generated.ts`
- [x] 在 Theia 后端 `ai-service.ts` 添加 db 读取支持
- [x] 在 `WritenowBackendService` 注册 handlers
- [x] 创建 `useAiProxySettings` hook
- [x] 在 `SettingsPanel` 添加 AI Proxy 配置区

## Verification

- [x] Frontend lint 通过
- [x] Theia backend 编译通过
- [ ] E2E 测试（手动验证）

## Docs

- [x] 更新 RUN_LOG
- [x] 更新 proposal.md
