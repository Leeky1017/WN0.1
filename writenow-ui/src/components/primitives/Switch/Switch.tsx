/**
 * Switch Component
 * 
 * 开关组件，基于 Radix UI Switch。
 * 
 * @see DESIGN_SPEC.md 3.5 Switch
 */
import { forwardRef } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { clsx } from 'clsx';

export interface SwitchProps {
  /** 选中状态（受控） */
  checked?: boolean;
  /** 默认选中状态（非受控） */
  defaultChecked?: boolean;
  /** 禁用状态 */
  disabled?: boolean;
  /** 状态变更回调 */
  onChange?: (checked: boolean) => void;
  /** 名称（表单用） */
  name?: string;
  /** 值（表单用） */
  value?: string;
  /** 必填 */
  required?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 像素规范
 * 
 * | 状态 | 轨道背景 | 轨道边框 | 滑块颜色 |
 * |------|----------|----------|----------|
 * | 未选中 | #1a1a1a | #333333 | #666666 |
 * | 选中 | #ffffff | #ffffff | #080808 |
 * 
 * | 属性 | 值 |
 * |------|-----|
 * | 轨道宽度 | 44px |
 * | 轨道高度 | 24px |
 * | 轨道圆角 | 12px |
 * | 滑块尺寸 | 18px |
 * | 滑块位移 | 20px |
 * | 动效时长 | 300ms |
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked,
      defaultChecked,
      disabled = false,
      onChange,
      name,
      value,
      required,
      className,
    },
    ref
  ) => {
    const rootClassName = clsx(
      // 轨道样式
      'relative',
      'w-[44px] h-6',
      'rounded-xl',
      'transition-all duration-[300ms]',
      'cursor-pointer',
      
      // 未选中状态
      'bg-[var(--color-bg-hover)] border border-[var(--color-border-hover)]',
      
      // 选中状态
      'data-[state=checked]:bg-[var(--color-primary)]',
      'data-[state=checked]:border-[var(--color-primary)]',
      
      // 禁用状态
      disabled && 'opacity-50 cursor-not-allowed',
      
      // 自定义类名
      className,
    );

    return (
      <SwitchPrimitive.Root
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
        <SwitchPrimitive.Thumb
          className={clsx(
            // 滑块样式
            'block',
            'w-[18px] h-[18px]',
            'rounded-full',
            'transition-all duration-[300ms]',
            
            // 位置
            'translate-x-[3px]',
            'data-[state=checked]:translate-x-[23px]',
            
            // 未选中颜色
            'bg-[#666666]',
            
            // 选中颜色
            'data-[state=checked]:bg-[var(--color-bg-body)]',
          )}
        />
      </SwitchPrimitive.Root>
    );
  }
);

Switch.displayName = 'Switch';
