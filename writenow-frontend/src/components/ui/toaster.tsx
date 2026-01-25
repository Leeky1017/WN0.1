/**
 * Toaster
 * Why: Centralize sonner toast styling so notifications match Design Tokens (Sprint Frontend V2 P5-002).
 */

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: 'bg-[var(--bg-panel)] border border-[var(--border-default)] text-[var(--text-primary)]',
          title: 'text-sm font-medium',
          description: 'text-xs text-[var(--text-muted)]',
          actionButton: 'bg-[var(--accent)] text-white',
          cancelButton: 'bg-[var(--bg-input)] text-[var(--text-primary)]',
          success: 'border-l-4 border-l-[var(--color-success)]',
          error: 'border-l-4 border-l-[var(--color-error)]',
          warning: 'border-l-4 border-l-[var(--color-warning)]',
          info: 'border-l-4 border-l-[var(--accent)]',
        },
      }}
      closeButton
      richColors
    />
  );
}

export default Toaster;

