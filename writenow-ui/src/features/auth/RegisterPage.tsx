/**
 * RegisterPage
 * 
 * 注册页面，按 Login 页面风格推导实现：
 * - 左侧：品牌标识 + Tagline
 * - 右侧：注册表单
 * 
 * @see DESIGN_SPEC.md 9 Agent 推导规则 - Register 参照 Login
 */
import { Link } from 'react-router-dom';
import { RegisterForm } from './components/RegisterForm';

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

export function RegisterPage() {
  return (
    <div className="w-screen h-screen flex bg-[var(--color-bg-body)]">
      {/* 左侧面板 */}
      <div className="hidden lg:flex w-[40%] flex-col justify-between p-12 xl:p-16 border-r border-[var(--color-border-default)]">
        {/* 顶部 - Brand */}
        <Brand />
        
        {/* 中部 - Tagline */}
        <div className="flex-1 flex items-center">
          <h2 className="text-[30px] xl:text-[36px] font-light leading-tight text-[var(--color-text-primary)]">
            Join the future of
            <br />
            <span className="text-[var(--color-text-secondary)]">creative writing.</span>
          </h2>
        </div>
        
        {/* 底部 - Footer */}
        <div className="text-[12px] text-[var(--color-text-tertiary)]">
          <span>&copy; 2026 WriteNow. All rights reserved.</span>
        </div>
      </div>
      
      {/* 右侧面板 */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-[420px] my-auto">
          {/* Mobile Brand (仅移动端显示) */}
          <div className="lg:hidden mb-12 text-center">
            <Brand />
          </div>
          
          {/* 表单标题 */}
          <div className="mb-8">
            <h2 className="text-[24px] font-medium text-[var(--color-text-primary)] mb-2">
              Apply for Access
            </h2>
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              Create your account to start writing
            </p>
          </div>
          
          {/* 注册表单 */}
          <RegisterForm />
          
          {/* 登录链接 */}
          <div className="mt-8 text-center text-[13px] text-[var(--color-text-secondary)]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[var(--color-text-primary)] hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
