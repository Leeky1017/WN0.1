/**
 * useGlobalHotkeys
 * Why: Register app-wide shortcuts without relying on key-name heuristics from third-party libraries.
 *
 * Failure semantics:
 * - Only handles the keys required by Sprint Frontend V2 (cmdk/settings).
 * - Never throws; hotkeys are best-effort and must not crash the renderer.
 */
import { useEffect } from 'react';

export interface GlobalHotkeyActions {
  openCommandPalette: () => void;
  openSettings: () => void;
}

function isEditorTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('.wn-tiptap-editor'));
}

/**
 * Global shortcut bindings:
 * - Cmd/Ctrl+K: command palette (unless inside the editor; editor owns inline AI on Cmd/Ctrl+K)
 * - Cmd/Ctrl+Shift+K: command palette (force)
 * - Cmd/Ctrl+,: settings
 */
export function useGlobalHotkeys(actions: GlobalHotkeyActions): void {
  const { openCommandPalette, openSettings } = actions;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod) return;

      const key = event.key;
      const lower = key.toLowerCase();

      // Cmd/Ctrl+Shift+K: force open command palette (even inside editor)
      if (lower === 'k' && event.shiftKey) {
        event.preventDefault();
        openCommandPalette();
        return;
      }

      // Cmd/Ctrl+K: command palette unless editor wants inline AI.
      if (lower === 'k') {
        if (isEditorTarget(event.target)) return;
        event.preventDefault();
        openCommandPalette();
        return;
      }

      // Cmd/Ctrl+,
      if (key === ',' || lower === ',') {
        event.preventDefault();
        openSettings();
      }
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [openCommandPalette, openSettings]);
}

export default useGlobalHotkeys;
