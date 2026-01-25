/**
 * toast
 * Why: Wrap sonner with a stable app-level API so call sites stay consistent and styling is centralized in `<Toaster />`.
 */

import { toast as sonnerToast, type ExternalToast } from 'sonner';

export type ToastOptions = Pick<ExternalToast, 'description' | 'duration' | 'action' | 'cancel' | 'id'>;

export const toast = {
  success: (message: string, options?: ToastOptions) => sonnerToast.success(message, options),
  error: (message: string, options?: ToastOptions) => sonnerToast.error(message, options),
  info: (message: string, options?: ToastOptions) => sonnerToast.info(message, options),
  warning: (message: string, options?: ToastOptions) => sonnerToast.warning(message, options),
  message: (message: string, options?: ToastOptions) => sonnerToast(message, options),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    options: {
      loading: string;
      success: string;
      error: string;
      description?: string;
    },
  ) =>
    sonnerToast.promise(promise, {
      loading: options.loading,
      success: options.success,
      error: options.error,
      ...(options.description ? { description: options.description } : {}),
    }),
};

export default toast;

