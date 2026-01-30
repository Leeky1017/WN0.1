/**
 * ForgotPasswordPage
 * 
 * 忘记密码页面，按 Login 页面风格推导实现：
 * - 左侧：品牌标识 + Tagline
 * - 右侧：忘记密码表单
 * 
 * @see DESIGN_SPEC.md 9 Agent 推导规则 - Forgot Password 参照 Login
 */
import { ForgotPasswordForm } from './components/ForgotPasswordForm';

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

export function ForgotPasswordPage() {
  return (
    <div className="w-screen h-screen flex bg-[var(--color-bg-body)]">
      {/* 左侧面板 */}
      <div className="hidden lg:flex w-[40%] flex-col justify-between p-12 xl:p-16 border-r border-[var(--color-border-default)]">
        {/* 顶部 - Brand */}
        <Brand />
        
        {/* 中部 - Tagline */}
        <div className="flex-1 flex items-center">
          <h2 className="text-[30px] xl:text-[36px] font-light leading-tight text-[var(--color-text-primary)]">
            Don&apos;t worry,
            <br />
            <span className="text-[var(--color-text-secondary)]">we&apos;ll help you recover.</span>
          </h2>
        </div>
        
        {/* 底部 - Footer */}
        <div className="text-[12px] text-[var(--color-text-tertiary)]">
          <span>&copy; 2026 WriteNow. All rights reserved.</span>
        </div>
      </div>
      
      {/* 右侧面板 */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[420px]">
          {/* Mobile Brand (仅移动端显示) */}
          <div className="lg:hidden mb-12 text-center">
            <Brand />
          </div>
          
          {/* 表单标题 */}
          <div className="mb-8">
            <h2 className="text-[24px] font-medium text-[var(--color-text-primary)] mb-2">
              Reset your password
            </h2>
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>
          
          {/* 忘记密码表单 */}
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
