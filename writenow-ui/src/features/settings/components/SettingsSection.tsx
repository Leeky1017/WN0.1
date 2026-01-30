/**
 * SettingsSection Component
 *
 * Settings Modal 右侧内容区容器，包含标题和设置项列表。
 *
 * @see DESIGN_SPEC.md 7.4 Settings Modal
 *
 * 像素规范:
 * | 元素 | 属性 | 值 |
 * |------|------|-----|
 * | Section 标题 | 字号 | 10px |
 * | | 大写 | uppercase |
 * | | 字母间距 | widest (0.12em) |
 * | | 颜色 | #888888 |
 * | Setting 标题 | 字号 | 14px |
 * | | 字重 | 500 |
 * | Setting 描述 | 字号 | 13px |
 * | | 颜色 | #666666 |
 */
import { type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface SettingsSectionProps {
  /** 分区标题 */
  title: string;
  /** 分区描述 (可选) */
  description?: string;
  /** 子内容 */
  children: ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * SettingsSection
 *
 * 设置分区容器，用于组织相关设置项。
 */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section className={clsx('flex flex-col', className)}>
      {/* 分区标题 */}
      <h3
        className={clsx(
          'text-[10px] uppercase',
          'font-medium',
          'tracking-[0.12em]',
          'text-[var(--color-text-secondary)]',
          'mb-4'
        )}
      >
        {title}
      </h3>

      {/* 分区描述 */}
      {description && (
        <p
          className={clsx(
            'text-[13px]',
            'text-[#666666]',
            'mb-4',
            '-mt-2'
          )}
        >
          {description}
        </p>
      )}

      {/* 设置项列表 */}
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

SettingsSection.displayName = 'SettingsSection';

// ============================================================================
// SettingItem - 单个设置项
// ============================================================================

export interface SettingItemProps {
  /** 设置项标题 */
  title: string;
  /** 设置项描述 */
  description?: string;
  /** 右侧控件 */
  children: ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * SettingItem
 *
 * 单个设置项，包含标题、描述和控件。
 */
export function SettingItem({
  title,
  description,
  children,
  className,
}: SettingItemProps) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between',
        'py-3',
        'border-b border-[var(--color-border-default)]',
        'last:border-b-0',
        className
      )}
    >
      {/* 左侧文字 */}
      <div className="flex flex-col gap-0.5 pr-4">
        <span
          className={clsx(
            'text-[14px]',
            'font-medium',
            'text-[var(--color-text-primary)]'
          )}
        >
          {title}
        </span>
        {description && (
          <span
            className={clsx(
              'text-[13px]',
              'text-[#666666]'
            )}
          >
            {description}
          </span>
        )}
      </div>

      {/* 右侧控件 */}
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

SettingItem.displayName = 'SettingItem';
