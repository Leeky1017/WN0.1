/**
 * SlashCommandMenu
 * Why: Render a keyboard-navigable command list for AI slash commands.
 */

import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { SlashCommand } from '../hooks/useSlashCommand';

export interface SlashCommandMenuProps {
  commands: SlashCommand[];
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
}

export function SlashCommandMenu({ commands, selectedIndex, onSelect }: SlashCommandMenuProps) {
  if (commands.length === 0) {
    return (
      <div className="absolute bottom-full left-0 mb-2 w-72 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-panel)] p-3 text-xs text-[var(--text-muted)] shadow-xl">
        未找到匹配的技能
      </div>
    );
  }

  return (
    <div className="absolute bottom-full left-0 mb-2 w-72 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-panel)] shadow-xl overflow-hidden">
      {commands.map((cmd, index) => (
        <button
          key={cmd.id}
          type="button"
          className={cn(
            'w-full flex items-start gap-2 px-3 py-2 text-left text-xs transition-colors',
            index === selectedIndex ? 'bg-[var(--bg-hover)]' : 'hover:bg-[var(--bg-hover)]',
          )}
          onClick={() => onSelect(cmd)}
        >
          <span className="mt-0.5 text-[var(--accent)]">{cmd.name}</span>
          <span className="text-[var(--text-muted)] flex-1">{cmd.description}</span>
          {index === selectedIndex && <Check className="h-3.5 w-3.5 text-[var(--accent)]" />}
        </button>
      ))}
    </div>
  );
}

export default SlashCommandMenu;
