/**
 * EditorToolbar Component
 * 
 * 编辑器工具栏，显示文档标题、保存状态和操作按钮。
 * 
 * @see DESIGN_SPEC.md 7.3 Editor 页面
 */
import { ArrowLeft, Share2, Download, MoreHorizontal, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Toolbar } from '../../../components/layout/Toolbar';
import { Button } from '../../../components/primitives/Button';
import { Tooltip } from '../../../components/primitives/Tooltip';
import { useEditorStore, type SaveStatus } from '../../../stores/editorStore';

export interface EditorToolbarProps {
  /** 文档标题 */
  title: string;
  /** 标题变更回调 */
  onTitleChange?: (title: string) => void;
  /** 分享回调 */
  onShare?: () => void;
  /** 导出回调 */
  onExport?: () => void;
  /** 更多操作回调 */
  onMore?: () => void;
}

/**
 * 保存状态指示器
 */
function SaveStatusIndicator({ status, isDirty }: { status: SaveStatus; isDirty: boolean }) {
  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-[var(--color-text-tertiary)]">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="text-[12px]">Saving...</span>
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <div className="flex items-center gap-1.5 text-[var(--color-success)]">
        <Check className="w-3.5 h-3.5" />
        <span className="text-[12px]">Saved</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-[var(--color-error)]">
        <AlertCircle className="w-3.5 h-3.5" />
        <span className="text-[12px]">Save failed</span>
      </div>
    );
  }

  if (isDirty) {
    return (
      <div className="flex items-center gap-1.5 text-[var(--color-text-tertiary)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)]" />
        <span className="text-[12px]">Unsaved</span>
      </div>
    );
  }

  return null;
}

/**
 * 可编辑标题组件
 */
function EditableTitle({ 
  title, 
  onChange 
}: { 
  title: string; 
  onChange?: (title: string) => void;
}) {
  return (
    <input
      type="text"
      value={title}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder="Untitled"
      className={clsx(
        'bg-transparent border-none outline-none',
        'text-[16px] font-medium text-[var(--color-text-primary)]',
        'placeholder:text-[var(--color-text-tertiary)]',
        'w-full max-w-[400px]',
        'focus:ring-0'
      )}
    />
  );
}

export function EditorToolbar({
  title,
  onTitleChange,
  onShare,
  onExport,
  onMore,
}: EditorToolbarProps) {
  const navigate = useNavigate();
  const { saveStatus, isDirty, save } = useEditorStore();

  /**
   * 返回 Dashboard
   */
  function handleBack() {
    // TODO: 如果有未保存更改，提示用户
    navigate('/dashboard');
  }

  /**
   * 手动保存（快捷键 Cmd+S）
   */
  function handleSave() {
    if (isDirty) {
      save();
    }
  }

  return (
    <Toolbar
      size="default"
      className="border-b border-[var(--color-border-default)]"
      left={
        <div className="flex items-center gap-4">
          {/* 返回按钮 */}
          <Tooltip content="Back to Dashboard" side="bottom">
            <button
              type="button"
              onClick={handleBack}
              className={clsx(
                'w-8 h-8 flex items-center justify-center rounded-lg',
                'text-[var(--color-text-tertiary)]',
                'hover:text-[var(--color-text-primary)]',
                'hover:bg-[var(--color-bg-hover)]',
                'transition-colors'
              )}
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </Tooltip>

          {/* 分隔线 */}
          <div className="w-px h-6 bg-[var(--color-border-default)]" />

          {/* 标题 + 保存状态 */}
          <div className="flex items-center gap-3">
            <EditableTitle title={title} onChange={onTitleChange} />
            <SaveStatusIndicator status={saveStatus} isDirty={isDirty} />
          </div>
        </div>
      }
      right={
        <div className="flex items-center gap-2">
          {/* 手动保存按钮（当有未保存更改时显示） */}
          {isDirty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              loading={saveStatus === 'saving'}
            >
              Save
            </Button>
          )}

          {/* 分享按钮 */}
          <Tooltip content="Share" side="bottom">
            <Button
              variant="ghost"
              size="sm"
              onClick={onShare}
              className="w-8 h-8 p-0"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </Tooltip>

          {/* 导出按钮 */}
          <Tooltip content="Export" side="bottom">
            <Button
              variant="ghost"
              size="sm"
              onClick={onExport}
              className="w-8 h-8 p-0"
              aria-label="Export"
            >
              <Download className="w-4 h-4" />
            </Button>
          </Tooltip>

          {/* 更多操作 */}
          <Tooltip content="More options" side="bottom">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMore}
              className="w-8 h-8 p-0"
              aria-label="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>
      }
    />
  );
}

EditorToolbar.displayName = 'EditorToolbar';
