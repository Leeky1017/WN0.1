/**
 * Toast notification container using Sonner.
 *
 * Why: Centralized toast configuration with WriteNow design tokens.
 * Sonner provides a performant, accessible toast implementation.
 */

import { Toaster as SonnerToaster } from 'sonner';

/**
 * WriteNow Toast container.
 *
 * Place this component once at the app root (e.g., in AppShell or App.tsx).
 *
 * Usage:
 * ```tsx
 * import { toast } from 'sonner';
 *
 * toast.success('Saved successfully');
 * toast.error('Connection failed');
 * toast.info('Reconnecting...');
 * ```
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      offset="16px"
      gap={8}
      visibleToasts={3}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: 'wn-toast',
          title: 'wn-toast-title',
          description: 'wn-toast-description',
          actionButton: 'wn-toast-action',
          cancelButton: 'wn-toast-cancel',
          closeButton: 'wn-toast-close',
          success: 'wn-toast--success',
          error: 'wn-toast--error',
          warning: 'wn-toast--warning',
          info: 'wn-toast--info',
        },
      }}
    />
  );
}

// Re-export toast for convenience (consumers can also import directly from 'sonner')
// eslint-disable-next-line react-refresh/only-export-components
export { toast } from 'sonner';
