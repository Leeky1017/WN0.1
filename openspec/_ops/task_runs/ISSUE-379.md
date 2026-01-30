# ISSUE-379

- Issue: #379
- Branch: task/379-variant-p3-pages
- PR: https://github.com/Leeky1017/WN0.1/pull/380

## Plan

- 实现 Phase 3 核心页面组件（9 个任务）
- 配置 React Router 路由系统
- 创建 authStore 和 projectStore 状态管理
- 实现 Login 页面（LoginForm + OAuthButtons）
- 实现 Dashboard 页面（ProjectCard + HeroCard + DashboardGrid）

## Runs

### 2026-01-30 实现路由配置

- Command: 创建 `writenow-ui/src/router.tsx`
- Key output:
  - 路由结构：`/login`, `/dashboard`, `/editor/:id`
  - 默认重定向到 `/dashboard`（本地单用户模式）
  - 使用 `createBrowserRouter` + `RouterProvider`
- Evidence: `writenow-ui/src/router.tsx`

### 2026-01-30 实现 authStore

- Command: 创建 `writenow-ui/src/stores/authStore.ts`
- Key output:
  - 本地单用户模式（临时方案）
  - 支持 login/logout/rememberMe
  - 使用 Zustand + persist 中间件
- Evidence: `writenow-ui/src/stores/authStore.ts`

### 2026-01-30 实现 projectStore

- Command: 创建 `writenow-ui/src/stores/projectStore.ts`
- Key output:
  - 项目 CRUD 操作（对接 project:* IPC 预留）
  - Mock 数据用于开发
  - 过滤功能（all/draft/published/archived）
- Evidence: `writenow-ui/src/stores/projectStore.ts`

### 2026-01-30 实现 Login 组件

- Command: 创建 `writenow-ui/src/features/auth/` 目录
- Key output:
  - `LoginForm.tsx`: Email/Password 输入 + Remember Me + Submit
  - `OAuthButtons.tsx`: GitHub/SSO 按钮（预留）
  - `LoginPage.tsx`: 双栏布局（40% 品牌 + 60% 表单）
- Evidence: `writenow-ui/src/features/auth/`

### 2026-01-30 实现 Dashboard 组件

- Command: 创建 `writenow-ui/src/features/dashboard/` 目录
- Key output:
  - `ProjectCard.tsx`: 240px 固定高度，显示标题/摘要/日期/标签
  - `HeroCard.tsx`: 320px 最小高度，60/40 布局
  - `DashboardGrid.tsx`: Bento Grid 风格布局
  - `DashboardPage.tsx`: 整合页面
- Evidence: `writenow-ui/src/features/dashboard/`

### 2026-01-30 更新 App.tsx

- Command: 更新 `writenow-ui/src/App.tsx` 使用 RouterProvider
- Key output: 集成 React Router 路由系统
- Evidence: `writenow-ui/src/App.tsx`

### 2026-01-30 类型检查

- Command: `npm run typecheck`
- Key output: 无错误，Exit code 0
- Evidence: TypeScript 编译通过

### 2026-01-30 开发服务器测试

- Command: `npm run dev`
- Key output: `VITE v6.4.1 ready in 374 ms` - Local: http://localhost:3000/
- Evidence: 开发服务器启动成功
