/**
 * SlashCommandMenu - Popup menu for slash commands in AI input
 * Why: Provide quick access to common AI operations via "/" prefix commands.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Command, FileText, Lightbulb, Pencil, RefreshCw, Sparkles, Wand2 } from 'lucide-react';

interface SlashCommand {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  /** Command to insert when selected. */
  command: string;
}

/** Default slash commands available in AI Panel. */
const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'continue',
    name: '继续写作',
    description: '让 AI 继续当前内容',
    icon: <Pencil size={14} />,
    command: '/continue',
  },
  {
    id: 'polish',
    name: '润色',
    description: '改进文字表达和流畅度',
    icon: <Sparkles size={14} />,
    command: '/polish',
  },
  {
    id: 'rewrite',
    name: '重写',
    description: '用不同方式重新表达',
    icon: <RefreshCw size={14} />,
    command: '/rewrite',
  },
  {
    id: 'expand',
    name: '扩写',
    description: '增加更多细节和内容',
    icon: <FileText size={14} />,
    command: '/expand',
  },
  {
    id: 'summarize',
    name: '总结',
    description: '提取要点生成摘要',
    icon: <Command size={14} />,
    command: '/summarize',
  },
  {
    id: 'brainstorm',
    name: '头脑风暴',
    description: '生成创意点子',
    icon: <Lightbulb size={14} />,
    command: '/brainstorm',
  },
  {
    id: 'custom',
    name: '自定义指令',
    description: '输入你的具体需求',
    icon: <Wand2 size={14} />,
    command: '/',
  },
];

interface SlashCommandMenuProps {
  /** Whether the menu is visible. */
  open: boolean;
  /** Current filter text (after the "/"). */
  filter: string;
  /** Callback when a command is selected. */
  onSelect: (command: string) => void;
  /** Callback to close the menu. */
  onClose: () => void;
  /** Position anchor element. */
  anchorRect?: DOMRect | null;
}

export function SlashCommandMenu({
  open,
  filter,
  onSelect,
  onClose,
  anchorRect,
}: SlashCommandMenuProps) {
  // Filter commands based on input
  const filteredCommands = useMemo(() => {
    if (!filter) return SLASH_COMMANDS;
    const lowerFilter = filter.toLowerCase();
    return SLASH_COMMANDS.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(lowerFilter) ||
        cmd.command.toLowerCase().includes(lowerFilter) ||
        cmd.description.toLowerCase().includes(lowerFilter)
    );
  }, [filter]);

  // Selected index state - reset handled via derived clamping
  const [rawSelectedIndex, setSelectedIndex] = useState(0);

  // Clamp selected index to valid range (auto-resets when filter narrows results)
  const selectedIndex = Math.min(rawSelectedIndex, Math.max(0, filteredCommands.length - 1));

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % filteredCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex].command);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [open, filteredCommands, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open || filteredCommands.length === 0) return null;

  // Calculate position
  const style: React.CSSProperties = anchorRect
    ? {
        position: 'fixed',
        bottom: window.innerHeight - anchorRect.top + 8,
        left: anchorRect.left,
        maxWidth: 320,
      }
    : {
        position: 'absolute',
        bottom: '100%',
        left: 0,
        marginBottom: 8,
        maxWidth: 320,
      };

  return (
    <div
      className="z-50 w-72 rounded-lg overflow-hidden bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] shadow-[var(--shadow-lg)]"
      style={style}
      data-testid="slash-command-menu"
    >
      <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
          斜杠命令
        </span>
      </div>
      <div className="max-h-64 overflow-y-auto custom-scrollbar">
        {filteredCommands.map((cmd, index) => (
          <button
            key={cmd.id}
            className={`w-full px-3 py-2 flex items-start gap-3 transition-colors ${
              index === selectedIndex
                ? 'bg-[var(--bg-hover)]'
                : 'hover:bg-[var(--bg-hover)]'
            }`}
            onClick={() => onSelect(cmd.command)}
            onMouseEnter={() => setSelectedIndex(index)}
            data-testid={`slash-cmd-${cmd.id}`}
          >
            <span className="shrink-0 mt-0.5 text-[var(--accent-default)]">{cmd.icon}</span>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-[var(--fg-default)]">
                  {cmd.name}
                </span>
                <span className="text-[10px] text-[var(--fg-subtle)] font-mono">
                  {cmd.command}
                </span>
              </div>
              <p className="text-[11px] text-[var(--fg-muted)] truncate">{cmd.description}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="px-3 py-1.5 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <span className="text-[10px] text-[var(--fg-subtle)]">
          ↑↓ 导航 · Enter 选择 · Esc 关闭
        </span>
      </div>
    </div>
  );
}

export default SlashCommandMenu;
