# ISSUE-217

- Issue: #217
- Branch: task/217-standalone-frontend-bridge
- PR: https://github.com/Leeky1017/WN0.1/pull/218

## Plan

- 添加 StandaloneFrontendBridge 支持独立前端 RPC 连接
- 解决 Theia WebSocket 协议与 vscode-ws-jsonrpc 不兼容问题
- 验证 P0-005 端到端通路

## Runs

### 2026-01-25 问题诊断

- 初始连接失败：Theia 使用自己的 WebSocket 消息协议
- vscode-ws-jsonrpc 无法直接连接到 `/services/writenow` 端点
- 需要在 Theia 后端创建兼容层

### 2026-01-25 解决方案

- Command: 创建 `writenow-theia/writenow-core/src/node/standalone-frontend-bridge.ts`
- Key output: WebSocket JSON-RPC 桥接层
- 端点: `/standalone-rpc`

- Command: 修改 `writenow-core-backend-module.ts`
- Key output: 注册 StandaloneFrontendBridge 为 BackendApplicationContribution

- Command: 更新前端 URL
- Key output: `ws://localhost:3000/standalone-rpc`

### 2026-01-25 修复 params 格式

- 问题: vscode-ws-jsonrpc 发送 `params=[["project:bootstrap",{}]]`（嵌套数组）
- 修复: 解包嵌套数组 `[[channel, payload]]` → `[channel, payload]`

### 2026-01-25 验证结果

- Command: `yarn start:browser` (Theia 后端)
- Key output: `Standalone frontend bridge listening on /standalone-rpc`

- 测试: 前端点击"连接"按钮
- Key output: 状态变为"已连接"

- 测试: 调用 `project:bootstrap`
- Key output: 
  ```json
  {
    "createdDefault": true,
    "currentProjectId": "bd4ad038-646f-48f0-a49e-27f80ac6fe0d",
    "migratedArticles": 0
  }
  ```

- Evidence: P0-005 端到端验证成功
