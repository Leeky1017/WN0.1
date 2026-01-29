/**
 * Avatar Component
 * 
 * 头像组件，支持图片/回退文字/首字母显示。
 * 
 * @see DESIGN_SPEC.md 3.9 Avatar
 */
import { forwardRef, useState, type ImgHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** 图片地址 */
  src?: string;
  /** 替代文字 */
  alt?: string;
  /** 回退文字（图片加载失败时显示） */
  fallback?: string;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * 尺寸样式映射
 * 
 * | 尺寸 | 宽高 | 字号 (fallback) |
 * |------|------|-----------------|
 * | sm | 24px | 10px |
 * | md | 32px | 12px |
 * | lg | 40px | 14px |
 * | xl | 64px | 20px |
 */
const sizeStyles: Record<NonNullable<AvatarProps['size']>, { dimension: string; fontSize: string }> = {
  sm: { dimension: 'w-6 h-6', fontSize: 'text-[10px]' },
  md: { dimension: 'w-8 h-8', fontSize: 'text-[12px]' },
  lg: { dimension: 'w-10 h-10', fontSize: 'text-[14px]' },
  xl: { dimension: 'w-16 h-16', fontSize: 'text-[20px]' },
};

/**
 * 从文字中获取首字母
 */
function getInitials(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length === 0 || !words[0]) {
    return '?';
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  const firstWord = words[0];
  const lastWord = words[words.length - 1];
  const firstChar = firstWord[0] ?? '';
  const lastChar = lastWord?.[0] ?? '';
  return (firstChar + lastChar).toUpperCase();
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, fallback, size = 'md', className, ...props }, ref) => {
    const [hasError, setHasError] = useState(false);
    const { dimension, fontSize } = sizeStyles[size];

    // 显示文字回退
    const showFallback = !src || hasError;
    const displayText = fallback || alt || '?';
    const initials = getInitials(displayText);

    return (
      <div
        ref={ref}
        className={clsx(
          // 基础样式
          dimension,
          'rounded-full',
          'overflow-hidden',
          'border border-[var(--color-border-hover)]',
          'flex items-center justify-center',
          'shrink-0',
          
          // 回退状态背景
          showFallback && 'bg-[var(--color-border-default)]',
          
          className,
        )}
      >
        {showFallback ? (
          <span
            className={clsx(
              fontSize,
              'font-medium',
              'text-[var(--color-text-secondary)]',
              'select-none',
            )}
          >
            {initials}
          </span>
        ) : (
          <img
            src={src}
            alt={alt}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover"
            {...props}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';
