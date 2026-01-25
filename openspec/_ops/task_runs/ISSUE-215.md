# ISSUE-215

- Issue: #215
- Branch: task/215-frontend-v2-phase0
- PR: <fill-after-created>

## Plan

1. 创建 writenow-frontend 项目骨架（Vite + React + TypeScript 严格模式）
2. 配置 Tailwind CSS 4.x + Design Tokens
3. 集成 shadcn/ui 基础组件
4. 实现 RPC 客户端连接 Theia 后端
5. 验证端到端通路（调用 project:bootstrap）

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
