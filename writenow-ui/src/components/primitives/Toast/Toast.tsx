/**
 * Toast Component
 * 
 * 消息提示组件，支持 default/success/error/warning 四种变体。
 * 
 * @see DESIGN_SPEC.md 3.13 Toast
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { clsx } from 'clsx';

// ============================================================================
// Types
// ============================================================================

export type ToastVariant = 'default' | 'success' | 'error' | 'warning';

export interface ToastData {
  /** 唯一标识 */
  id: string;
  /** 变体 */
  variant?: ToastVariant;
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 自定义操作 */
  action?: ReactNode;
  /** 显示时长（毫秒），0 表示不自动关闭，默认 3000ms */
  duration?: number;
}

interface ToastContextValue {
  /** 显示 toast */
  toast: (data: Omit<ToastData, 'id'>) => string;
  /** 关闭指定 toast */
  dismiss: (id: string) => void;
  /** 关闭所有 toast */
  dismissAll: () => void;
}

// ============================================================================
// Context
// ============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * 使用 Toast 的 hook
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============================================================================
// Styles
// ============================================================================

/**
 * 变体样式映射
 * 
 * | 变体 | 左边框色 | 图标色 |
 * |------|----------|--------|
 * | default | #888888 | #888888 |
 * | success | #44ff44 | #44ff44 |
 * | error | #ff4444 | #ff4444 |
 * | warning | #ffaa44 | #ffaa44 |
 */
const variantStyles: Record<ToastVariant, { border: string; icon: string }> = {
  default: { border: 'border-l-[var(--color-text-secondary)]', icon: 'text-[var(--color-text-secondary)]' },
  success: { border: 'border-l-[var(--color-success)]', icon: 'text-[var(--color-success)]' },
  error: { border: 'border-l-[var(--color-error)]', icon: 'text-[var(--color-error)]' },
  warning: { border: 'border-l-[var(--color-warning)]', icon: 'text-[var(--color-warning)]' },
};

const variantIcons: Record<ToastVariant, typeof Info> = {
  default: Info,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
};

// ============================================================================
// Components
// ============================================================================

interface ToastItemProps extends ToastData {
  onClose: (id: string) => void;
}

function ToastItem({
  id,
  variant = 'default',
  title,
  description,
  action,
  duration = 3000,
  onClose,
}: ToastItemProps) {
  const { border, icon } = variantStyles[variant];
  const Icon = variantIcons[variant];

  return (
    <ToastPrimitive.Root
      duration={duration === 0 ? Infinity : duration}
      onOpenChange={(open) => {
        if (!open) onClose(id);
      }}
      className={clsx(
        // 基础样式
        'relative',
        'flex items-start gap-3',
        'min-w-[300px] max-w-[400px]',
        'p-3 pr-10',
        'rounded-lg',
        'bg-[var(--color-bg-hover)]',
        'border border-[var(--color-border-hover)]',
        'border-l-[3px]',
        border,
        'shadow-md',
        
        // 动画
        'animate-slide-in-right',
        'data-[state=closed]:animate-slide-out-right',
        'data-[swipe=end]:animate-slide-out-right',
      )}
    >
      {/* 图标 */}
      <Icon className={clsx('w-4 h-4 mt-0.5 shrink-0', icon)} />

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        {title && (
          <ToastPrimitive.Title className="text-[14px] font-medium text-[var(--color-text-primary)]">
            {title}
          </ToastPrimitive.Title>
        )}
        {description && (
          <ToastPrimitive.Description className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            {description}
          </ToastPrimitive.Description>
        )}
        {action && (
          <div className="mt-2">
            {action}
          </div>
        )}
      </div>

      {/* 关闭按钮 */}
      <ToastPrimitive.Close
        className={clsx(
          'absolute top-3 right-3',
          'w-5 h-5',
          'flex items-center justify-center',
          'rounded',
          'text-[#666666]',
          'hover:text-[var(--color-text-primary)]',
          'hover:bg-[var(--color-bg-active)]',
          'transition-colors duration-[150ms]',
        )}
      >
        <X className="w-3.5 h-3.5" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

// ============================================================================
// Provider
// ============================================================================

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Toast Provider
 * 
 * 在应用根组件中包裹此 Provider 以启用 Toast 功能。
 * 
 * @example
 * ```tsx
 * import { ToastProvider, useToast } from '@/components/primitives/Toast';
 * 
 * function App() {
 *   return (
 *     <ToastProvider>
 *       <MyApp />
 *     </ToastProvider>
 *   );
 * }
 * 
 * function MyComponent() {
 *   const { toast } = useToast();
 *   
 *   const handleClick = () => {
 *     toast({ title: 'Success!', variant: 'success' });
 *   };
 *   
 *   return <button onClick={handleClick}>Show Toast</button>;
 * }
 * ```
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const toast = useCallback((data: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 11);
    setToasts((prev) => [...prev, { ...data, id }]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss, dismissAll }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}

        {/* Toast 容器 */}
        {toasts.map((t) => (
          <ToastItem key={t.id} {...t} onClose={dismiss} />
        ))}

        {/* Viewport - Toast 显示区域 */}
        <ToastPrimitive.Viewport
          className={clsx(
            'fixed bottom-6 right-6',
            'flex flex-col gap-3',
            'w-[400px]',
            'z-[100]',
            'outline-none',
          )}
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

ToastProvider.displayName = 'ToastProvider';

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * 独立的 Toast 组件（用于非 Provider 场景的单个 Toast 显示）
 */
export interface ToastProps {
  /** 是否打开 */
  open: boolean;
  /** 状态变更回调 */
  onOpenChange: (open: boolean) => void;
  /** 变体 */
  variant?: ToastVariant;
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 自定义操作 */
  action?: ReactNode;
  /** 显示时长（毫秒） */
  duration?: number;
}

export function Toast({
  open,
  onOpenChange,
  variant = 'default',
  title,
  description,
  action,
  duration = 3000,
}: ToastProps) {
  const { border, icon } = variantStyles[variant];
  const Icon = variantIcons[variant];

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      <ToastPrimitive.Root
        open={open}
        onOpenChange={onOpenChange}
        duration={duration === 0 ? Infinity : duration}
        className={clsx(
          // 基础样式
          'relative',
          'flex items-start gap-3',
          'min-w-[300px] max-w-[400px]',
          'p-3 pr-10',
          'rounded-lg',
          'bg-[var(--color-bg-hover)]',
          'border border-[var(--color-border-hover)]',
          'border-l-[3px]',
          border,
          'shadow-md',
          
          // 动画
          'animate-slide-in-right',
          'data-[state=closed]:animate-slide-out-right',
        )}
      >
        {/* 图标 */}
        <Icon className={clsx('w-4 h-4 mt-0.5 shrink-0', icon)} />

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {title && (
            <ToastPrimitive.Title className="text-[14px] font-medium text-[var(--color-text-primary)]">
              {title}
            </ToastPrimitive.Title>
          )}
          {description && (
            <ToastPrimitive.Description className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
              {description}
            </ToastPrimitive.Description>
          )}
          {action && (
            <div className="mt-2">
              {action}
            </div>
          )}
        </div>

        {/* 关闭按钮 */}
        <ToastPrimitive.Close
          className={clsx(
            'absolute top-3 right-3',
            'w-5 h-5',
            'flex items-center justify-center',
            'rounded',
            'text-[#666666]',
            'hover:text-[var(--color-text-primary)]',
            'hover:bg-[var(--color-bg-active)]',
            'transition-colors duration-[150ms]',
          )}
        >
          <X className="w-3.5 h-3.5" />
        </ToastPrimitive.Close>
      </ToastPrimitive.Root>

      <ToastPrimitive.Viewport
        className={clsx(
          'fixed bottom-6 right-6',
          'flex flex-col gap-3',
          'w-[400px]',
          'z-[100]',
          'outline-none',
        )}
      />
    </ToastPrimitive.Provider>
  );
}

Toast.displayName = 'Toast';
