import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type MenuPosition = {
  x: number;
  y: number;
};

type ContextMenuContextValue = {
  open: boolean;
  position: MenuPosition | null;
  openAt: (pos: MenuPosition) => void;
  close: () => void;
};

const ContextMenuContext = React.createContext<ContextMenuContextValue | null>(null);

function useContextMenuContext(component: string): ContextMenuContextValue {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) throw new Error(`${component} must be used within <ContextMenu>`);
  return ctx;
}

function joinClassNames(...parts: Array<string | null | undefined | false>): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Why: Provide a minimal right-click context menu primitive without pulling new UI dependencies,
 * while keeping the trigger/content/item API stable for editor tab actions.
 */
export function ContextMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const openAt = useCallback((pos: MenuPosition) => {
    setPosition({
      x: Number.isFinite(pos.x) ? Math.max(0, Math.floor(pos.x)) : 0,
      y: Number.isFinite(pos.y) ? Math.max(0, Math.floor(pos.y)) : 0,
    });
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const value = useMemo<ContextMenuContextValue>(() => ({ open, position, openAt, close }), [close, open, openAt, position]);

  return <ContextMenuContext.Provider value={value}>{children}</ContextMenuContext.Provider>;
}

export function ContextMenuTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement<{ onContextMenu?: React.MouseEventHandler<HTMLElement> }>;
}) {
  const ctx = useContextMenuContext('ContextMenuTrigger');

  const nextProps = {
    onContextMenu: (event: React.MouseEvent<HTMLElement>) => {
      children.props.onContextMenu?.(event);
      if (event.defaultPrevented) return;
      event.preventDefault();
      ctx.openAt({ x: event.clientX, y: event.clientY });
    },
  };

  if (asChild) {
    return React.cloneElement(children, nextProps);
  }

  return <span {...nextProps}>{children}</span>;
}

export function ContextMenuContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = useContextMenuContext('ContextMenuContent');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ctx.open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      ctx.close();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ctx]);

  useEffect(() => {
    if (!ctx.open) return;
    const el = containerRef.current;
    if (!el) return;
    const id = window.setTimeout(() => el.focus(), 0);
    return () => window.clearTimeout(id);
  }, [ctx.open]);

  if (!ctx.open || !ctx.position) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        ctx.close();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        ctx.close();
      }}
    >
      <div
        ref={containerRef}
        role="menu"
        tabIndex={-1}
        className={joinClassNames(
          'absolute min-w-[180px] overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-2xl py-1',
          className,
        )}
        style={{ left: ctx.position.x, top: ctx.position.y }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ContextMenuItem({
  className,
  disabled,
  onSelect,
  children,
}: {
  className?: string;
  disabled?: boolean;
  onSelect?: () => void;
  children: React.ReactNode;
}) {
  const ctx = useContextMenuContext('ContextMenuItem');
  const isDisabled = Boolean(disabled);

  return (
    <button
      type="button"
      role="menuitem"
      disabled={isDisabled}
      className={joinClassNames(
        'relative flex w-full select-none items-center px-3 py-1.5 text-[13px] outline-none transition-colors text-left text-[var(--text-secondary)]',
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--bg-hover)] cursor-pointer',
        className,
      )}
      onClick={() => {
        if (isDisabled) return;
        onSelect?.();
        ctx.close();
      }}
    >
      {children}
    </button>
  );
}

export function ContextMenuSeparator({ className }: { className?: string }) {
  return <div className={joinClassNames('h-px bg-[var(--border-subtle)] my-1', className)} />;
}

