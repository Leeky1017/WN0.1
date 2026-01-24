import * as path from 'node:path';
import { Worker } from 'node:worker_threads';

import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';

import type { IpcErrorCode } from '../../common/ipc-generated';
import type { EmbeddingService as EmbeddingServiceShape } from '../../common/writenow-protocol';
import { WRITENOW_DATA_DIR } from '../writenow-data-dir';

export const DEFAULT_EMBEDDING_MODEL_ID = 'shibing624/text2vec-base-chinese';

type EmbeddingWorkerRequest = Readonly<{
    id: number;
    type: 'encode';
    payload: Readonly<{
        texts: string[];
        model: string;
        cacheDir: string;
        allowRemote: boolean;
        debugDelayMs?: number;
    }>;
}>;

type EmbeddingWorkerResponse =
    | Readonly<{
          id: number;
          ok: true;
          data: Readonly<{ model: string; dimension: number; vectors: number[][] }>;
      }>
    | Readonly<{
          id: number;
          ok: false;
          error: unknown;
      }>;

type PendingRequest = {
    resolve: (value: { dimension: number; vectors: number[][] }) => void;
    reject: (error: unknown) => void;
    timeout: NodeJS.Timeout;
};

type IpcErrorLike = Readonly<{
    ipcError: Readonly<{ code: IpcErrorCode; message: string; details?: unknown }>;
}>;

function isIpcErrorLike(value: unknown): value is IpcErrorLike {
    if (!value || typeof value !== 'object') return false;
    if (!('ipcError' in value)) return false;
    const ipcError = (value as { ipcError?: unknown }).ipcError;
    if (!ipcError || typeof ipcError !== 'object') return false;
    const record = ipcError as { code?: unknown; message?: unknown };
    return typeof record.code === 'string' && typeof record.message === 'string';
}

function createIpcError(code: IpcErrorCode, message: string, details?: unknown): Error {
    const error = new Error(message);
    (error as { ipcError?: unknown }).ipcError = {
        code,
        message,
        ...(typeof details === 'undefined' ? {} : { details }),
    };
    return error;
}

function clampEmbeddingTimeoutMs(raw: unknown): number {
    const parsed = typeof raw === 'string' ? Number.parseInt(raw.trim(), 10) : NaN;
    if (!Number.isFinite(parsed)) return 120_000;
    return Math.max(10_000, Math.min(600_000, parsed));
}

function getModelCacheDir(userDataDir: string): string {
    const override = typeof process.env.WN_MODEL_CACHE_DIR === 'string' ? process.env.WN_MODEL_CACHE_DIR.trim() : '';
    if (override) return override;
    return path.join(userDataDir, 'models');
}

function getAllowRemoteDefault(): boolean {
    return process.env.WN_EMBEDDING_ALLOW_REMOTE !== '0';
}

function getDebugDelayMs(): number | null {
    if (process.env.WN_E2E !== '1') return null;
    const raw = typeof process.env.WN_E2E_EMBEDDING_DELAY_MS === 'string' ? process.env.WN_E2E_EMBEDDING_DELAY_MS.trim() : '';
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.min(parsed, 600_000);
}

/**
 * Why: Keep transformer model loading + ONNX execution isolated from the main backend thread.
 * The worker thread owns all heavy imports and model state; the service only manages request/timeout semantics.
 */
@injectable()
export class EmbeddingServiceImpl implements EmbeddingServiceShape {
    private worker: Worker | null = null;
    private seq = 0;
    private readonly pending = new Map<number, PendingRequest>();
    private closing = false;

    constructor(
        @inject(ILogger) private readonly logger: ILogger,
        @inject(WRITENOW_DATA_DIR) private readonly userDataDir: string,
    ) {}

    private ensureWorker(): Worker {
        if (this.worker) return this.worker;

        const workerPath = path.resolve(__dirname, 'embedding-worker.js');
        const worker = new Worker(workerPath);

        worker.on('message', (message) => {
            this.onMessage(message as EmbeddingWorkerResponse);
        });
        worker.on('error', (error) => {
            this.onWorkerError(error);
        });
        worker.on('exit', (code) => {
            this.onWorkerExit(code);
        });

        this.worker = worker;
        return worker;
    }

    private onMessage(message: EmbeddingWorkerResponse): void {
        const id = message?.id;
        if (typeof id !== 'number') return;
        const pending = this.pending.get(id);
        if (!pending) return;
        this.pending.delete(id);
        clearTimeout(pending.timeout);

        if (message.ok) {
            pending.resolve({ dimension: message.data.dimension, vectors: message.data.vectors });
        } else {
            pending.reject(message.error ?? createIpcError('ENCODING_FAILED', 'Embedding worker returned an error'));
        }
    }

    private rejectAll(error: unknown): void {
        for (const pending of this.pending.values()) {
            clearTimeout(pending.timeout);
            pending.reject(error);
        }
        this.pending.clear();
    }

    private onWorkerError(error: unknown): void {
        if (this.closing) {
            this.worker = null;
            return;
        }
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`[embedding] worker error: ${message}`);
        this.rejectAll(isIpcErrorLike(error) ? error : createIpcError('ENCODING_FAILED', 'Embedding worker failed', { message }));
        this.worker = null;
    }

    private onWorkerExit(code: number): void {
        if (this.closing) {
            this.worker = null;
            return;
        }
        this.logger.warn(`[embedding] worker exited: ${code}`);
        this.rejectAll(createIpcError('ENCODING_FAILED', 'Embedding worker exited', { code }));
        this.worker = null;
    }

    private request(type: EmbeddingWorkerRequest['type'], payload: EmbeddingWorkerRequest['payload']): Promise<{ dimension: number; vectors: number[][] }> {
        const worker = this.ensureWorker();
        const requestId = (this.seq += 1);

        return new Promise((resolve, reject) => {
            const timeoutMs = clampEmbeddingTimeoutMs(process.env.WN_EMBEDDING_TIMEOUT_MS);
            const timeout = setTimeout(() => {
                this.pending.delete(requestId);
                reject(createIpcError('TIMEOUT', 'Embedding request timed out', { timeoutMs }));
            }, timeoutMs);

            this.pending.set(requestId, { resolve, reject, timeout });

            const debugDelayMs = getDebugDelayMs();

            const requestMessage: EmbeddingWorkerRequest = {
                id: requestId,
                type,
                payload: {
                    ...payload,
                    ...(debugDelayMs === null ? {} : { debugDelayMs }),
                },
            };

            worker.postMessage(requestMessage);
        });
    }

    /**
     * Why: Provide the minimal embedding primitive used by RAG + semantic search.
     *
     * Failure semantics: throws `ipcError`-shaped errors (`MODEL_NOT_READY`/`TIMEOUT`/`ENCODING_FAILED`).
     */
    async encode(texts: readonly string[], options: Readonly<{ allowRemote?: boolean }> = {}): Promise<{ dimension: number; vectors: number[][] }> {
        if (!Array.isArray(texts) || texts.length === 0) throw createIpcError('INVALID_ARGUMENT', 'texts must be a non-empty array');
        if (texts.length > 64) throw createIpcError('INVALID_ARGUMENT', 'texts is too large', { max: 64 });
        for (const text of texts) {
            if (typeof text !== 'string') throw createIpcError('INVALID_ARGUMENT', 'texts must be string[]');
        }

        const runtimeOverride =
            process.env.WN_E2E === '1' && typeof process.env.WN_E2E_EMBEDDING_MODEL_ID === 'string' ? process.env.WN_E2E_EMBEDDING_MODEL_ID.trim() : '';

        const model = runtimeOverride || DEFAULT_EMBEDDING_MODEL_ID;
        const allowRemote = typeof options.allowRemote === 'boolean' ? options.allowRemote : getAllowRemoteDefault();
        const cacheDir = getModelCacheDir(this.userDataDir);

        try {
            return await this.request('encode', { texts: Array.from(texts), model, cacheDir, allowRemote });
        } catch (error) {
            if (isIpcErrorLike(error)) throw error;
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`[embedding] encode failed: ${message}`);
            throw createIpcError('ENCODING_FAILED', 'Embedding encode failed', {
                model,
                cacheDir,
                allowRemote,
                message,
                recovery: 'Ensure the embedding model can be loaded, then retry.',
            });
        }
    }

    /**
     * Why: Backend shutdown (or hot-restart in tests) must clear pending work to avoid leaking promises / stuck UI state.
     */
    async close(): Promise<void> {
        this.rejectAll(createIpcError('CANCELED', 'Embedding service closed'));

        const worker = this.worker;
        this.worker = null;
        if (!worker) return;

        try {
            this.closing = true;
            await worker.terminate();
        } catch {
            // ignore
        } finally {
            this.closing = false;
        }
    }
}
