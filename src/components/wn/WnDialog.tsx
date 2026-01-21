import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export type WnDialogProps = {
  isOpen: boolean;
  onOpenChange: (next: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  isDismissable?: boolean;
  className?: string;
};

function findFocusable(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter((el) => !el.hasAttribute('data-wn-dialog-sentinel'));
}

/**
 * Why: Provide a minimal, token-styled dialog primitive without leaking layout/modal
 * decisions into feature components; callers own open state via `isOpen/onOpenChange`.
 */
export function WnDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  footer,
  isDismissable = true,
  className,
}: WnDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const content = contentRef.current;
    if (!content) return;

    const focusFirst = () => {
      const focusables = findFocusable(content);
      if (focusables.length > 0) {
        focusables[0].focus();
        return;
      }
      content.focus();
    };

    const id = window.setTimeout(focusFirst, 0);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    const el = restoreFocusRef.current;
    restoreFocusRef.current = null;
    el?.focus?.();
  }, [isOpen]);

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (!isOpen) return;

    if (e.key === 'Escape' && isDismissable) {
      e.preventDefault();
      onOpenChange(false);
      return;
    }

    if (e.key !== 'Tab') return;
    const content = contentRef.current;
    if (!content) return;
    const focusables = findFocusable(content);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (e.shiftKey) {
      if (active === first || active === content) {
        e.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const ariaLabelledBy = title ? titleId : undefined;
  const ariaDescribedBy = description ? descriptionId : undefined;

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 wn-backdrop"
      onMouseDown={(e) => {
        if (!isDismissable) return;
        if (e.target !== e.currentTarget) return;
        onOpenChange(false);
      }}
    >
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={['wn-elevated w-full max-w-lg p-4 relative', className].filter(Boolean).join(' ')}
      >
        {isDismissable && (
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="wn-icon-btn absolute right-2 top-2"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {(title || description) && (
          <div className="pr-8">
            {title && (
              <div id={titleId} className="text-[13px] text-[var(--text-primary)] font-medium mb-1">
                {title}
              </div>
            )}
            {description && (
              <div id={descriptionId} className="text-[12px] text-[var(--text-tertiary)]">
                {description}
              </div>
            )}
          </div>
        )}

        <div className={title || description ? 'mt-3' : ''}>{children}</div>

        {footer && <div className="mt-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

