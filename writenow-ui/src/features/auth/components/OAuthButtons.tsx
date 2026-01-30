/**
 * OAuthButtons Component
 * 
 * OAuth 登录按钮组件，支持 GitHub 和 SSO 登录。
 * 当前为占位实现，后续对接 auth:oauth:* IPC。
 * 
 * @see DESIGN_SPEC.md 7.1 Login 页面
 */
import { useState } from 'react';
import { Button } from '../../../components/primitives/Button';

/**
 * GitHub 图标
 */
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"
      />
    </svg>
  );
}

/**
 * 企业 SSO 图标
 */
function SsoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export interface OAuthButtonsProps {
  /** 禁用状态 */
  disabled?: boolean;
  /** OAuth 登录开始回调 */
  onOAuthStart?: (provider: 'github' | 'sso') => void;
}

export function OAuthButtons({ disabled, onOAuthStart }: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<'github' | 'sso' | null>(null);

  /**
   * 处理 OAuth 登录点击
   * 
   * 后续对接 auth:oauth:init IPC 后：
   * 1. 调用 window.api.invoke('auth:oauth:init', { provider })
   * 2. 获取 redirectUrl 并打开浏览器或 webview
   * 3. 监听 callback 完成认证
   */
  async function handleOAuthClick(provider: 'github' | 'sso') {
    if (disabled || loadingProvider) return;
    
    setLoadingProvider(provider);
    onOAuthStart?.(provider);
    
    try {
      // TODO: 对接 auth:oauth:init IPC
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // 模拟：显示提示
      console.log(`OAuth ${provider} - Coming soon`);
    } finally {
      setLoadingProvider(null);
    }
  }

  const isDisabled = disabled || loadingProvider !== null;

  return (
    <div className="flex flex-col gap-3">
      {/* GitHub 登录 */}
      <Button
        type="button"
        variant="secondary"
        size="lg"
        fullWidth
        leftIcon={<GitHubIcon className="w-5 h-5" />}
        loading={loadingProvider === 'github'}
        disabled={isDisabled}
        onClick={() => handleOAuthClick('github')}
      >
        Continue with GitHub
      </Button>
      
      {/* 企业 SSO 登录 */}
      <Button
        type="button"
        variant="secondary"
        size="lg"
        fullWidth
        leftIcon={<SsoIcon className="w-5 h-5" />}
        loading={loadingProvider === 'sso'}
        disabled={isDisabled}
        onClick={() => handleOAuthClick('sso')}
      >
        Continue with SSO
      </Button>
    </div>
  );
}
