/**
 * keymap
 * Why: Keep a single source of truth for shortcut combos + human-readable labels (used by cmdk + settings).
 */

export type HotkeyId = 'save' | 'command-palette' | 'command-palette-force' | 'settings' | 'inline-ai';

export type HotkeyDefinition = {
  id: HotkeyId;
  combo: string;
  description: string;
  macKey: string;
  winKey: string;
};

export const HOTKEYS: readonly HotkeyDefinition[] = [
  {
    id: 'save',
    combo: 'mod+s',
    description: '保存文件',
    macKey: '⌘S',
    winKey: 'Ctrl+S',
  },
  {
    id: 'command-palette',
    combo: 'mod+k',
    description: '打开命令面板（编辑器内为内联 AI）',
    macKey: '⌘K',
    winKey: 'Ctrl+K',
  },
  {
    id: 'command-palette-force',
    combo: 'mod+shift+k',
    description: '打开命令面板（强制）',
    macKey: '⌘⇧K',
    winKey: 'Ctrl+Shift+K',
  },
  {
    id: 'settings',
    combo: 'mod+,',
    description: '打开设置',
    macKey: '⌘,',
    winKey: 'Ctrl+,',
  },
  {
    id: 'inline-ai',
    combo: 'mod+k',
    description: '内联 AI（仅编辑器内）',
    macKey: '⌘K',
    winKey: 'Ctrl+K',
  },
];

export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform = navigator.platform ?? '';
  return platform.toUpperCase().includes('MAC');
}

export function getHotkeyDisplay(def: HotkeyDefinition): string {
  return isMac() ? def.macKey : def.winKey;
}

