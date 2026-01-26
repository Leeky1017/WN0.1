import { cn } from '@/lib/utils';

interface FooterProps {
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
  line = 1,
  column = 1,
  encoding = 'UTF-8',
  language = 'Markdown',
  isConnected = true,
}: FooterProps) {
  return (
    <footer className="h-7 shrink-0 flex items-center justify-between px-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[10px] text-[var(--fg-muted)] font-medium">
      {/* Left: Status indicators */}
      <div className="flex items-center gap-4">
        {/* Connection status */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              isConnected
                ? 'bg-[var(--success)] shadow-[0_0_4px_var(--success)]'
                : 'bg-[var(--error)] shadow-[0_0_4px_var(--error)]'
            )}
          />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        {/* Cursor position */}
        <span className="text-[var(--fg-subtle)] tabular-nums">
          Ln {line}, Col {column}
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
