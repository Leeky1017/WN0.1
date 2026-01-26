# ISSUE-238
- Issue: #238
- Branch: task/238-ai-panel-stability
- PR: https://github.com/Leeky1017/WN0.1/pull/239

## Plan
- Task 2.1: AI 面板连接状态可视化
- Task 2.2: JSON-RPC client 自动重连机制

## Runs
### 2026-01-26 16:35 worktree-setup
- Command: `git worktree add -b "task/238-ai-panel-stability" ".worktrees/issue-238-ai-panel" origin/main`
- Key output: `HEAD is now at ec3c25b feat: eliminate mock data in sidebar views (#236) (#237)`
- Evidence: `.worktrees/issue-238-ai-panel/`

### 2026-01-26 16:45 task-2.1-connection-status
- AIPanel.tsx 添加连接状态指示器（绿色=已连接/黄色=连接中/红色=断开）
- 添加断开提示条和重连按钮
- 添加 data-testid 属性
- Evidence: `writenow-frontend/src/features/ai-panel/AIPanel.tsx`

### 2026-01-26 16:50 task-2.2-auto-reconnect
- JsonRpcWebSocketClient 添加自动重连机制
- 使用指数退避策略（初始 1s，最大 30s，最多 10 次）
- 添加 onReconnected 回调用于刷新 skills
- SkillsJsonRpcClient 暴露 setOnReconnected 方法
- useAISkill 在重连成功后自动刷新 skills
- Evidence: `writenow-frontend/src/lib/rpc/jsonrpc-client.ts`, `writenow-frontend/src/lib/rpc/skills-client.ts`

### 2026-01-26 16:55 validation
- Command: `npm run lint && npx tsc --noEmit && npm run build`
- Key output: `lint: no errors`, `tsc: no errors`, `vite build: ✓ built in 5.06s`
- Evidence: `dist/`
