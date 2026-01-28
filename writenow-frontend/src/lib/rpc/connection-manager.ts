/**
 * RPC Connection Manager
 *
 * Why: Centralizes connection lifecycle, heartbeat, and reconnection strategy
 * for all RPC clients. Eliminates duplication between RpcClient and JsonRpcWebSocketClient.
 *
 * Features:
 * - Unified connection status across all RPC clients
 * - Heartbeat mechanism for connection health detection
 * - Exponential backoff reconnection
 * - Event-driven status updates for UI reactivity
 */

import { listen } from 'vscode-ws-jsonrpc';
import type { MessageConnection } from 'vscode-jsonrpc';
import type { IpcResponse } from '@/types/ipc-generated';
import { getRpcWsUrl, setUserRpcWsUrlOverride } from './rpcUrl';
import { loggers } from '@/lib/logger';

const log = loggers.rpc;

/* ===== Types ===== */

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

export type ConnectionStatusListener = (status: ConnectionStatus, details?: ConnectionStatusDetails) => void;

export interface ConnectionStatusDetails {
  /** Error message if status is 'error' */
  errorMessage?: string;
  /** Current reconnect attempt count */
  reconnectAttempt?: number;
  /** Maximum reconnect attempts */
  maxReconnectAttempts?: number;
  /** Time until next reconnect attempt in ms */
  nextReconnectIn?: number;
}

export interface ConnectionManagerOptions {
  /** Enable automatic reconnection (default: true) */
  autoReconnect?: boolean;
  /** Maximum reconnect attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Initial reconnect delay in ms (default: 1000) */
  initialReconnectDelay?: number;
  /** Maximum reconnect delay in ms (default: 30000) */
  maxReconnectDelay?: number;
  /** Heartbeat interval in ms (default: 30000, 0 to disable) */
  heartbeatInterval?: number;
  /** Heartbeat timeout in ms (default: 5000) */
  heartbeatTimeout?: number;
}

const DEFAULT_OPTIONS: Required<ConnectionManagerOptions> = {
  autoReconnect: true,
  maxReconnectAttempts: 10,
  initialReconnectDelay: 1000,
  maxReconnectDelay: 30000,
  heartbeatInterval: 30000,
  heartbeatTimeout: 5000,
};

/* ===== Connection Manager ===== */

/**
 * Centralized RPC connection manager.
 *
 * Singleton pattern to ensure consistent connection state across the app.
 */
class RpcConnectionManager {
  private connection: MessageConnection | null = null;
  private options: Required<ConnectionManagerOptions>;
  private listeners = new Set<ConnectionStatusListener>();
  private currentStatus: ConnectionStatus = 'disconnected';
  private statusDetails: ConnectionStatusDetails = {};

  // Connection state
  private connectUrl: string | null = null;
  private connectInFlight: Promise<void> | null = null;
  private shouldReconnect = true;

  // Reconnection state
  private reconnectAttempts = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Heartbeat state
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private lastHeartbeatResponse = 0;

  constructor(options?: ConnectionManagerOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /* ===== Public API ===== */

  /** Current connection status */
  get status(): ConnectionStatus {
    return this.currentStatus;
  }

  /** Whether the connection is established and healthy */
  get isConnected(): boolean {
    return this.currentStatus === 'connected' && this.connection !== null;
  }

  /** Current connection URL */
  get url(): string | null {
    return this.connectUrl;
  }

  /** Get the underlying MessageConnection (for direct JSON-RPC calls) */
  get messageConnection(): MessageConnection | null {
    return this.connection;
  }

  /**
   * Subscribe to connection status changes.
   * @returns Unsubscribe function
   */
  onStatusChange(listener: ConnectionStatusListener): () => void {
    this.listeners.add(listener);
    // Immediately notify of current status
    listener(this.currentStatus, this.statusDetails);
    return () => this.listeners.delete(listener);
  }

  /**
   * Connect to the backend.
   * @param url - WebSocket URL (optional, uses resolved URL if not provided)
   */
  async connect(url?: string): Promise<void> {
    const targetUrl = url ?? getRpcWsUrl();

    // Already connected to this URL
    if (this.currentStatus === 'connected' && this.connection && this.connectUrl === targetUrl) {
      return;
    }

    // Connection in progress to this URL
    if (this.connectInFlight && this.connectUrl === targetUrl) {
      return this.connectInFlight;
    }

    // Different URL - disconnect first
    if (this.connection && this.connectUrl !== targetUrl) {
      this.disconnect();
    }

    this.shouldReconnect = true;
    this.clearReconnectTimeout();
    this.setStatus('connecting');
    this.connectUrl = targetUrl;

    this.connectInFlight = this.doConnect(targetUrl);
    return this.connectInFlight;
  }

  /**
   * Disconnect from the backend.
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimeout();
    this.stopHeartbeat();

    if (this.connection) {
      this.connection.dispose();
      this.connection = null;
    }

    this.connectInFlight = null;
    this.reconnectAttempts = 0;
    this.setStatus('disconnected');
  }

  /**
   * Manually trigger reconnection.
   */
  reconnect(): void {
    if (!this.connectUrl) return;

    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.clearReconnectTimeout();

    void this.connect(this.connectUrl).catch((error) => {
      console.error('[RPC] Manual reconnect failed:', error);
    });
  }

  /**
   * Update connection URL (persists to localStorage).
   * Triggers reconnection if URL changed.
   */
  setUrl(newUrl: string): void {
    setUserRpcWsUrlOverride(newUrl);
    const wasConnected = this.isConnected || this.currentStatus === 'connecting';
    if (wasConnected || this.connectUrl) {
      this.disconnect();
      void this.connect(newUrl).catch(() => {
        // Error handled via status listeners
      });
    }
  }

  /**
   * Invoke an RPC method (IPC-style with channel + payload).
   */
  async invoke<T>(channel: string, payload: unknown): Promise<IpcResponse<T>> {
    if (!this.connection) {
      return {
        ok: false,
        error: {
          code: 'INTERNAL',
          message: 'Not connected to backend',
        },
      };
    }

    try {
      const response = await this.connection.sendRequest('invoke', [channel, payload]);
      return response as IpcResponse<T>;
    } catch (error) {
      return {
        ok: false,
        error: {
          code: 'INTERNAL',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      };
    }
  }

  /**
   * Send a direct JSON-RPC request.
   */
  async sendRequest<T>(method: string, params?: unknown): Promise<T> {
    if (!this.connection) {
      throw new Error('Not connected');
    }
    return (await this.connection.sendRequest(method, params)) as T;
  }

  /**
   * Register a notification handler.
   */
  onNotification(method: string, handler: (payload: unknown) => void): () => void {
    if (!this.connection) {
      throw new Error('Not connected');
    }
    const disposable = this.connection.onNotification(method, handler);
    return () => disposable.dispose();
  }

  /* ===== Private Methods ===== */

  private async doConnect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const socket = new WebSocket(url);

        socket.onerror = (error) => {
          log.error('WebSocket error:', error);
          this.connection = null;
          this.setStatus('error', { errorMessage: 'WebSocket connection failed' });
          this.connectInFlight = null;
          this.scheduleReconnect();
          reject(new Error('WebSocket connection failed'));
        };

        socket.onclose = () => {
          log.info('WebSocket closed');
          this.connection = null;
          this.stopHeartbeat();
          this.setStatus('disconnected');
          this.connectInFlight = null;
          this.scheduleReconnect();
        };

        listen({
          webSocket: socket,
          onConnection: (connection) => {
            this.connection = connection;
            connection.listen();
            this.connectInFlight = null;

            // Reconnect success
            if (this.reconnectAttempts > 0) {
              log.info('Reconnected successfully after', this.reconnectAttempts, 'attempts');
            }
            this.reconnectAttempts = 0;

            this.setStatus('connected');
            this.startHeartbeat();
            log.info('Connected to backend:', url);
            resolve();
          },
        });
      } catch (error) {
        this.connection = null;
        this.setStatus('error', { errorMessage: error instanceof Error ? error.message : 'Unknown error' });
        this.connectInFlight = null;
        this.scheduleReconnect();
        reject(error);
      }
    });
  }

  private setStatus(status: ConnectionStatus, details: ConnectionStatusDetails = {}): void {
    this.currentStatus = status;
    this.statusDetails = details;
    this.listeners.forEach((listener) => listener(status, details));
  }

  private scheduleReconnect(): void {
    if (!this.options.autoReconnect) return;
    if (!this.shouldReconnect) return;
    if (!this.connectUrl) return;
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      log.warn('Max reconnect attempts reached, giving up');
      this.setStatus('error', {
        errorMessage: 'Maximum reconnection attempts reached',
        reconnectAttempt: this.reconnectAttempts,
        maxReconnectAttempts: this.options.maxReconnectAttempts,
      });
      return;
    }

    this.clearReconnectTimeout();

    // Exponential backoff: delay = min(initialDelay * 2^attempts, maxDelay)
    const delay = Math.min(
      this.options.initialReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.options.maxReconnectDelay
    );

    log.debug(`Scheduling reconnect attempt ${this.reconnectAttempts + 1}/${this.options.maxReconnectAttempts} in ${delay}ms`);

    this.setStatus('reconnecting', {
      reconnectAttempt: this.reconnectAttempts + 1,
      maxReconnectAttempts: this.options.maxReconnectAttempts,
      nextReconnectIn: delay,
    });

    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectAttempts++;
      void this.connect(this.connectUrl!).catch((error) => {
        log.warn('Reconnect attempt failed:', error);
      });
    }, delay);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  /* ===== Heartbeat ===== */

  private startHeartbeat(): void {
    if (this.options.heartbeatInterval <= 0) return;
    this.stopHeartbeat();

    this.lastHeartbeatResponse = Date.now();

    this.heartbeatIntervalId = setInterval(() => {
      this.sendHeartbeat();
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
      this.heartbeatTimeoutId = null;
    }
  }

  private sendHeartbeat(): void {
    if (!this.connection) return;

    // Set timeout for heartbeat response
    this.heartbeatTimeoutId = setTimeout(() => {
      const ageMs = Date.now() - this.lastHeartbeatResponse;
      log.warn(`Heartbeat timeout - last ok ${ageMs}ms ago`);
      // Force reconnection on heartbeat timeout
      this.connection?.dispose();
      this.connection = null;
      this.stopHeartbeat();
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }, this.options.heartbeatTimeout);

    // Send ping request
    this.connection
      .sendRequest('ping', {})
      .then(() => {
        // Heartbeat successful
        this.lastHeartbeatResponse = Date.now();
        if (this.heartbeatTimeoutId) {
          clearTimeout(this.heartbeatTimeoutId);
          this.heartbeatTimeoutId = null;
        }
      })
      .catch((error) => {
        log.warn('Heartbeat failed:', error);
        // Timeout handler will deal with this
      });
  }
}

/** Singleton connection manager instance */
export const connectionManager = new RpcConnectionManager();
