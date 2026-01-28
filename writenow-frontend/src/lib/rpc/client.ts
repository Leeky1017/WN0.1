/**
 * RPC Client for WebSocket JSON-RPC communication with Theia backend
 */

import { listen } from 'vscode-ws-jsonrpc'
import type { MessageConnection } from 'vscode-jsonrpc'
import type { IpcResponse } from '@/types/ipc-generated'

export type RpcConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export type RpcConnectionListener = (status: RpcConnectionStatus) => void

/**
 * WebSocket JSON-RPC client for backend communication
 */
class RpcClient {
  private connection: MessageConnection | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 5000
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect = true
  private listeners: Set<RpcConnectionListener> = new Set()
  private currentStatus: RpcConnectionStatus = 'disconnected'
  private connectInFlight: Promise<void> | null = null
  private connectUrl: string | null = null

  /**
   * Connect to the backend WebSocket server
   * @param url - WebSocket URL (e.g., ws://localhost:3000)
   */
  async connect(url: string): Promise<void> {
    if (this.currentStatus === 'connected' && this.connection) {
      if (this.connectUrl === url) return
      // Why: Users can update the backend URL at runtime; switching URLs must be explicit and deterministic.
      this.disconnect()
    }

    if (this.currentStatus === 'connecting' && this.connectInFlight && this.connectUrl === url) {
      return this.connectInFlight
    }

    this.shouldReconnect = true
    this.clearReconnectTimeout()
    this.setStatus('connecting')
    this.connectUrl = url

    this.connectInFlight = new Promise((resolve, reject) => {
      try {
        const socket = new WebSocket(url)
        
        socket.onerror = (error) => {
          console.error('[RPC] WebSocket error:', error)
          this.setStatus('error')
          this.connectInFlight = null
          reject(new Error('WebSocket connection failed'))
        }
        
        socket.onclose = () => {
          console.log('[RPC] WebSocket closed')
          this.connection = null
          this.setStatus('disconnected')
          this.connectInFlight = null
          this.scheduleReconnect(url)
        }
        
        listen({
          webSocket: socket,
          onConnection: (connection) => {
            this.connection = connection
            this.reconnectAttempts = 0
            connection.listen()
            this.setStatus('connected')
            this.connectInFlight = null
            console.log('[RPC] Connected to backend')
            resolve()
          },
        })
      } catch (error) {
        this.setStatus('error')
        this.connectInFlight = null
        reject(error)
      }
    })

    return this.connectInFlight
  }

  /**
   * Invoke an RPC method on the backend
   * @param channel - IPC channel name
   * @param payload - Request payload
   * @returns Response from backend
   */
  async invoke<T>(channel: string, payload: unknown): Promise<IpcResponse<T>> {
    if (!this.connection) {
      return {
        ok: false,
        error: {
          code: 'INTERNAL',
          message: 'Not connected to backend',
        },
      }
    }
    
    try {
      const response = await this.connection.sendRequest('invoke', [channel, payload])
      return response as IpcResponse<T>
    } catch (error) {
      return {
        ok: false,
        error: {
          code: 'INTERNAL',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      }
    }
  }

  /**
   * Check if the client is connected
   */
  get isConnected(): boolean {
    return this.connection !== null && this.currentStatus === 'connected'
  }

  /**
   * Get current connection status
   */
  get status(): RpcConnectionStatus {
    return this.currentStatus
  }

  /**
   * Subscribe to connection status changes
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  onStatusChange(listener: RpcConnectionListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Disconnect from the backend
   */
  disconnect(): void {
    this.shouldReconnect = false
    this.clearReconnectTimeout()
    if (this.connection) {
      this.connection.dispose()
      this.connection = null
    }
    this.connectInFlight = null
    this.setStatus('disconnected')
  }

  private setStatus(status: RpcConnectionStatus): void {
    this.currentStatus = status
    this.listeners.forEach((listener) => listener(status))
  }

  private scheduleReconnect(url: string): void {
    if (!this.shouldReconnect) return
    if (this.connectUrl !== url) return
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RPC] Max reconnect attempts reached')
      this.setStatus('error')
      return
    }
    
    this.reconnectAttempts++
    console.log(`[RPC] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
    
    this.clearReconnectTimeout()
    this.reconnectTimeoutId = setTimeout(() => {
      this.connect(url).catch((error) => {
        console.error('[RPC] Reconnect failed:', error)
      })
    }, this.reconnectDelay)
  }

  private clearReconnectTimeout(): void {
    if (!this.reconnectTimeoutId) return
    clearTimeout(this.reconnectTimeoutId)
    this.reconnectTimeoutId = null
  }
}

/** Singleton RPC client instance */
export const rpcClient = new RpcClient()
