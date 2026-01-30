/**
 * ForgotPasswordForm Component
 * 
 * 忘记密码表单组件，输入 Email 发送重置链接。
 * 按 LoginForm 风格推导实现。
 * 
 * @see DESIGN_SPEC.md 9 Agent 推导规则 - Forgot Password 参照 Login
 */
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../../../components/primitives/Input';
import { Button } from '../../../components/primitives/Button';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export interface ForgotPasswordFormProps {
  /** 发送成功后的回调 */
  onSuccess?: (email: string) => void;
}

export function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
  // 表单状态
  const [email, setEmail] = useState('');
  
  // 验证状态
  const [error, setError] = useState<string | null>(null);
  
  // API 错误
  const [apiError, setApiError] = useState<string | null>(null);
  
  // 提交中状态
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 发送成功状态
  const [isSent, setIsSent] = useState(false);

  /**
   * 表单验证
   */
  function validate(): boolean {
    if (!email) {
      setError('Email is required');
      return false;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    setError(null);
    return true;
  }

  /**
   * 处理表单提交
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError(null);
    
    if (!validate()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // TODO: 对接 auth:forgot-password IPC
      // await window.api.invoke('auth:forgot-password', { email });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setIsSent(true);
      onSuccess?.(email);
    } catch {
      setApiError('Failed to send reset link. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * 输入变化时清除错误
   */
  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
    if (error) {
      setError(null);
    }
  }

  /**
   * 重新发送
   */
  function handleResend() {
    setIsSent(false);
  }

  // 发送成功后的界面
  if (isSent) {
    return (
      <div className="text-center">
        {/* 成功图标 */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--color-bg-hover)] flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-[var(--color-success)]" />
        </div>
        
        {/* 成功消息 */}
        <h3 className="text-[18px] font-medium text-[var(--color-text-primary)] mb-2">
          Check your email
        </h3>
        <p className="text-[14px] text-[var(--color-text-secondary)] mb-6">
          We&apos;ve sent a password reset link to
          <br />
          <span className="text-[var(--color-text-primary)]">{email}</span>
        </p>
        
        {/* 提示 */}
        <p className="text-[13px] text-[var(--color-text-tertiary)] mb-6">
          Didn&apos;t receive the email? Check your spam folder or{' '}
          <button
            type="button"
            onClick={handleResend}
            className="text-[var(--color-text-primary)] hover:underline"
          >
            try again
          </button>
        </p>
        
        {/* 返回登录 */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Email 输入 */}
      <Input
        type="email"
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChange={handleEmailChange}
        error={error || undefined}
        leftSlot={<Mail className="w-4 h-4" />}
        disabled={isSubmitting}
        autoComplete="email"
        hint="Enter the email address associated with your account"
      />
      
      {/* API 错误提示 */}
      {apiError && (
        <div className="text-[13px] text-[var(--color-error)] text-center py-2">
          {apiError}
        </div>
      )}
      
      {/* Submit 按钮 */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isSubmitting}
      >
        Send Reset Link
      </Button>
      
      {/* 返回登录 */}
      <Link
        to="/login"
        className="flex items-center justify-center gap-2 text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Sign In
      </Link>
    </form>
  );
}
