/**
 * JsonRpcWebSocketClient
 * Why: The standalone frontend needs direct access to Theia JSON-RPC services (e.g. /services/writenow/ai)
 * which are not exposed via the `/standalone-rpc` invoke bridge.
 */

import { listen } from 'vscode-ws-jsonrpc';
import type { MessageConnection } from 'vscode-jsonrpc';

export type JsonRpcConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type JsonRpcStatusListener = (status: JsonRpcConnectionStatus) => void;

export class JsonRpcWebSocketClient {
  private connection: MessageConnection | null = null;
  private listeners = new Set<JsonRpcStatusListener>();
  private currentStatus: JsonRpcConnectionStatus = 'disconnected';
  private connectInFlight: Promise<void> | null = null;
  private connectUrl: string | null = null;

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

  async connect(url: string): Promise<void> {
    if (this.currentStatus === 'connected' && this.connection) return;
    if (this.currentStatus === 'connecting' && this.connectInFlight && this.connectUrl === url) {
      return this.connectInFlight;
    }

    this.setStatus('connecting');
    this.connectUrl = url;

    this.connectInFlight = new Promise((resolve, reject) => {
      try {
        const socket = new WebSocket(url);

        socket.onerror = (error) => {
          console.error('[JSON-RPC] WebSocket error:', error);
          this.connection = null;
          this.setStatus('error');
          this.connectInFlight = null;
          reject(new Error('WebSocket connection failed'));
        };

        socket.onclose = () => {
          this.connection = null;
          this.setStatus('disconnected');
          this.connectInFlight = null;
        };

        listen({
          webSocket: socket,
          onConnection: (connection) => {
            this.connection = connection;
            connection.listen();
            this.setStatus('connected');
            this.connectInFlight = null;
            resolve();
          },
        });
      } catch (error) {
        this.connection = null;
        this.setStatus('error');
        this.connectInFlight = null;
        reject(error);
      }
    });

    return this.connectInFlight;
  }

  disconnect(): void {
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
}

