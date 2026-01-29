/**
 * Select Component
 * 
 * 下拉选择组件，基于 Radix UI Select。
 * 
 * @see DESIGN_SPEC.md 3.15 Select
 */
import { forwardRef } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';

export interface SelectOption {
  /** 选项值 */
  value: string;
  /** 显示标签 */
  label: string;
  /** 是否禁用 */
  disabled?: boolean;
}

export interface SelectProps {
  /** 当前值（受控） */
  value?: string;
  /** 默认值（非受控） */
  defaultValue?: string;
  /** 占位符 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否有错误 */
  error?: boolean;
  /** 选项列表 */
  options: SelectOption[];
  /** 值变更回调 */
  onChange?: (value: string) => void;
  /** 名称（表单用） */
  name?: string;
  /** 必填 */
  required?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 像素规范
 * 
 * 触发器:
 * | 状态 | 背景 | 边框 |
 * |------|------|------|
 * | 默认 | #0f0f0f | #222222 |
 * | 悬停 | #0f0f0f | #333333 |
 * | 打开 | #0f0f0f | #888888 |
 * | 禁用 | #080808 | #1a1a1a |
 * 
 * | 属性 | 值 |
 * |------|-----|
 * | 高度 | 40px |
 * | 内边距 | 10px 12px |
 * | 圆角 | 4px |
 * | 字号 | 13px |
 * | 箭头图标 | 12px, #666666 |
 */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      value,
      defaultValue,
      placeholder = 'Select...',
      disabled = false,
      error = false,
      options,
      onChange,
      name,
      required,
      className,
    },
    ref
  ) => {
    return (
      <SelectPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onChange}
        disabled={disabled}
        name={name}
        required={required}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          className={clsx(
            // 基础样式
            'inline-flex items-center justify-between',
            'w-full h-10',
            'px-3',
            'bg-[var(--color-bg-surface)]',
            'border rounded-[4px]',
            'text-[13px] text-left',
            'outline-none',
            'transition-all duration-[200ms]',
            
            // 边框颜色
            error
              ? 'border-[var(--color-error)]'
              : clsx(
                  'border-[var(--color-border-default)]',
                  'hover:border-[var(--color-border-hover)]',
                  'focus:border-[var(--color-border-active)]',
                  'data-[state=open]:border-[var(--color-border-active)]',
                ),
            
            // 禁用状态
            disabled && 'opacity-50 cursor-not-allowed bg-[var(--color-bg-body)] border-[var(--color-bg-hover)]',
            
            !disabled && 'cursor-pointer',
            
            className,
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder}>
            <span className="text-[var(--color-text-tertiary)]">{placeholder}</span>
          </SelectPrimitive.Value>
          <SelectPrimitive.Icon className="ml-2">
            <ChevronDown className="w-3 h-3 text-[#666666]" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className={clsx(
              // 下拉菜单样式
              'bg-[var(--color-bg-surface)]',
              'border border-[var(--color-border-default)]',
              'rounded-lg',
              'shadow-lg',
              'max-h-[240px]',
              'overflow-auto',
              'z-50',
              'p-1',
              
              // 动画
              'animate-scale-in',
              'data-[state=closed]:animate-fade-out',
            )}
          >
            <SelectPrimitive.Viewport>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled ?? false}
                  className={clsx(
                    // 选项样式
                    'relative',
                    'flex items-center',
                    'h-9 px-3 pr-8',
                    'rounded-[4px]',
                    'text-[13px]',
                    'outline-none',
                    'cursor-pointer',
                    'select-none',
                    'transition-colors duration-[150ms]',
                    
                    // 状态
                    'text-[var(--color-text-primary)]',
                    'hover:bg-[var(--color-bg-hover)]',
                    'data-[highlighted]:bg-[var(--color-bg-hover)]',
                    'data-[state=checked]:bg-[var(--color-border-default)]',
                    
                    // 禁用
                    option.disabled && 'opacity-50 cursor-not-allowed text-[var(--color-text-tertiary)]',
                  )}
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-2">
                    <Check className="w-4 h-4" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  }
);

Select.displayName = 'Select';
