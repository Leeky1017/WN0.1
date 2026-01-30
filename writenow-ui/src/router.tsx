/**
 * React Router Configuration
 * 
 * 路由结构定义：
 * - /login: 登录页面
 * - /register: 注册页面
 * - /forgot-password: 忘记密码页面
 * - /dashboard: 仪表盘（项目列表）
 * - /editor/:id: 编辑器页面
 * 
 * @see DESIGN_SPEC.md 第七部分
 */
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { EditorPage } from './features/editor/EditorPage';

/**
 * 根布局组件
 * 
 * 提供全局布局包装，后续可在此添加:
 * - 全局 Toast 容器
 * - 认证状态检查
 * - 全局错误边界
 */
function RootLayout() {
  return <Outlet />;
}

/**
 * 路由配置
 * 
 * 当前为本地单用户模式，无需认证检查。
 * 后续对接 auth:* IPC 后，需要添加 ProtectedRoute 包装。
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // 默认重定向到 Dashboard (本地单用户模式)
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      // 登录页面
      {
        path: 'login',
        element: <LoginPage />,
      },
      // 注册页面
      {
        path: 'register',
        element: <RegisterPage />,
      },
      // 忘记密码页面
      {
        path: 'forgot-password',
        element: <ForgotPasswordPage />,
      },
      // 仪表盘
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      // 编辑器
      {
        path: 'editor/:id',
        element: <EditorPage />,
      },
    ],
  },
]);
