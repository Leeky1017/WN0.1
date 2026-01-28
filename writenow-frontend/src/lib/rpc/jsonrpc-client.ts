/**
 * JsonRpcWebSocketClient
 * Why: The standalone frontend needs direct access to Theia JSON-RPC services (e.g. /services/writenow/ai)
 * which are not exposed via the `/standalone-rpc` invoke bridge.
 * 
 * 支持自动重连（指数退避）和连接状态监听。
 */

import { listen } from 'vscode-ws-jsonrpc';
import type { MessageConnection } from 'vscode-jsonrpc';

export type JsonRpcConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type JsonRpcStatusListener = (status: JsonRpcConnectionStatus) => void;

export interface JsonRpcClientOptions {
  /** 是否启用自动重连（默认 true） */
  autoReconnect?: boolean;
  /** 最大重连次数（默认 10） */
  maxReconnectAttempts?: number;
  /** 初始重连延迟毫秒（默认 1000） */
  initialReconnectDelay?: number;
  /** 最大重连延迟毫秒（默认 30000） */
  maxReconnectDelay?: number;
  /** 重连成功后的回调 */
  onReconnected?: () => void;
}

const DEFAULT_OPTIONS: Required<JsonRpcClientOptions> = {
  autoReconnect: true,
  maxReconnectAttempts: 10,
  initialReconnectDelay: 1000,
  maxReconnectDelay: 30000,
  onReconnected: () => {},
};

export class JsonRpcWebSocketClient {
  private connection: MessageConnection | null = null;
  private listeners = new Set<JsonRpcStatusListener>();
  private currentStatus: JsonRpcConnectionStatus = 'disconnected';
  private connectInFlight: Promise<void> | null = null;
  private connectUrl: string | null = null;
  
  // 自动重连相关
  private options: Required<JsonRpcClientOptions>;
  private reconnectAttempts = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  constructor(options?: JsonRpcClientOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  get status(): JsonRpcConnectionStatus {
    return this.currentStatus;
  }

  get isConnected(): boolean {
    return this.currentStatus === 'connected' && this.connection !== null;
  }

  onStatusChange(listener: JsonRpcStatusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 设置重连成功回调（用于刷新 skills 等）
   */
  setOnReconnected(callback: () => void): void {
    this.options.onReconnected = callback;
  }

  async connect(url?: string): Promise<void> {
    const targetUrl = url ?? this.connectUrl;
    if (!targetUrl) {
      throw new Error('No URL provided for connection');
    }

    if (this.currentStatus === 'connected' && this.connection) {
      if (this.connectUrl === targetUrl) return;
      this.disconnect();
    }
    if (this.currentStatus === 'connecting' && this.connectInFlight && this.connectUrl === targetUrl) {
      return this.connectInFlight;
    }

    this.shouldReconnect = true;
    this.clearReconnectTimeout();
    this.setStatus('connecting');
    this.connectUrl = targetUrl;

    this.connectInFlight = new Promise((resolve, reject) => {
      try {
        const socket = new WebSocket(targetUrl);

        socket.onerror = (error) => {
          console.error('[JSON-RPC] WebSocket error:', error);
          this.connection = null;
          this.setStatus('error');
          this.connectInFlight = null;
          this.scheduleReconnect();
          reject(new Error('WebSocket connection failed'));
        };

        socket.onclose = () => {
          this.connection = null;
          this.setStatus('disconnected');
          this.connectInFlight = null;
          this.scheduleReconnect();
        };

        listen({
          webSocket: socket,
          onConnection: (connection) => {
            this.connection = connection;
            connection.listen();
            this.setStatus('connected');
            this.connectInFlight = null;
            
            // 重连成功时重置计数并触发回调
            if (this.reconnectAttempts > 0) {
              console.log('[JSON-RPC] Reconnected successfully after', this.reconnectAttempts, 'attempts');
              this.options.onReconnected();
            }
            this.reconnectAttempts = 0;
            
            resolve();
          },
        });
      } catch (error) {
        this.connection = null;
        this.setStatus('error');
        this.connectInFlight = null;
        this.scheduleReconnect();
        reject(error);
      }
    });

    return this.connectInFlight;
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimeout();
    
    if (this.connection) {
      this.connection.dispose();
      this.connection = null;
    }
    this.setStatus('disconnected');
  }

  async sendRequest<TResult>(method: string, params?: unknown): Promise<TResult> {
    if (!this.connection) {
      throw new Error('Not connected');
    }
    return (await this.connection.sendRequest(method, params)) as TResult;
  }

  onNotification(method: string, handler: (payload: unknown) => void): () => void {
    if (!this.connection) {
      throw new Error('Not connected');
    }
    const disposable = this.connection.onNotification(method, handler);
    return () => disposable.dispose();
  }

  private setStatus(status: JsonRpcConnectionStatus): void {
    this.currentStatus = status;
    this.listeners.forEach((listener) => listener(status));
  }

  /**
   * 使用指数退避调度重连
   */
  private scheduleReconnect(): void {
    if (!this.options.autoReconnect) return;
    if (!this.shouldReconnect) return;
    if (!this.connectUrl) return;
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.warn('[JSON-RPC] Max reconnect attempts reached, giving up');
      return;
    }

    this.clearReconnectTimeout();

    // 指数退避：delay = min(initialDelay * 2^attempts, maxDelay)
    const delay = Math.min(
      this.options.initialReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.options.maxReconnectDelay
    );

    console.log(`[JSON-RPC] Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${delay}ms`);

    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectAttempts++;
      void this.connect().catch((error) => {
        console.warn('[JSON-RPC] Reconnect attempt failed:', error);
        // scheduleReconnect 会在 onerror/onclose 中被再次调用
      });
    }, delay);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }
}
