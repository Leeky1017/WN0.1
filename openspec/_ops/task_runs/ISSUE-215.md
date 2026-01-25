# ISSUE-215

- Issue: #215
- Branch: task/215-frontend-v2-phase0
- PR: https://github.com/Leeky1017/WN0.1/pull/216

## Plan

- 创建 writenow-frontend 项目骨架（Vite + React + TypeScript 严格模式）
- 配置 Tailwind CSS 4.x + Design Tokens
- 集成 shadcn/ui 基础组件
- 实现 RPC 客户端连接 Theia 后端
- 验证端到端通路（调用 project:bootstrap）

## Runs

### 2026-01-25 开始执行 Phase 0

- Command: `gh issue create`
- Key output: Issue #215 created
- Evidence: https://github.com/Leeky1017/WN0.1/issues/215

- Command: `git worktree add`
- Key output: worktree 创建成功，分支 task/215-frontend-v2-phase0
- Evidence: .worktrees/issue-215-frontend-v2-phase0/

### 2026-01-25 P0-001: 项目骨架

- Command: `npm create vite@latest writenow-frontend -- --template react-ts`
- Key output: 项目创建成功
- Evidence: writenow-frontend/

- Command: `npm install`
- Key output: 依赖安装成功，219 packages
- 配置: TypeScript 严格模式、路径别名 @/

### 2026-01-25 P0-002: Tailwind + Design Tokens

- Command: `npm install tailwindcss @tailwindcss/vite`
- Key output: Tailwind CSS 4.x 安装成功
- Evidence: src/styles/tokens.css, src/styles/globals.css

### 2026-01-25 P0-003: shadcn/ui 基础组件

- Command: `npm install class-variance-authority clsx tailwind-merge @radix-ui/react-slot lucide-react`
- Key output: 依赖安装成功
- Evidence: src/components/ui/button.tsx, src/components/ui/input.tsx, src/components/ui/card.tsx

### 2026-01-25 P0-004: RPC 客户端

- Command: `npm install vscode-ws-jsonrpc vscode-jsonrpc`
- Key output: RPC 依赖安装成功
- Evidence: src/lib/rpc/client.ts, src/lib/rpc/api.ts, src/types/ipc-generated.ts

### 2026-01-25 验证

- Command: `npx tsc --noEmit`
- Key output: TypeScript check passed
- 开发服务器: VITE v7.3.1 ready in 331 ms, http://localhost:5173/

### 2026-01-25 P0-005: 端到端验证

- Issue: #217
- PR: #218

#### 问题诊断

- 初始连接失败：Theia 使用自己的 WebSocket 消息协议，与 vscode-ws-jsonrpc 不兼容
- 需要添加桥接层：在 Theia 后端创建 `/standalone-rpc` WebSocket 端点

#### 解决方案

- Command: 创建 `writenow-theia/writenow-core/src/node/standalone-frontend-bridge.ts`
- Key output: WebSocket JSON-RPC 桥接层，处理 vscode-ws-jsonrpc 消息格式
- 修复: params 嵌套数组问题 `[[channel, payload]]` → `[channel, payload]`

#### 验证结果

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

- Evidence: 截图显示完整端到端通路验证成功

## 结论

Phase 0 (基础设施) 验证完成：
- [x] P0-001: 项目骨架 (Vite + React + TypeScript 严格模式)
- [x] P0-002: Tailwind CSS 4.x + Design Tokens
- [x] P0-003: shadcn/ui 基础组件
- [x] P0-004: RPC 客户端
- [x] P0-005: 端到端验证 (project:bootstrap 调用成功)
