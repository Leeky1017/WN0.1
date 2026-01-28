/**
 * Connection Status Toast Hook
 *
 * Why: Provides user-visible feedback for connection status changes,
 * including reconnection attempts and manual reconnect action.
 */

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { connectionManager, type ConnectionStatus, type ConnectionStatusDetails } from '@/lib/rpc/connection-manager';

interface UseConnectionToastOptions {
  /** Show toast on initial connection (default: false) */
  showOnInitialConnect?: boolean;
}

/**
 * Hook that displays toast notifications for connection status changes.
 *
 * Features:
 * - Shows error toast when connection fails
 * - Shows reconnecting toast with attempt count
 * - Provides manual reconnect action button
 * - Shows success toast on reconnection
 *
 * @example
 * ```tsx
 * function App() {
 *   useConnectionToast();
 *   return <MyApp />;
 * }
 * ```
 */
export function useConnectionToast(options: UseConnectionToastOptions = {}) {
  const { showOnInitialConnect = false } = options;

  const previousStatus = useRef<ConnectionStatus | null>(null);
  const reconnectToastId = useRef<string | number | null>(null);
  const hasConnectedOnce = useRef(false);

  const handleReconnect = useCallback(() => {
    connectionManager.reconnect();
    // Dismiss the error toast
    if (reconnectToastId.current) {
      toast.dismiss(reconnectToastId.current);
      reconnectToastId.current = null;
    }
  }, []);

  const showReconnectingToast = useCallback((details?: ConnectionStatusDetails) => {
    const attempt = details?.reconnectAttempt ?? 1;
    const maxAttempts = details?.maxReconnectAttempts ?? 10;
    const nextIn = details?.nextReconnectIn;

    // Update or create the reconnect toast
    const toastOptions = {
      id: 'connection-reconnecting',
      description: `正在重连 (${attempt}/${maxAttempts})${nextIn ? ` - ${Math.ceil(nextIn / 1000)}秒后重试` : ''}`,
      duration: Infinity, // Keep visible until status changes
      action: {
        label: '取消',
        onClick: () => {
          connectionManager.disconnect();
        },
      },
    };

    reconnectToastId.current = toast.loading('正在重新连接...', toastOptions);
  }, []);

  const showErrorToast = useCallback((details?: ConnectionStatusDetails, onReconnect?: () => void) => {
    // Dismiss any reconnect toast first
    if (reconnectToastId.current) {
      toast.dismiss(reconnectToastId.current);
      reconnectToastId.current = null;
    }

    const errorMessage = details?.errorMessage ?? '无法连接到后端服务';
    const maxReached = (details?.reconnectAttempt ?? 0) >= (details?.maxReconnectAttempts ?? 10);

    reconnectToastId.current = toast.error('连接失败', {
      id: 'connection-error',
      description: maxReached
        ? `${errorMessage}。已达到最大重试次数。`
        : errorMessage,
      duration: Infinity, // Keep visible until user acts or status changes
      action: {
        label: '重新连接',
        onClick: () => onReconnect?.(),
      },
    });
  }, []);

  useEffect(() => {
    const unsubscribe = connectionManager.onStatusChange((status, details) => {
      const prev = previousStatus.current;
      previousStatus.current = status;

      // Skip initial status notification
      if (prev === null && status === 'disconnected') {
        return;
      }

      switch (status) {
        case 'connected':
          // Dismiss any reconnect toast
          if (reconnectToastId.current) {
            toast.dismiss(reconnectToastId.current);
            reconnectToastId.current = null;
          }

          // Show success toast only on reconnection (not initial connect)
          if (hasConnectedOnce.current || showOnInitialConnect) {
            if (prev === 'reconnecting' || prev === 'error' || prev === 'disconnected') {
              toast.success('已连接', {
                description: '与后端的连接已恢复',
                duration: 3000,
              });
            }
          }
          hasConnectedOnce.current = true;
          break;

        case 'reconnecting':
          showReconnectingToast(details);
          break;

        case 'error':
          showErrorToast(details, handleReconnect);
          break;

        case 'disconnected':
          // Only show if we were connected before
          if (prev === 'connected') {
            toast.info('连接已断开', {
              description: '正在尝试重新连接...',
              duration: 3000,
            });
          }
          break;
      }
    });

    return () => {
      unsubscribe();
      // Clean up any persistent toasts
      if (reconnectToastId.current) {
        toast.dismiss(reconnectToastId.current);
      }
    };
  }, [handleReconnect, showOnInitialConnect, showReconnectingToast, showErrorToast]);

  return { handleReconnect };
}

/**
 * Standalone function to manually show a connection error toast.
 * Useful for components that don't use the hook.
 */
export function showConnectionError(message: string, onReconnect?: () => void) {
  toast.error('连接失败', {
    description: message,
    duration: Infinity,
    action: onReconnect
      ? {
          label: '重新连接',
          onClick: onReconnect,
        }
      : undefined,
  });
}

/**
 * Standalone function to show a connection success toast.
 */
export function showConnectionSuccess(message = '已连接') {
  toast.success(message, {
    description: '与后端的连接已恢复',
    duration: 3000,
  });
}
