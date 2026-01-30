/**
 * SettingsNav Component
 *
 * Settings Modal 左侧导航列表。
 *
 * @see DESIGN_SPEC.md 7.4 Settings Modal
 *
 * 像素规范:
 * | 元素 | 属性 | 值 |
 * |------|------|-----|
 * | 导航区 | 宽度 | 260px |
 * | | 背景 | #0a0a0a |
 * | 导航项(active) | 背景 | #1a1a1a |
 * | | 右边框 | 2px solid #ffffff |
 * | 导航项 | 高度 | 44px |
 * | | 内边距 | 12px 16px |
 * | | 字号 | 14px |
 * | | 字重 | 400 (normal), 500 (active) |
 */
import { clsx } from 'clsx';
import { Pencil, Database, Palette } from 'lucide-react';
import { useSettingsStore, type SettingsSection } from '@/stores';

// 导航项配置
const NAV_ITEMS: {
  id: SettingsSection;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: 'writing', label: 'Writing Experience', icon: Pencil },
  { id: 'data', label: 'Data & Storage', icon: Database },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

export interface SettingsNavProps {
  /** 自定义类名 */
  className?: string;
}

/**
 * SettingsNav
 *
 * 渲染设置导航列表，支持点击切换分区。
 */
export function SettingsNav({ className }: SettingsNavProps) {
  const activeSection = useSettingsStore((s) => s.activeSection);
  const setActiveSection = useSettingsStore((s) => s.setActiveSection);

  return (
    <nav
      className={clsx(
        // 容器样式
        'w-[260px] min-w-[260px]',
        'h-full',
        'bg-[#0a0a0a]',
        'border-r border-[var(--color-border-default)]',
        'py-4',
        className
      )}
    >
      {/* 标题 */}
      <h2
        className={clsx(
          'px-4 mb-4',
          'text-[10px] uppercase',
          'font-medium',
          'tracking-[0.12em]',
          'text-[var(--color-text-secondary)]'
        )}
      >
        Settings
      </h2>

      {/* 导航列表 */}
      <ul className="flex flex-col">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeSection === id;

          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setActiveSection(id)}
                className={clsx(
                  // 基础样式
                  'w-full',
                  'h-11',
                  'px-4',
                  'flex items-center gap-3',
                  'text-[14px] text-left',
                  'transition-all duration-[150ms]',
                  'cursor-pointer',
                  'outline-none',

                  // 默认状态
                  !isActive && [
                    'text-[var(--color-text-secondary)]',
                    'hover:text-[var(--color-text-primary)]',
                    'hover:bg-[var(--color-bg-hover)]',
                  ],

                  // 激活状态
                  isActive && [
                    'text-[var(--color-text-primary)]',
                    'font-medium',
                    'bg-[var(--color-bg-hover)]',
                    'border-r-2 border-r-white',
                  ]
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

SettingsNav.displayName = 'SettingsNav';
