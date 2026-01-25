/**
 * AIInput
 * Why: Provide a multi-line prompt entry with slash-command support and send controls.
 */

import { useEffect, useMemo, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SlashCommandMenu } from './SlashCommandMenu';
import { resolveSlashCommandInput, useSlashCommand, type SlashCommand } from '../hooks/useSlashCommand';

export interface AIInputProps {
  value: string;
  disabled?: boolean;
  placeholder?: string;
  commands: SlashCommand[];
  onChange: (value: string) => void;
  onSend: (value: string, options?: { skillId?: string }) => Promise<void>;
  onSelectSkill: (skillId: string) => void;
}

export function AIInput({
  value,
  disabled = false,
  placeholder = '输入消息，支持 /polish /expand 等…',
  commands,
  onChange,
  onSend,
  onSelectSkill,
}: AIInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { isOpen, commands: filteredCommands, selectedIndex, setSelectedIndex } = useSlashCommand(value, commands);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const nextHeight = Math.min(textarea.scrollHeight, 160);
    textarea.style.height = `${nextHeight}px`;
  }, [value]);

  const canSend = useMemo(() => !disabled, [disabled]);

  const handleCommandSelect = (command: SlashCommand) => {
    onSelectSkill(command.skillId);
    onChange(`${command.name} `);
  };

  const handleSend = async () => {
    if (!canSend) return;
    const { command, instruction } = resolveSlashCommandInput(value, commands);
    if (command) {
      onSelectSkill(command.skillId);
      await onSend(instruction, { skillId: command.skillId });
    } else {
      await onSend(value);
    }
    onChange('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!canSend) return;

    if (isOpen) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((selectedIndex + 1) % Math.max(filteredCommands.length, 1));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const nextIndex = selectedIndex - 1 < 0 ? filteredCommands.length - 1 : selectedIndex - 1;
        setSelectedIndex(nextIndex);
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const command = filteredCommands[selectedIndex];
        if (command) {
          handleCommandSelect(command);
        }
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="relative">
      {isOpen && (
        <SlashCommandMenu
          commands={filteredCommands}
          selectedIndex={selectedIndex}
          onSelect={handleCommandSelect}
        />
      )}

      <div
        className={cn(
          'flex items-end gap-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2',
          disabled && 'opacity-60',
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className={cn(
            'flex-1 resize-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none',
          )}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          type="button"
          size="icon"
          variant="default"
          disabled={!canSend}
          onClick={() => void handleSend()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default AIInput;
