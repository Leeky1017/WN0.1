/**
 * TabContextMenu
 * Why: Provide tab management actions (close/close others/close all) required by Sprint Frontend V2 P2-002.
 *
 * Notes:
 * - FlexLayout owns the tab UI; we render a lightweight, app-styled context menu on top.
 * - The actual close behavior is executed by the caller via actions to keep this component pure.
 */

import { useCallback, useEffect } from 'react';
import { X, XCircle, XSquare } from 'lucide-react';

export type TabContextMenuAction = 'close' | 'close-others' | 'close-all';

export interface TabContextMenuProps {
  position: { x: number; y: number };
  onAction: (action: TabContextMenuAction) => void;
  onClose: () => void;
}

function MenuItem({
  icon,
  label,
  shortcut,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-3 w-full px-3 py-1.5 text-left text-sm rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
      onClick={onClick}
    >
      <span className="w-4 h-4 flex items-center justify-center">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut ? <span className="text-xs text-[var(--text-muted)]">{shortcut}</span> : null}
    </button>
  );
}

function Separator() {
  return <div className="h-px bg-[var(--border-subtle)] my-1" />;
}

export function TabContextMenu({ position, onAction, onClose }: TabContextMenuProps) {
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    },
    [onClose],
  );

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onClose();
    };
    window.addEventListener('keydown', handleEscape, { capture: true });
    return () => window.removeEventListener('keydown', handleEscape, { capture: true });
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={handleBackdropClick} onContextMenu={handleBackdropClick} />

      <div
        className="fixed z-[61] min-w-[200px] py-1 bg-[var(--bg-panel)] border border-[var(--border-default)] rounded-lg shadow-xl"
        style={{ left: position.x, top: position.y }}
      >
        <MenuItem icon={<X className="w-4 h-4" />} label="关闭" shortcut="Ctrl/Cmd+W" onClick={() => onAction('close')} />
        <Separator />
        <MenuItem icon={<XCircle className="w-4 h-4" />} label="关闭其他标签页" onClick={() => onAction('close-others')} />
        <MenuItem icon={<XSquare className="w-4 h-4" />} label="关闭所有标签页" onClick={() => onAction('close-all')} />
      </div>
    </>
  );
}

export default TabContextMenu;

