/**
 * Resizer Component
 * 
 * 可拖拽分割线，用于调整 Sidebar 和 Panel 的宽度。
 * 
 * @see DESIGN_SPEC.md 4.6 Resizer
 */
import { useCallback, useRef, useState, useEffect } from 'react';
import { clsx } from 'clsx';

export interface ResizerProps {
  /** 拖拽时的回调，delta 为正表示向右拖拽 */
  onResize: (delta: number) => void;
  /** 开始拖拽回调 */
  onResizeStart?: () => void;
  /** 结束拖拽回调 */
  onResizeEnd?: () => void;
  /** 拖拽方向，影响 delta 的计算方式 */
  direction?: 'left' | 'right';
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 像素规范
 * 
 * | 属性 | 值 |
 * |------|-----|
 * | 可点击宽度 | 8px |
 * | 可见线宽度 | 1px |
 * | 颜色(默认) | #222222 |
 * | 颜色(hover) | #444444 |
 * | 颜色(拖拽中) | #888888 |
 * | cursor | col-resize |
 */
export function Resizer({
  onResize,
  onResizeStart,
  onResizeEnd,
  direction = 'right',
  disabled = false,
  className,
}: ResizerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.clientX;
      onResizeStart?.();
    },
    [disabled, onResizeStart]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      startXRef.current = e.clientX;
      
      // 根据方向调整 delta
      // direction = 'right' 时，向右拖拽增加宽度（正 delta）
      // direction = 'left' 时，向右拖拽减少宽度（负 delta）
      const adjustedDelta = direction === 'right' ? delta : -delta;
      onResize(adjustedDelta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onResizeEnd?.();
    };

    // 添加事件监听到 document，确保拖拽时鼠标移出组件也能响应
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // 拖拽时禁用文本选择
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, onResize, onResizeEnd, direction]);

  return (
    <div
      className={clsx(
        // 可点击区域 8px
        'w-2 h-full shrink-0',
        'flex items-center justify-center',
        // 光标
        !disabled && 'cursor-col-resize',
        disabled && 'cursor-default',
        'group',
        className
      )}
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation="vertical"
      aria-disabled={disabled}
    >
      {/* 可见线 1px */}
      <div
        className={clsx(
          'w-px h-full',
          'transition-colors duration-[var(--duration-fast)]',
          // 状态颜色
          isDragging
            ? 'bg-[var(--color-border-active)]'
            : disabled
            ? 'bg-[var(--color-border-default)]'
            : 'bg-[var(--color-border-default)] group-hover:bg-[var(--color-border-focus)]'
        )}
      />
    </div>
  );
}

Resizer.displayName = 'Resizer';
