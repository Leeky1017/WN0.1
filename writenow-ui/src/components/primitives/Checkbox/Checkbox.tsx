/**
 * Checkbox Component
 * 
 * 复选框组件，基于 Radix UI Checkbox。
 * 
 * @see DESIGN_SPEC.md 3.6 Checkbox
 */
import { forwardRef, type ReactNode } from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { clsx } from 'clsx';

export interface CheckboxProps {
  /** 选中状态（受控） */
  checked?: boolean | 'indeterminate';
  /** 默认选中状态（非受控） */
  defaultChecked?: boolean;
  /** 禁用状态 */
  disabled?: boolean;
  /** 状态变更回调 */
  onChange?: (checked: boolean | 'indeterminate') => void;
  /** 名称（表单用） */
  name?: string;
  /** 值（表单用） */
  value?: string;
  /** 必填 */
  required?: boolean;
  /** 标签 */
  label?: ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * 像素规范
 * 
 * | 状态 | 背景 | 边框 | 勾选色 |
 * |------|------|------|--------|
 * | 未选中 | #0f0f0f | #222222 | - |
 * | 悬停 | #0f0f0f | #444444 | - |
 * | 选中 | #ffffff | #ffffff | #080808 |
 * 
 * | 属性 | 值 |
 * |------|-----|
 * | 尺寸 | 16px × 16px |
 * | 圆角 | 3px |
 */
export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    {
      checked,
      defaultChecked,
      disabled = false,
      onChange,
      name,
      value,
      required,
      label,
      className,
    },
    ref
  ) => {
    const rootClassName = clsx(
      // 基础样式
      'w-4 h-4',
      'rounded-[3px]',
      'border',
      'transition-all duration-[150ms]',
      'cursor-pointer',
      'flex items-center justify-center',
      'shrink-0',
      
      // 未选中状态
      'bg-[var(--color-bg-surface)]',
      'border-[var(--color-border-default)]',
      'hover:border-[var(--color-border-focus)]',
      
      // 选中状态
      'data-[state=checked]:bg-[var(--color-primary)]',
      'data-[state=checked]:border-[var(--color-primary)]',
      'data-[state=indeterminate]:bg-[var(--color-primary)]',
      'data-[state=indeterminate]:border-[var(--color-primary)]',
      
      // 禁用状态
      disabled && 'opacity-50 cursor-not-allowed',
      
      className,
    );

    const checkbox = (
      <CheckboxPrimitive.Root
        ref={ref}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onCheckedChange={onChange}
        name={name}
        value={value}
        required={required}
        className={rootClassName}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center">
          {checked === 'indeterminate' ? (
            <Minus className="w-3 h-3 text-[var(--color-bg-body)]" strokeWidth={2.5} />
          ) : (
            <Check className="w-3 h-3 text-[var(--color-bg-body)]" strokeWidth={2.5} />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );

    // 有标签时包装成 label
    if (label) {
      return (
        <label
          className={clsx(
            'inline-flex items-center gap-2',
            'text-[13px] text-[var(--color-text-primary)]',
            disabled && 'opacity-50 cursor-not-allowed',
            !disabled && 'cursor-pointer',
          )}
        >
          {checkbox}
          <span>{label}</span>
        </label>
      );
    }

    return checkbox;
  }
);

Checkbox.displayName = 'Checkbox';
