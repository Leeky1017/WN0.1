/**
 * CommandPalette
 * Why: Provide a global cmdk-powered palette for files/commands/skills.
 */

import { useMemo } from 'react';
import { Command } from 'cmdk';
import { FileText, Settings, Sparkles } from 'lucide-react';

import { useAIStore, useCommandPaletteStore } from '@/stores';
import { HOTKEYS, getHotkeyDisplay } from '@/lib/hotkeys';
import { cn } from '@/lib/utils';

import { useCommands } from './useCommands';

export interface CommandPaletteProps {
  openFile: (path: string) => void;
  focusAiPanel: () => void;
  openSettings: () => void;
}

export function CommandPalette({ openFile, focusAiPanel, openSettings }: CommandPaletteProps) {
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const closePalette = useCommandPaletteStore((s) => s.closePalette);
  const addRecent = useCommandPaletteStore((s) => s.addRecent);
  const query = useCommandPaletteStore((s) => s.query);
  const setQuery = useCommandPaletteStore((s) => s.setQuery);

  const setSelectedSkillId = useAIStore((s) => s.setSelectedSkillId);

  const { recentItems, files, filesLoading, filesError, skills } = useCommands(open);

  const settingsShortcut = useMemo(() => {
    const def = HOTKEYS.find((hotkey) => hotkey.id === 'settings');
    return def ? getHotkeyDisplay(def) : '';
  }, []);

  const commands = useMemo(
    () => [
      {
        id: 'settings.open',
        name: '打开设置',
        icon: <Settings className="w-4 h-4" />,
        shortcut: settingsShortcut,
        action: () => openSettings(),
      },
    ],
    [openSettings, settingsShortcut],
  );

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Command Palette">
      <div className="fixed inset-0 z-50" data-testid="command-palette">
        <div className="absolute inset-0 bg-black/40" onClick={() => closePalette()} />
        <div className="absolute left-1/2 top-[18%] w-[680px] -translate-x-1/2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-panel)] shadow-2xl" data-testid="command-palette-dialog">
          <Command.Input
            placeholder="搜索文件、命令或 Skill…"
            value={query}
            onValueChange={setQuery}
            className="w-full border-b border-[var(--border-subtle)] bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            data-testid="command-palette-input"
          />

          <Command.List className="max-h-[420px] overflow-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">
              没有找到结果
            </Command.Empty>

            {recentItems.length > 0 && (
              <Command.Group heading="最近使用" className="px-1 py-1">
                {recentItems.map((item) => (
                  <Command.Item
                    key={`${item.type}:${item.id}`}
                    value={`${item.type}:${item.label} ${item.id}`}
                    onSelect={() => {
                      if (item.type === 'file') {
                        openFile(item.id);
                      } else if (item.type === 'skill') {
                        setSelectedSkillId(item.id);
                        focusAiPanel();
                      } else if (item.type === 'command' && item.id === 'settings.open') {
                        openSettings();
                      }
                      closePalette();
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm',
                      'cursor-pointer data-[selected]:bg-[var(--bg-hover)]',
                    )}
                  >
                    <span className="text-[var(--text-muted)] text-xs w-14">{item.type}</span>
                    <span className="flex-1 truncate text-[var(--text-primary)]">{item.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading="命令" className="px-1 py-1">
              {commands.map((cmd) => (
                <Command.Item
                  key={cmd.id}
                  value={cmd.name}
                  onSelect={() => {
                    cmd.action();
                    addRecent({ type: 'command', id: cmd.id, label: cmd.name });
                    closePalette();
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm',
                    'cursor-pointer data-[selected]:bg-[var(--bg-hover)]',
                  )}
                >
                  <span className="text-[var(--text-muted)]">{cmd.icon}</span>
                  <span className="flex-1 text-[var(--text-primary)]">{cmd.name}</span>
                  <span className="text-xs text-[var(--text-muted)]">{cmd.shortcut}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="文件" className="px-1 py-1">
              {filesLoading && (
                <div className="px-3 py-2 text-xs text-[var(--text-muted)]">加载文件列表…</div>
              )}
              {filesError && <div className="px-3 py-2 text-xs text-[var(--color-error)]">{filesError}</div>}
              {files.map((file) => (
                <Command.Item
                  key={file.path}
                  value={`${file.name} ${file.path}`}
                  onSelect={() => {
                    openFile(file.path);
                    addRecent({ type: 'file', id: file.path, label: file.name });
                    closePalette();
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm',
                    'cursor-pointer data-[selected]:bg-[var(--bg-hover)]',
                  )}
                >
                  <FileText className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="flex-1 truncate text-[var(--text-primary)]">{file.name}</span>
                  <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[240px]">{file.path}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Skill" className="px-1 py-1">
              {skills.map((skill) => (
                <Command.Item
                  key={skill.id}
                  value={`${skill.name} ${skill.id}`}
                  onSelect={() => {
                    setSelectedSkillId(skill.id);
                    addRecent({ type: 'skill', id: skill.id, label: skill.name });
                    closePalette();
                    focusAiPanel();
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm',
                    'cursor-pointer data-[selected]:bg-[var(--bg-hover)]',
                  )}
                >
                  <Sparkles className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="flex-1 text-[var(--text-primary)]">{skill.name}</span>
                  <span className="text-xs text-[var(--text-muted)]">{`/${skill.id.split(':').pop() ?? skill.id}`}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </div>
      </div>
    </Command.Dialog>
  );
}

export default CommandPalette;
