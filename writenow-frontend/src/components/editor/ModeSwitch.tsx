/**
 * ModeSwitch
 * Why: Sprint Frontend V2 requires a dual-mode editor (richtext <-> markdown) that can be toggled per document.
 */

import { cn } from '@/lib/utils';
import type { EditorMode } from '@/stores';

export interface ModeSwitchProps {
  mode: EditorMode;
  onChange: (mode: EditorMode) => void;
}

export function ModeSwitch(props: ModeSwitchProps) {
  const { mode, onChange } = props;
  return (
    <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-input)] p-0.5">
      <button
        type="button"
        onClick={() => onChange('richtext')}
        className={cn(
          'px-2 py-1 text-xs rounded-[var(--radius-sm)] text-[var(--fg-muted)] hover:text-[var(--fg-default)]',
          mode === 'richtext' && 'bg-[var(--bg-active)] text-[var(--fg-default)]',
        )}
      >
        富文本
      </button>
      <button
        type="button"
        onClick={() => onChange('markdown')}
        className={cn(
          'px-2 py-1 text-xs rounded-[var(--radius-sm)] text-[var(--fg-muted)] hover:text-[var(--fg-default)]',
          mode === 'markdown' && 'bg-[var(--bg-active)] text-[var(--fg-default)]',
        )}
      >
        Markdown
      </button>
    </div>
  );
}

export default ModeSwitch;
