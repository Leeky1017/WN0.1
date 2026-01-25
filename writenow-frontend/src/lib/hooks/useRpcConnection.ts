/**
 * React hook for RPC connection management
 */

import { useState, useEffect, useCallback } from 'react'
import { rpcClient, type RpcConnectionStatus } from '@/lib/rpc'

const DEFAULT_WS_URL = 'ws://localhost:3000'

export interface UseRpcConnectionOptions {
  /** WebSocket URL to connect to */
  url?: string
  /** Auto-connect on mount */
  autoConnect?: boolean
}

export interface UseRpcConnectionResult {
  /** Current connection status */
  status: RpcConnectionStatus
  /** Whether the client is connected */
  isConnected: boolean
  /** Manually trigger connection */
  connect: () => Promise<void>
  /** Disconnect from the backend */
  disconnect: () => void
  /** Connection error message, if any */
  error: string | null
}

/**
 * Hook for managing RPC connection state
 * @param options - Connection options
 * @returns Connection state and control functions
 */
export function useRpcConnection(
  options: UseRpcConnectionOptions = {}
): UseRpcConnectionResult {
  const { url = DEFAULT_WS_URL, autoConnect = true } = options
  
  const [status, setStatus] = useState<RpcConnectionStatus>(rpcClient.status)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = rpcClient.onStatusChange((newStatus) => {
      setStatus(newStatus)
      if (newStatus === 'error') {
        setError('Connection failed')
      } else if (newStatus === 'connected') {
        setError(null)
      }
    })
    
    return unsubscribe
  }, [])

  const connect = useCallback(async () => {
    setError(null)
    try {
      await rpcClient.connect(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    }
  }, [url])

  const disconnect = useCallback(() => {
    rpcClient.disconnect()
  }, [])

  useEffect(() => {
    if (autoConnect && status === 'disconnected') {
      connect()
    }
  }, [autoConnect, status, connect])

  return {
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
    error,
  }
}
