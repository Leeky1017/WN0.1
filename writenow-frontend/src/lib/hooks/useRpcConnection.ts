/**
 * React hook for RPC connection management
 *
 * Why: Provides React-friendly access to the unified connection manager
 * with automatic status synchronization and reconnection controls.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { connectionManager, type ConnectionStatus, type ConnectionStatusDetails } from '@/lib/rpc/connection-manager'
import { getRpcWsUrl } from '@/lib/rpc/rpcUrl'
import { useStatusBarStore } from '@/stores/statusBarStore'

export interface UseRpcConnectionOptions {
  /** WebSocket URL to connect to */
  url?: string
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean
}

export interface UseRpcConnectionResult {
  /** Current connection status */
  status: ConnectionStatus
  /** Whether the client is connected */
  isConnected: boolean
  /** Manually trigger connection */
  connect: () => Promise<void>
  /** Disconnect from the backend */
  disconnect: () => void
  /** Manually trigger reconnection */
  reconnect: () => void
  /** Connection error message, if any */
  error: string | null
  /** Reconnection details (attempt count, time to next attempt) */
  reconnectDetails: ConnectionStatusDetails | null
}

// Map internal status to legacy RpcConnectionStatus for backward compatibility
export type RpcConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

function mapToLegacyStatus(status: ConnectionStatus): RpcConnectionStatus {
  if (status === 'reconnecting') return 'connecting'
  return status
}

/**
 * Hook for managing RPC connection state.
 *
 * Integrates with the unified connection manager and syncs status to
 * the status bar store for global visibility.
 *
 * @param options - Connection options
 * @returns Connection state and control functions
 */
export function useRpcConnection(
  options: UseRpcConnectionOptions = {}
): UseRpcConnectionResult {
  const { url = getRpcWsUrl(), autoConnect = true } = options
  
  const [status, setStatus] = useState<ConnectionStatus>(connectionManager.status)
  const [error, setError] = useState<string | null>(null)
  const [reconnectDetails, setReconnectDetails] = useState<ConnectionStatusDetails | null>(null)
  const setConnectionStatus = useStatusBarStore((s) => s.setConnectionStatus)
  const hasConnectedOnce = useRef(false)

  useEffect(() => {
    const unsubscribe = connectionManager.onStatusChange((newStatus, details) => {
      setStatus(newStatus)
      setReconnectDetails(details ?? null)
      
      // Sync to status bar store
      setConnectionStatus(newStatus === 'connected')
      
      // Set error message
      if (newStatus === 'error') {
        setError(details?.errorMessage ?? 'Connection failed')
      } else if (newStatus === 'connected') {
        setError(null)
      } else if (newStatus === 'reconnecting') {
        setError(`Reconnecting... (attempt ${details?.reconnectAttempt ?? 1}/${details?.maxReconnectAttempts ?? 10})`)
      }
    })
    
    return unsubscribe
  }, [setConnectionStatus])

  const connect = useCallback(async () => {
    hasConnectedOnce.current = true
    await connectionManager.connect(url)
  }, [url])

  const disconnect = useCallback(() => {
    connectionManager.disconnect()
  }, [])

  const reconnect = useCallback(() => {
    connectionManager.reconnect()
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && !hasConnectedOnce.current) {
      hasConnectedOnce.current = true
      void connectionManager.connect(url).catch(() => {
        // Error state is tracked via status listeners
      })
    }
  }, [autoConnect, url])

  return {
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
    reconnect,
    error,
    reconnectDetails,
  }
}

/**
 * Hook that provides the legacy RpcConnectionStatus type.
 * Use useRpcConnection for full functionality.
 */
export function useRpcConnectionLegacy(
  options: UseRpcConnectionOptions = {}
): { status: RpcConnectionStatus; isConnected: boolean; connect: () => Promise<void>; disconnect: () => void; error: string | null } {
  const result = useRpcConnection(options)
  return {
    status: mapToLegacyStatus(result.status),
    isConnected: result.isConnected,
    connect: result.connect,
    disconnect: result.disconnect,
    error: result.error,
  }
}
