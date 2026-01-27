import { cn } from '@/lib/utils';
import type { SaveStatus } from '@/stores/statusBarStore';

interface FooterProps {
  /** Current file name to display */
  fileName?: string;
  /** Unified save status (SSOT) */
  saveStatus: SaveStatus;
  /** Human-readable error message when saveStatus === 'error' */
  saveErrorMessage?: string;
  /** Retry callback when saveStatus === 'error' */
  onRetrySave?: () => void;
  /** Current line number in the editor */
  line?: number;
  /** Current column number in the editor */
  column?: number;
  /** File encoding (e.g., 'UTF-8') */
  encoding?: string;
  /** File language/type (e.g., 'Markdown') */
  language?: string;
  /** Whether connected to backend */
  isConnected?: boolean;
}

/**
 * Footer - System status bar at the bottom of the application.
 *
 * Layout:
 * - Left: Connection status, cursor position, encoding
 * - Right: Language selector
 *
 * Why minimal height (28px): Status bars should be visible but not
 * intrusive, providing quick access to info without stealing focus.
 */
export function Footer({
  fileName = 'Untitled',
  saveStatus,
  saveErrorMessage,
  onRetrySave,
  line = 1,
  column = 1,
  encoding = 'UTF-8',
  language = 'Markdown',
  isConnected = true,
}: FooterProps) {
  const saveLabel =
    saveStatus === 'saved'
      ? '已保存'
      : saveStatus === 'saving'
        ? '保存中…'
        : saveStatus === 'unsaved'
          ? '未保存'
          : '保存失败';

  const saveTitle =
    saveStatus === 'error' && saveErrorMessage
      ? `保存失败：${saveErrorMessage}`
      : saveLabel;

  return (
    <footer
      className="h-7 shrink-0 flex items-center justify-between px-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[10px] text-[var(--fg-muted)] font-medium"
      data-testid="statusbar"
    >
      {/* Left: Status indicators */}
      <div className="flex items-center gap-4">
        {/* Connection status */}
        <div className="flex items-center gap-2" data-testid="wm-connection-indicator">
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              isConnected
                ? 'bg-[var(--success)] shadow-[0_0_4px_var(--success)]'
                : 'bg-[var(--error)] shadow-[0_0_4px_var(--error)]'
            )}
          />
          <span>{isConnected ? '已连接' : '未连接'}</span>
        </div>

        {/* File + Save status */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[var(--fg-subtle)] truncate max-w-[240px]" title={fileName}>
            {fileName}
          </span>
          <span
            className={cn(
              'px-2 py-0.5 rounded border border-[var(--border-subtle)]',
              saveStatus === 'error' ? 'text-[var(--error)]' : 'text-[var(--fg-subtle)]'
            )}
            title={saveTitle}
            data-testid="statusbar-save"
          >
            {saveLabel}
          </span>
          {saveStatus === 'error' && onRetrySave && (
            <button
              type="button"
              className="hover:text-[var(--accent-default)] transition-colors"
              onClick={onRetrySave}
              title="重试保存"
            >
              重试
            </button>
          )}
        </div>

        {/* Cursor position */}
        <span className="text-[var(--fg-subtle)] tabular-nums">
          行 {line}, 列 {column}
        </span>
        {/* Encoding */}
        <span className="text-[var(--fg-subtle)]">{encoding}</span>
      </div>

      {/* Right: Language */}
      <div className="flex items-center gap-4">
        <button className="hover:text-[var(--accent-default)] cursor-pointer transition-colors">
          {language}
        </button>
      </div>
    </footer>
  );
}
