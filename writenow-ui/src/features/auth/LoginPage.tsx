/**
 * LoginPage
 * 
 * 登录页面，双栏布局：
 * - 左侧：品牌标识 + Tagline
 * - 右侧：登录表单 + OAuth
 * 
 * @see DESIGN_SPEC.md 7.1 Login 页面
 * @see design-255901f0
 */
import { Link } from 'react-router-dom';
import { LoginForm } from './components/LoginForm';
import { OAuthButtons } from './components/OAuthButtons';

/**
 * 品牌标识组件
 */
function Brand() {
  return (
    <h1 className="text-[24px] tracking-tight">
      <span className="font-semibold text-[var(--color-text-primary)]">WRITE</span>
      <span className="font-light text-[var(--color-text-secondary)]">NOW</span>
    </h1>
  );
}

/**
 * 分割线带文字
 */
function OrDivider() {
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 h-px bg-[var(--color-border-default)]" />
      <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
        OR
      </span>
      <div className="flex-1 h-px bg-[var(--color-border-default)]" />
    </div>
  );
}

export function LoginPage() {
  return (
    <div className="w-screen h-screen flex bg-[var(--color-bg-body)]">
      {/* 左侧面板 */}
      <div className="hidden lg:flex w-[40%] flex-col justify-between p-12 xl:p-16 border-r border-[var(--color-border-default)]">
        {/* 顶部 - Brand */}
        <div className="animate-fade-in">
          <Brand />
        </div>
        
        {/* 中部 - Tagline */}
        <div className="flex-1 flex items-center animate-fade-in delay-100">
          <h2 className="text-[30px] xl:text-[36px] font-light leading-tight text-[var(--color-text-primary)]">
            Where ideas become
            <br />
            <span className="text-[var(--color-text-secondary)]">stories worth telling.</span>
          </h2>
        </div>
        
        {/* 底部 - Footer */}
        <div className="text-[12px] text-[var(--color-text-tertiary)] animate-fade-in delay-200">
          <span>&copy; 2026 WriteNow. All rights reserved.</span>
        </div>
      </div>
      
      {/* 右侧面板 */}
      <div className="flex-1 flex items-center justify-center p-8 animate-fade-in delay-200">
        <div className="w-full max-w-[420px]">
          {/* Mobile Brand (仅移动端显示) */}
          <div className="lg:hidden mb-12 text-center">
            <Brand />
          </div>
          
          {/* 表单标题 */}
          <div className="mb-8">
            <h2 className="text-[24px] font-medium text-[var(--color-text-primary)] mb-2">
              Welcome back
            </h2>
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              Sign in to continue to your workspace
            </p>
          </div>
          
          {/* OAuth 按钮 */}
          <OAuthButtons />
          
          {/* 分割线 */}
          <OrDivider />
          
          {/* 登录表单 */}
          <LoginForm />
          
          {/* 注册链接 */}
          <div className="mt-8 text-center text-[13px] text-[var(--color-text-secondary)]">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="text-[var(--color-text-primary)] hover:underline"
            >
              Apply for Access
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
