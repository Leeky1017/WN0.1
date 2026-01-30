/**
 * RegisterForm Component
 * 
 * 注册表单组件，包含 Name/Email/Password/Confirm Password 输入。
 * 按 LoginForm 风格推导实现。
 * 
 * @see DESIGN_SPEC.md 9 Agent 推导规则 - Register 参照 Login
 */
import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../../components/primitives/Input';
import { Button } from '../../../components/primitives/Button';
import { Checkbox } from '../../../components/primitives/Checkbox';
import { useAuthStore } from '../../../stores/authStore';
import { User, Mail, Lock, CheckCircle } from 'lucide-react';

export interface RegisterFormProps {
  /** 注册成功后的回调 */
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const navigate = useNavigate();
  const { isLoading } = useAuthStore();
  
  // 表单状态
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  
  // 验证状态
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    agreeTerms?: string;
  }>({});
  
  // API 错误
  const [apiError, setApiError] = useState<string | null>(null);
  
  // 提交中状态
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * 表单验证
   */
  function validate(): boolean {
    const newErrors: typeof errors = {};
    
    // Name 验证
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    // Email 验证
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password 验证
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }
    
    // Confirm Password 验证
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    // Terms 验证
    if (!agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the terms';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      // TODO: 对接 auth:register IPC
      // await window.api.invoke('auth:register', { name, email, password });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      onSuccess?.();
      navigate('/login', { 
        state: { 
          message: 'Registration successful! Please sign in.',
          email 
        } 
      });
    } catch {
      setApiError('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * 输入变化时清除对应错误
   */
  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value);
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  }

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

  function handleConfirmPasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setConfirmPassword(e.target.value);
    if (errors.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }
  }

  const isDisabled = isLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Name 输入 */}
      <Input
        type="text"
        label="Full Name"
        placeholder="John Doe"
        value={name}
        onChange={handleNameChange}
        error={errors.name}
        leftSlot={<User className="w-4 h-4" />}
        disabled={isDisabled}
        autoComplete="name"
      />
      
      {/* Email 输入 */}
      <Input
        type="email"
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChange={handleEmailChange}
        error={errors.email}
        leftSlot={<Mail className="w-4 h-4" />}
        disabled={isDisabled}
        autoComplete="email"
      />
      
      {/* Password 输入 */}
      <Input
        type="password"
        label="Password"
        placeholder="Create a strong password"
        value={password}
        onChange={handlePasswordChange}
        error={errors.password}
        leftSlot={<Lock className="w-4 h-4" />}
        disabled={isDisabled}
        autoComplete="new-password"
        hint="At least 8 characters with uppercase, lowercase, and number"
      />
      
      {/* Confirm Password 输入 */}
      <Input
        type="password"
        label="Confirm Password"
        placeholder="Confirm your password"
        value={confirmPassword}
        onChange={handleConfirmPasswordChange}
        error={errors.confirmPassword}
        leftSlot={<CheckCircle className="w-4 h-4" />}
        disabled={isDisabled}
        autoComplete="new-password"
      />
      
      {/* Terms Agreement */}
      <div className="flex flex-col gap-1">
        <Checkbox
          checked={agreeTerms}
          onChange={(checked) => {
            setAgreeTerms(checked === true);
            if (errors.agreeTerms) {
              setErrors((prev) => ({ ...prev, agreeTerms: undefined }));
            }
          }}
          label={
            <span className="text-[13px] text-[var(--color-text-secondary)]">
              I agree to the{' '}
              <Link
                to="/terms"
                className="text-[var(--color-text-primary)] hover:underline"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                to="/privacy"
                className="text-[var(--color-text-primary)] hover:underline"
              >
                Privacy Policy
              </Link>
            </span>
          }
          disabled={isDisabled}
        />
        {errors.agreeTerms && (
          <span className="text-[12px] text-[var(--color-error)]">
            {errors.agreeTerms}
          </span>
        )}
      </div>
      
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
        disabled={isDisabled}
      >
        Create Account
      </Button>
    </form>
  );
}
