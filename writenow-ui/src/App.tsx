/**
 * WriteNow UI - Main App Component
 * 
 * 应用根组件，集成 React Router 路由系统。
 * 
 * @see router.tsx 路由配置
 * @see DESIGN_SPEC.md
 */
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

export function App() {
  return <RouterProvider router={router} />;
}
