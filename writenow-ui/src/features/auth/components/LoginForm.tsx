/**
 * LoginForm Component
 * 
 * 登录表单组件，包含 Email/Password 输入、Remember Me 和 Submit 按钮。
 * 
 * @see DESIGN_SPEC.md 7.1 Login 页面
 */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../../components/primitives/Input';
import { Button } from '../../../components/primitives/Button';
import { Checkbox } from '../../../components/primitives/Checkbox';
import { useAuthStore } from '../../../stores/authStore';
import { Mail, Lock } from 'lucide-react';

export interface LoginFormProps {
  /** 登录成功后的回调 */
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError, rememberedEmail, rememberMe } = useAuthStore();
  
  // 表单状态
  const [email, setEmail] = useState(rememberedEmail || '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(rememberMe);
  
  // 验证状态
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  /**
   * 表单验证
   */
  function validate(): boolean {
    const newErrors: { email?: string; password?: string } = {};
    
    // Email 验证
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password 验证
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  /**
   * 处理表单提交
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    
    if (!validate()) {
      return;
    }
    
    try {
      await login(email, password, remember);
      onSuccess?.();
      navigate('/dashboard');
    } catch {
      // 错误已在 store 中处理
    }
  }

  /**
   * 输入变化时清除对应错误
   */
  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPassword(e.target.value);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
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
        error={errors.email}
        leftSlot={<Mail className="w-4 h-4" />}
        disabled={isLoading}
        autoComplete="email"
      />
      
      {/* Password 输入 */}
      <Input
        type="password"
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChange={handlePasswordChange}
        error={errors.password}
        leftSlot={<Lock className="w-4 h-4" />}
        disabled={isLoading}
        autoComplete="current-password"
      />
      
      {/* Remember Me 和 Forgot Password */}
      <div className="flex items-center justify-between">
        <Checkbox
          checked={remember}
          onChange={(checked) => setRemember(checked === true)}
          label="Remember me"
          disabled={isLoading}
        />
        
        <button
          type="button"
          className="text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          onClick={() => {
            // TODO: 导航到 Forgot Password 页面
            console.log('Forgot password clicked');
          }}
        >
          Forgot your password?
        </button>
      </div>
      
      {/* API 错误提示 */}
      {error && (
        <div className="text-[13px] text-[var(--color-error)] text-center py-2">
          {error}
        </div>
      )}
      
      {/* Submit 按钮 */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
      >
        Sign In
      </Button>
    </form>
  );
}
