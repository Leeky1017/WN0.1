/**
 * ExportDialog Component
 * 
 * 导出对话框，支持 Markdown/DOCX/PDF 格式选择。
 * 
 * @see DESIGN_SPEC.md 8.1.2 创作流程 - 导出
 * @see DESIGN_SPEC.md 7.4 Settings Modal 规范
 */
import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { FileText, FileType, FileDown, Check } from 'lucide-react';
import { Dialog } from '../../components/primitives/Dialog';
import { Button } from '../../components/primitives/Button';

/**
 * 导出格式
 */
export type ExportFormat = 'markdown' | 'docx' | 'pdf';

/**
 * 格式配置
 */
interface FormatOption {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  extension: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'markdown',
    label: 'Markdown',
    description: 'Plain text with formatting syntax',
    icon: <FileText className="w-5 h-5" />,
    extension: '.md',
  },
  {
    id: 'docx',
    label: 'Word Document',
    description: 'Microsoft Word compatible',
    icon: <FileType className="w-5 h-5" />,
    extension: '.docx',
  },
  {
    id: 'pdf',
    label: 'PDF',
    description: 'Portable Document Format',
    icon: <FileDown className="w-5 h-5" />,
    extension: '.pdf',
  },
];

export interface ExportDialogProps {
  /** 打开状态 */
  open: boolean;
  /** 状态变更回调 */
  onOpenChange: (open: boolean) => void;
  /** 文档标题 */
  title: string;
  /** 文档内容 */
  content: string;
  /** 导出成功回调 */
  onExportSuccess?: (format: ExportFormat, path: string) => void;
  /** 导出失败回调 */
  onExportError?: (error: Error) => void;
}

/**
 * 像素规范
 * 
 * 参照 Settings Modal 规范：
 * | 元素 | 属性 | 值 |
 * |------|------|-----|
 * | 模态框 | 宽度 | 480px |
 * | | 背景 | #0f0f0f |
 * | | 边框 | 1px solid #222222 |
 * | 选项卡片 | 内边距 | 16px |
 * | | 边框 | 1px solid #222222 |
 * | | 边框(selected) | 1px solid #ffffff |
 * | | 圆角 | 8px |
 */
export function ExportDialog({
  open,
  onOpenChange,
  title,
  content,
  onExportSuccess,
  onExportError,
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
  const [isExporting, setIsExporting] = useState(false);

  /**
   * 处理导出
   */
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    
    try {
      // TODO: 对接 window.api.invoke('export:*', { title, content })
      // 根据 selectedFormat 调用不同的导出 IPC
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const format = FORMAT_OPTIONS.find((f) => f.id === selectedFormat);
      const mockPath = `/Downloads/${title}${format?.extension || '.md'}`;
      
      onExportSuccess?.(selectedFormat, mockPath);
      onOpenChange(false);
    } catch (error) {
      onExportError?.(error instanceof Error ? error : new Error('Export failed'));
    } finally {
      setIsExporting(false);
    }
  }, [selectedFormat, title, content, onExportSuccess, onExportError, onOpenChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Export Document"
      description="Choose a format to export your document."
      contentClassName="max-w-[480px]"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            loading={isExporting}
            leftIcon={<FileDown className="w-4 h-4" />}
          >
            Export
          </Button>
        </>
      }
    >
      {/* 格式选择 */}
      <div className="space-y-3">
        {FORMAT_OPTIONS.map((format) => (
          <button
            key={format.id}
            type="button"
            onClick={() => setSelectedFormat(format.id)}
            className={clsx(
              'w-full',
              'flex items-center gap-4',
              'p-4',
              'rounded-lg',
              'border',
              'text-left',
              'transition-all duration-[var(--duration-fast)]',
              
              selectedFormat === format.id
                ? 'bg-[var(--color-bg-hover)] border-[var(--color-text-primary)]'
                : 'bg-transparent border-[var(--color-border-default)] hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-hover)]',
            )}
          >
            {/* 图标 */}
            <div className={clsx(
              'w-10 h-10 shrink-0',
              'flex items-center justify-center',
              'rounded-lg',
              'bg-[var(--color-bg-surface)]',
              selectedFormat === format.id
                ? 'text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-secondary)]',
            )}>
              {format.icon}
            </div>

            {/* 标签和描述 */}
            <div className="flex-1 min-w-0">
              <div className={clsx(
                'text-[14px] font-medium',
                selectedFormat === format.id
                  ? 'text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-primary)]',
              )}>
                {format.label}
              </div>
              <div className="text-[12px] text-[var(--color-text-tertiary)]">
                {format.description}
              </div>
            </div>

            {/* 选中指示器 */}
            <div className={clsx(
              'w-5 h-5 shrink-0',
              'flex items-center justify-center',
              'rounded-full',
              'border',
              'transition-all duration-[var(--duration-fast)]',
              
              selectedFormat === format.id
                ? 'bg-[var(--color-text-primary)] border-[var(--color-text-primary)]'
                : 'bg-transparent border-[var(--color-border-default)]',
            )}>
              {selectedFormat === format.id && (
                <Check className="w-3 h-3 text-[var(--color-bg-body)]" strokeWidth={3} />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* 文件名预览 */}
      <div className="mt-4 p-3 bg-[var(--color-bg-surface)] rounded-lg">
        <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1">
          Output file
        </div>
        <div className="text-[13px] text-[var(--color-text-primary)] font-mono truncate">
          {title}{FORMAT_OPTIONS.find((f) => f.id === selectedFormat)?.extension || '.md'}
        </div>
      </div>
    </Dialog>
  );
}

ExportDialog.displayName = 'ExportDialog';
