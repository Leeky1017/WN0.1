/**
 * CommandPalette (cmdk)
 * Why: Provide a single keyboard-first entry point for files/skills/commands in Write Mode.
 */

import { useCallback, useEffect, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { ArrowRight, Clock, Command as CommandIcon, FileText, Sparkles, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAIStore } from '@/stores/aiStore';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useWriteModeStore } from '@/features/write-mode/writeModeStore';
import type { SkillListItem } from '@/types/ipc-generated';

import { useCommands } from './useCommands';

type CommandId = 'toggle-focus' | 'toggle-ai-panel' | 'toggle-sidebar' | 'open-settings' | 'clear-recent';

type CommandDef = {
  id: CommandId;
  label: string;
  keywords?: string;
  run: () => void;
};

function encodeTestId(raw: string): string {
  const normalized = raw.trim();
  if (!normalized) return 'empty';
  return encodeURIComponent(normalized);
}

function getSkillLabel(skill: SkillListItem): string {
  return skill.name || skill.id;
}

function getItemClassName(): string {
  return cn(
    'flex items-center gap-2 px-2 py-2 rounded-md text-[12px]',
    'text-[var(--fg-default)]',
    'cursor-pointer select-none',
    'data-[selected=true]:bg-[var(--bg-hover)] data-[selected=true]:text-[var(--fg-default)]',
    'data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed',
  );
}

export function CommandPalette() {
  const open = useCommandPaletteStore((s) => s.open);
  const query = useCommandPaletteStore((s) => s.query);
  const openPalette = useCommandPaletteStore((s) => s.openPalette);
  const closePalette = useCommandPaletteStore((s) => s.closePalette);
  const setQuery = useCommandPaletteStore((s) => s.setQuery);
  const addRecent = useCommandPaletteStore((s) => s.addRecent);
  const clearRecent = useCommandPaletteStore((s) => s.clearRecent);

  const { recentItems, files, filesLoading, filesError, reloadFiles, skills } = useCommands(open);

  const openFile = useWriteModeStore((s) => s.openFile);

  const focusMode = useLayoutStore((s) => s.focusMode);
  const toggleFocusMode = useLayoutStore((s) => s.toggleFocusMode);
  const toggleRightPanel = useLayoutStore((s) => s.toggleRightPanel);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const setRightPanelCollapsed = useLayoutStore((s) => s.setRightPanelCollapsed);
  const setActiveSidebarView = useLayoutStore((s) => s.setActiveSidebarView);
  const setSidebarCollapsed = useLayoutStore((s) => s.setSidebarCollapsed);

  const setSelectedSkillId = useAIStore((s) => s.setSelectedSkillId);

  const focusEditor = useCallback(() => {
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>('[data-testid="tiptap-editor"]');
      el?.focus();
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLInputElement>('[data-testid="cmdk-input"]');
      el?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const commands = useMemo<CommandDef[]>(
    () => [
      {
        id: 'toggle-focus',
        label: focusMode ? '退出 Focus/Zen' : '进入 Focus/Zen',
        keywords: 'focus zen 专注',
        run: () => toggleFocusMode(),
      },
      {
        id: 'toggle-ai-panel',
        label: '切换 AI 面板',
        keywords: 'ai panel 智能',
        run: () => toggleRightPanel(),
      },
      {
        id: 'toggle-sidebar',
        label: '切换侧边栏',
        keywords: 'sidebar explorer 文件',
        run: () => toggleSidebar(),
      },
      {
        id: 'open-settings',
        label: '打开设置（侧边栏）',
        keywords: 'settings 配置',
        run: () => {
          setActiveSidebarView('settings');
          setSidebarCollapsed(false);
        },
      },
      {
        id: 'clear-recent',
        label: '清空最近使用',
        keywords: 'recent 清空',
        run: () => clearRecent(),
      },
    ],
    [clearRecent, focusMode, setActiveSidebarView, setSidebarCollapsed, toggleFocusMode, toggleRightPanel, toggleSidebar],
  );

  const recordAndClose = useCallback(
    (item: { type: 'file' | 'skill' | 'command'; id: string; label: string }) => {
      addRecent(item);
      closePalette();
      focusEditor();
    },
    [addRecent, closePalette, focusEditor],
  );

  const handleClose = useCallback(() => {
    closePalette();
    focusEditor();
  }, [closePalette, focusEditor]);

  const handleSelectFile = useCallback(
    async (path: string, label: string) => {
      try {
        await openFile(path);
        recordAndClose({ type: 'file', id: path, label });
      } catch {
        // Why: Open errors are surfaced via the unified save indicator; keep cmdk interaction minimal.
      }
    },
    [openFile, recordAndClose],
  );

  const handleSelectSkill = useCallback(
    (skill: SkillListItem) => {
      setSelectedSkillId(skill.id);
      setRightPanelCollapsed(false);
      recordAndClose({ type: 'skill', id: skill.id, label: getSkillLabel(skill) });
    },
    [recordAndClose, setRightPanelCollapsed, setSelectedSkillId],
  );

  const handleSelectCommand = useCallback(
    (cmd: CommandDef) => {
      cmd.run();
      recordAndClose({ type: 'command', id: cmd.id, label: cmd.label });
    },
    [recordAndClose],
  );

  const handleSelectRecent = useCallback(
    async (item: { type: 'file' | 'command' | 'skill'; id: string; label: string }) => {
      if (item.type === 'file') {
        await handleSelectFile(item.id, item.label);
        return;
      }

      if (item.type === 'skill') {
        const skill = skills.find((s) => s.id === item.id);
        if (skill) {
          handleSelectSkill(skill);
        } else {
          // Best-effort fallback if the skills list is not yet ready.
          setSelectedSkillId(item.id);
          setRightPanelCollapsed(false);
          recordAndClose({ type: 'skill', id: item.id, label: item.label });
        }
        return;
      }

      const cmd = commands.find((c) => c.id === item.id);
      if (cmd) handleSelectCommand(cmd);
    },
    [
      commands,
      handleSelectCommand,
      handleSelectFile,
      handleSelectSkill,
      recordAndClose,
      setRightPanelCollapsed,
      setSelectedSkillId,
      skills,
    ],
  );

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next) openPalette();
        else {
          closePalette();
          focusEditor();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed left-1/2 top-[18%] z-[101] w-[min(640px,calc(100vw-24px))] -translate-x-1/2"
          onEscapeKeyDown={(e) => {
            // Why: Esc priority is handled by the global Write Mode handler (AI cancel -> Focus exit -> overlays).
            e.preventDefault();
          }}
        >
          <div
            data-testid="cmdk"
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-2xl overflow-hidden"
          >
            <Command className="w-full" loop>
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)]">
                <CommandIcon size={16} className="text-[var(--fg-subtle)]" />
                <Command.Input
                  data-testid="cmdk-input"
                  value={query}
                  onValueChange={setQuery}
                  placeholder="搜索文件、技能或命令…"
                  className={cn(
                    'h-9 w-full bg-transparent outline-none text-[13px] text-[var(--fg-default)] placeholder:text-[var(--fg-subtle)]',
                  )}
                />
                <button
                  type="button"
                  className="p-1.5 rounded-md text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-hover)] transition-colors"
                  onClick={handleClose}
                  aria-label="Close"
                  title="关闭"
                >
                  <X size={14} />
                </button>
              </div>

              <Command.List className="max-h-[360px] overflow-y-auto p-2">
                <Command.Empty className="px-2 py-6 text-center text-[12px] text-[var(--fg-muted)]">
                  无结果
                </Command.Empty>

                {recentItems.length > 0 && (
                  <Command.Group heading="最近使用" className="text-[11px] text-[var(--fg-subtle)]">
                    {recentItems.map((item) => (
                      <Command.Item
                        key={`recent-${item.type}-${item.id}`}
                        value={item.label}
                        onSelect={() => void handleSelectRecent(item)}
                        data-testid={`cmdk-item-${item.type}-${encodeTestId(item.id)}`}
                        aria-label={item.label}
                        className={getItemClassName()}
                      >
                        <Clock size={14} className="text-[var(--fg-subtle)]" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        <ArrowRight size={14} className="text-[var(--fg-subtle)] opacity-60" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                <Command.Separator className="h-px bg-[var(--border-subtle)] my-2" />

                <Command.Group heading="文件" className="text-[11px] text-[var(--fg-subtle)]">
                  {filesLoading && (
                    <Command.Item value="loading" disabled className={getItemClassName()}>
                      <span className="text-[var(--fg-muted)]">加载中…</span>
                    </Command.Item>
                  )}

                  {filesError && (
                    <Command.Item value="files-error" disabled className={getItemClassName()}>
                      <span className="text-[var(--error)]">加载失败：{filesError}</span>
                    </Command.Item>
                  )}

                  {filesError && (
                    <Command.Item
                      value="files-retry"
                      onSelect={() => void reloadFiles()}
                      className={getItemClassName()}
                      data-testid="cmdk-files-retry"
                    >
                      <span className="text-[var(--fg-default)]">重试加载文件</span>
                      <ArrowRight size={14} className="text-[var(--fg-subtle)] opacity-60" />
                    </Command.Item>
                  )}

                  {!filesLoading &&
                    !filesError &&
                    files.map((file) => (
                      <Command.Item
                        key={file.path}
                        value={`${file.name} ${file.path}`}
                        onSelect={() => void handleSelectFile(file.path, file.name)}
                        data-testid={`cmdk-item-file-${encodeTestId(file.path)}`}
                        aria-label={file.name}
                        className={getItemClassName()}
                      >
                        <FileText size={14} className="text-[var(--fg-subtle)]" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{file.name}</div>
                          <div className="truncate text-[10px] text-[var(--fg-subtle)]">{file.path}</div>
                        </div>
                        <ArrowRight size={14} className="text-[var(--fg-subtle)] opacity-60" />
                      </Command.Item>
                    ))}
                </Command.Group>

                <Command.Separator className="h-px bg-[var(--border-subtle)] my-2" />

                <Command.Group heading="技能" className="text-[11px] text-[var(--fg-subtle)]">
                  {skills.length === 0 && (
                    <Command.Item value="skills-empty" disabled className={getItemClassName()}>
                      <span className="text-[var(--fg-muted)]">暂无可用技能</span>
                    </Command.Item>
                  )}

                  {skills.map((skill) => (
                    <Command.Item
                      key={skill.id}
                      value={`${getSkillLabel(skill)} ${skill.id}`}
                      onSelect={() => handleSelectSkill(skill)}
                      data-testid={`cmdk-item-skill-${encodeTestId(skill.id)}`}
                      aria-label={getSkillLabel(skill)}
                      className={getItemClassName()}
                    >
                      <Sparkles size={14} className="text-[var(--fg-subtle)]" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{getSkillLabel(skill)}</div>
                        <div className="truncate text-[10px] text-[var(--fg-subtle)]">{skill.id}</div>
                      </div>
                      <ArrowRight size={14} className="text-[var(--fg-subtle)] opacity-60" />
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Separator className="h-px bg-[var(--border-subtle)] my-2" />

                <Command.Group heading="命令" className="text-[11px] text-[var(--fg-subtle)]">
                  {commands.map((cmd) => (
                    <Command.Item
                      key={cmd.id}
                      value={`${cmd.label} ${cmd.keywords ?? ''}`}
                      onSelect={() => handleSelectCommand(cmd)}
                      data-testid={`cmdk-item-command-${encodeTestId(cmd.id)}`}
                      aria-label={cmd.label}
                      className={getItemClassName()}
                    >
                      <span className="min-w-0 flex-1 truncate">{cmd.label}</span>
                      <ArrowRight size={14} className="text-[var(--fg-subtle)] opacity-60" />
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default CommandPalette;

