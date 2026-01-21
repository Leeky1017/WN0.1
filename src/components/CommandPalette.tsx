import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Command } from 'cmdk';
import { Search } from 'lucide-react';

import type { CommandDefinition } from '../lib/commands/registry';

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  emptyText: string;
  commands: readonly CommandDefinition[];
};

type GroupedCommands = Array<{ group: string; items: CommandDefinition[] }>;

function groupCommands(commands: readonly CommandDefinition[]): GroupedCommands {
  const groupMap = new Map<string, CommandDefinition[]>();
  for (const command of commands) {
    const key = command.group || 'Commands';
    const list = groupMap.get(key) ?? [];
    list.push(command);
    groupMap.set(key, list);
  }

  const groups: GroupedCommands = Array.from(groupMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([group, items]) => ({
      group,
      items: [...items].sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id)),
    }));

  return groups;
}

export function CommandPalette({ open, onOpenChange, title, description, emptyText, commands }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setSearch('');
      return;
    }

    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const grouped = useMemo(() => groupCommands(commands), [commands]);

  const runCommand = async (cmd: CommandDefinition) => {
    try {
      await cmd.run();
    } finally {
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50"
      onMouseDown={() => onOpenChange(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onOpenChange(false);
      }}
    >
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 flex items-start justify-center pt-24">
        <div
          className="w-full max-w-lg mx-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] shadow-xl overflow-hidden"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Command className="w-full">
            <div className="flex h-12 items-center gap-2 border-b border-[var(--border-subtle)] px-3">
              <Search className="w-4 h-4 text-[var(--text-tertiary)]" />
              <Command.Input
                ref={inputRef}
                placeholder={description}
                value={search}
                onValueChange={setSearch}
                className="flex-1 h-10 bg-transparent text-[13px] text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
            </div>

            <Command.List className="max-h-[360px] overflow-y-auto p-1">
              <Command.Empty className="py-6 text-center text-[13px] text-[var(--text-tertiary)]">
                {emptyText}
              </Command.Empty>

              {grouped.map((group, idx) => (
                <React.Fragment key={group.group}>
                  {idx > 0 && <Command.Separator className="my-1 h-px bg-[var(--border-subtle)]" />}
                  <Command.Group heading={group.group} className="p-1">
                    <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
                      {group.group}
                    </div>
                    {group.items.map((cmd) => (
                      <Command.Item
                        key={cmd.id}
                        value={[cmd.title, ...cmd.keywords].join(' ')}
                        onSelect={() => void runCommand(cmd)}
                        className="data-[selected=true]:bg-[var(--bg-hover)] data-[selected=true]:text-[var(--text-primary)] flex items-center gap-3 rounded-md px-2 py-2 text-[13px] text-[var(--text-secondary)] cursor-default select-none"
                      >
                        <span className="truncate">{cmd.title}</span>
                        {cmd.shortcut && (
                          <span className="ml-auto text-[11px] tracking-widest text-[var(--text-tertiary)]">
                            {cmd.shortcut}
                          </span>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                </React.Fragment>
              ))}
            </Command.List>
          </Command>
        </div>
      </div>
    </div>,
    document.body,
  );
}
