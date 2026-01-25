/**
 * AI JSON-RPC client (Theia backend)
 * Why: AI streaming requires backend->frontend notifications (`onStreamEvent`). The standalone frontend reuses the
 * `/standalone-rpc` endpoint (extended to support AI + skills) so we don't need Theia's channel multiplexer protocol.
 */

import type {
  AiSkillCancelRequest,
  AiSkillCancelResponse,
  AiSkillRunRequest,
  AiSkillRunResponse,
  IpcResponse,
  IpcError,
} from '@/types/ipc-generated';
import type { AiStreamEvent } from '@/types/theia-ai';

import { JsonRpcWebSocketClient, type JsonRpcConnectionStatus, type JsonRpcStatusListener } from './jsonrpc-client';

const DEFAULT_AI_URL = 'ws://localhost:3000/standalone-rpc';

export type AiStreamListener = (event: AiStreamEvent) => void;

function coerceStreamEvent(payload: unknown): AiStreamEvent | null {
  const candidate = Array.isArray(payload) ? payload[0] : payload;
  if (!candidate || typeof candidate !== 'object') return null;

  const record = candidate as { type?: unknown; runId?: unknown };
  if (typeof record.type !== 'string' || typeof record.runId !== 'string') return null;

  if (record.type === 'delta') {
    const delta = candidate as { type: 'delta'; runId: string; text?: unknown };
    if (typeof delta.text !== 'string') return null;
    return { type: 'delta', runId: delta.runId, text: delta.text };
  }
  if (record.type === 'done') {
    const done = candidate as { type: 'done'; runId: string; result?: unknown };
    const result = done.result as { text?: unknown; meta?: unknown } | undefined;
    if (!result || typeof result.text !== 'string') return null;
    return { type: 'done', runId: done.runId, result: { text: result.text, meta: result.meta } };
  }
  if (record.type === 'error') {
    const err = candidate as { type: 'error'; runId: string; error?: unknown };
    const error = err.error as { code?: unknown; message?: unknown; details?: unknown; retryable?: unknown } | undefined;
    if (!error || typeof error.code !== 'string' || typeof error.message !== 'string') return null;
    return {
      type: 'error',
      runId: err.runId,
      error: {
        code: error.code as IpcError['code'],
        message: error.message,
        ...(typeof error.details === 'undefined' ? {} : { details: error.details }),
        ...(typeof error.retryable === 'boolean' ? { retryable: error.retryable } : {}),
      },
    };
  }
  return null;
}

export class AiJsonRpcClient {
  private readonly client = new JsonRpcWebSocketClient();
  private readonly listeners = new Set<AiStreamListener>();
  private unsubscribeNotification: (() => void) | null = null;

  get status(): JsonRpcConnectionStatus {
    return this.client.status;
  }

  get isConnected(): boolean {
    return this.client.isConnected;
  }

  onStatusChange(listener: JsonRpcStatusListener): () => void {
    return this.client.onStatusChange(listener);
  }

  async connect(url: string = DEFAULT_AI_URL): Promise<void> {
    await this.client.connect(url);
    if (!this.unsubscribeNotification) {
      this.unsubscribeNotification = this.client.onNotification('onStreamEvent', (payload) => {
        const event = coerceStreamEvent(payload);
        if (!event) return;
        this.listeners.forEach((listener) => listener(event));
      });
    }
  }

  disconnect(): void {
    this.unsubscribeNotification?.();
    this.unsubscribeNotification = null;
    this.listeners.clear();
    this.client.disconnect();
  }

  onStreamEvent(listener: AiStreamListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async streamResponse(request: AiSkillRunRequest): Promise<IpcResponse<AiSkillRunResponse>> {
    return await this.client.sendRequest<IpcResponse<AiSkillRunResponse>>('streamResponse', request);
  }

  async executeSkill(request: AiSkillRunRequest): Promise<IpcResponse<AiSkillRunResponse>> {
    return await this.client.sendRequest<IpcResponse<AiSkillRunResponse>>('executeSkill', request);
  }

  async cancel(request: AiSkillCancelRequest): Promise<IpcResponse<AiSkillCancelResponse>> {
    return await this.client.sendRequest<IpcResponse<AiSkillCancelResponse>>('cancel', request);
  }
}

export const aiClient = new AiJsonRpcClient();
