/**
 * SettingsModal Component
 *
 * 设置模态框，包含左侧导航和右侧内容区。
 *
 * @see DESIGN_SPEC.md 7.4 Settings Modal
 *
 * 像素规范:
 * | 元素 | 属性 | 值 |
 * |------|------|-----|
 * | 模态框 | 宽度 | 1000px |
 * | | 高度 | 700px |
 * | | 背景 | #0f0f0f |
 * | | 边框 | 1px solid #222222 |
 * | 导航区 | 宽度 | 260px |
 * | | 背景 | #0a0a0a |
 */
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { useSettingsStore } from '@/stores';
import {
  SettingsNav,
  WritingSettings,
  DataSettings,
  AppearanceSettings,
} from './components';

export interface SettingsModalProps {
  /** 打开状态 */
  open: boolean;
  /** 状态变更回调 */
  onOpenChange: (open: boolean) => void;
}

/**
 * 根据当前分区渲染对应的设置页面
 */
function SettingsContent() {
  const activeSection = useSettingsStore((s) => s.activeSection);

  switch (activeSection) {
    case 'writing':
      return <WritingSettings />;
    case 'data':
      return <DataSettings />;
    case 'appearance':
      return <AppearanceSettings />;
    default:
      return <WritingSettings />;
  }
}

/**
 * 获取当前分区的标题
 */
function getSectionTitle(section: string): string {
  switch (section) {
    case 'writing':
      return 'Writing Experience';
    case 'data':
      return 'Data & Storage';
    case 'appearance':
      return 'Appearance';
    default:
      return 'Settings';
  }
}

/**
 * SettingsModal
 *
 * 设置模态框，包含左侧导航和右侧内容区。
 */
export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const activeSection = useSettingsStore((s) => s.activeSection);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* 遮罩 */}
        <DialogPrimitive.Overlay
          className={clsx(
            'fixed inset-0',
            'bg-black/80',
            'z-50',
            'animate-fade-in',
            'data-[state=closed]:animate-fade-out'
          )}
        />

        {/* 内容 */}
        <DialogPrimitive.Content
          className={clsx(
            // 定位
            'fixed',
            'top-1/2 left-1/2',
            '-translate-x-1/2 -translate-y-1/2',
            'z-50',

            // 尺寸
            'w-[1000px] h-[700px]',
            'max-w-[95vw] max-h-[90vh]',

            // 样式
            'rounded-2xl',
            'bg-[var(--color-bg-surface)]',
            'border border-[var(--color-border-default)]',
            'shadow-xl',
            'overflow-hidden',

            // 布局
            'flex',

            // 动画
            'animate-scale-in',
            'data-[state=closed]:animate-fade-out'
          )}
        >
          {/* 左侧导航 */}
          <SettingsNav />

          {/* 右侧内容区 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 头部 */}
            <header
              className={clsx(
                'flex items-center justify-between',
                'px-8 py-5',
                'border-b border-[var(--color-border-default)]'
              )}
            >
              <DialogPrimitive.Title
                className={clsx(
                  'text-[18px] font-semibold',
                  'text-[var(--color-text-primary)]'
                )}
              >
                {getSectionTitle(activeSection)}
              </DialogPrimitive.Title>

              {/* 关闭按钮 */}
              <DialogPrimitive.Close
                className={clsx(
                  'w-8 h-8',
                  'flex items-center justify-center',
                  'rounded-lg',
                  'text-[#666666]',
                  'hover:text-[var(--color-text-primary)]',
                  'hover:bg-[var(--color-bg-hover)]',
                  'transition-colors duration-[150ms]',
                  'cursor-pointer'
                )}
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </header>

            {/* 内容 */}
            <div className="flex-1 overflow-auto px-8 py-6">
              <SettingsContent />
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

SettingsModal.displayName = 'SettingsModal';
