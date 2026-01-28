/**
 * Keyboard Shortcuts Manager
 * Why: Centralize keyboard shortcut definitions and handling for consistent behavior across the app.
 * 
 * Shortcuts implemented:
 * - Ctrl/Cmd+B: Toggle bold
 * - Ctrl/Cmd+I: Toggle italic
 * - Ctrl/Cmd+E: Toggle code (inline)
 * - Ctrl/Cmd+/: Toggle AI polish (when text selected)
 * - Ctrl/Cmd+Shift+P: Open command palette
 * - Ctrl/Cmd+S: Save (handled in WriteModeEditorPanel)
 * - Ctrl/Cmd+K: Command palette (handled in AppShell)
 * - Ctrl/Cmd+\\: Toggle focus mode (handled in AppShell)
 */

import type { Editor } from '@tiptap/core';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';
import { useAIStore } from '@/stores/aiStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useEditorRuntimeStore } from '@/stores/editorRuntimeStore';

export type ShortcutId =
  | 'toggle-bold'
  | 'toggle-italic'
  | 'toggle-code'
  | 'ai-polish'
  | 'command-palette';

export interface ShortcutDef {
  id: ShortcutId;
  label: string;
  /** Key without modifier (lowercase) */
  key: string;
  /** Requires Ctrl/Cmd */
  ctrl: boolean;
  /** Requires Shift */
  shift: boolean;
  /** Requires Alt/Option */
  alt: boolean;
  /** Handler function */
  handler: (editor: Editor | null) => boolean | void;
}

/**
 * Check if an event matches a shortcut definition
 */
function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutDef): boolean {
  const isMac = navigator.platform.toLowerCase().includes('mac');
  const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

  return (
    event.key.toLowerCase() === shortcut.key &&
    ctrlOrCmd === shortcut.ctrl &&
    event.shiftKey === shortcut.shift &&
    event.altKey === shortcut.alt
  );
}

/**
 * Get the active TipTap editor from runtime store
 */
function getActiveEditor(): Editor | null {
  return useEditorRuntimeStore.getState().activeEditor;
}

/**
 * Shortcut definitions
 */
export const SHORTCUTS: ShortcutDef[] = [
  {
    id: 'toggle-bold',
    label: '加粗',
    key: 'b',
    ctrl: true,
    shift: false,
    alt: false,
    handler: (editor) => {
      if (!editor) return false;
      editor.chain().focus().toggleBold().run();
      return true;
    },
  },
  {
    id: 'toggle-italic',
    label: '斜体',
    key: 'i',
    ctrl: true,
    shift: false,
    alt: false,
    handler: (editor) => {
      if (!editor) return false;
      editor.chain().focus().toggleItalic().run();
      return true;
    },
  },
  {
    id: 'toggle-code',
    label: '行内代码',
    key: 'e',
    ctrl: true,
    shift: false,
    alt: false,
    handler: (editor) => {
      if (!editor) return false;
      editor.chain().focus().toggleCode().run();
      return true;
    },
  },
  {
    id: 'ai-polish',
    label: 'AI 润色',
    key: '/',
    ctrl: true,
    shift: false,
    alt: false,
    handler: (editor) => {
      if (!editor) return false;
      
      // Check if there's a selection
      const selection = useEditorRuntimeStore.getState().selection;
      if (!selection || !selection.text.trim()) {
        // No selection, do nothing or show a hint
        return false;
      }

      // Open AI panel and set polish skill if available
      const { setRightPanelCollapsed } = useLayoutStore.getState();
      const { skills, setSelectedSkillId } = useAIStore.getState();
      
      // Find a polish/refine skill
      const polishSkill = skills.find((s) => 
        s.enabled && s.valid && 
        (s.id.includes('polish') || s.id.includes('refine') || s.name.includes('润色'))
      );

      if (polishSkill) {
        setSelectedSkillId(polishSkill.id);
      }
      
      setRightPanelCollapsed(false);
      return true;
    },
  },
  {
    id: 'command-palette',
    label: '命令面板',
    key: 'p',
    ctrl: true,
    shift: true,
    alt: false,
    handler: () => {
      useCommandPaletteStore.getState().togglePalette();
      return true;
    },
  },
];

/**
 * Create a keyboard event handler for shortcuts.
 * Returns a cleanup function.
 */
export function createShortcutsHandler(): () => void {
  const handler = (event: KeyboardEvent) => {
    // Skip if in input/textarea that's not the editor
    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    const isEditor = target.closest('[data-testid="tiptap-editor"]') !== null;
    
    // Allow shortcuts in editor, but skip for other inputs (except command palette)
    if (isInput && !isEditor) {
      // Only allow command palette shortcut in inputs
      const cmdPaletteShortcut = SHORTCUTS.find((s) => s.id === 'command-palette');
      if (cmdPaletteShortcut && matchesShortcut(event, cmdPaletteShortcut)) {
        event.preventDefault();
        cmdPaletteShortcut.handler(null);
        return;
      }
      return;
    }

    const editor = getActiveEditor();

    for (const shortcut of SHORTCUTS) {
      if (matchesShortcut(event, shortcut)) {
        event.preventDefault();
        shortcut.handler(editor);
        return;
      }
    }
  };

  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}

/**
 * Format shortcut for display (e.g., "Ctrl+B" or "⌘B")
 */
export function formatShortcut(shortcut: ShortcutDef): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
  const parts: string[] = [];

  if (shortcut.ctrl) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  parts.push(shortcut.key.toUpperCase());

  return isMac ? parts.join('') : parts.join('+');
}
