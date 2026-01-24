import type { IpcChannel, IpcError, IpcErrorCode } from '../common/ipc-generated';

export type TheiaInvokeHandler = (event: unknown, payload: unknown) => Promise<unknown> | unknown;

const IPC_ERROR_CODES: ReadonlySet<IpcErrorCode> = new Set([
    'INVALID_ARGUMENT',
    'NOT_FOUND',
    'ALREADY_EXISTS',
    'CONFLICT',
    'PERMISSION_DENIED',
    'UNSUPPORTED',
    'IO_ERROR',
    'DB_ERROR',
    'MODEL_NOT_READY',
    'ENCODING_FAILED',
    'RATE_LIMITED',
    'TIMEOUT',
    'CANCELED',
    'UPSTREAM_ERROR',
    'INTERNAL',
]);

function toIpcErrorCode(value: unknown): IpcErrorCode {
    if (typeof value !== 'string') {
        return 'INTERNAL';
    }
    if (IPC_ERROR_CODES.has(value as IpcErrorCode)) {
        return value as IpcErrorCode;
    }
    return 'INTERNAL';
}

function coerceString(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function coerceDetails(value: unknown): unknown {
    return typeof value === 'undefined' ? undefined : value;
}

function coerceRetryable(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
}

function readNodeErrorCode(error: unknown): unknown {
    if (!error || typeof error !== 'object') {
        return undefined;
    }
    return (error as { code?: unknown }).code;
}

/**
 * Why: Mirror the Electron main-process `toIpcError` mapping so Theia RPC preserves stable error codes and
 * never leaks stack traces across the boundary.
 */
export function toIpcError(error: unknown): IpcError {
    if (error && typeof error === 'object') {
        const maybeIpcError = (error as { ipcError?: unknown }).ipcError;
        if (maybeIpcError && typeof maybeIpcError === 'object') {
            const record = maybeIpcError as { code?: unknown; message?: unknown; details?: unknown; retryable?: unknown };
            const code = toIpcErrorCode(record.code);
            const message = coerceString(record.message) || 'Upstream error';
            const details = coerceDetails(record.details);
            const retryable = coerceRetryable(record.retryable);
            return {
                code,
                message,
                ...(typeof details === 'undefined' ? {} : { details }),
                ...(typeof retryable === 'undefined' ? {} : { retryable }),
            };
        }
    }

    const nodeCode = readNodeErrorCode(error);
    if (nodeCode === 'ENOENT') {
        return { code: 'NOT_FOUND', message: 'Not found' };
    }
    if (nodeCode === 'EEXIST') {
        return { code: 'ALREADY_EXISTS', message: 'Already exists' };
    }
    if (nodeCode === 'EACCES' || nodeCode === 'EPERM') {
        return { code: 'PERMISSION_DENIED', message: 'Permission denied' };
    }

    if (typeof nodeCode === 'string' && nodeCode) {
        return { code: 'IO_ERROR', message: 'I/O error', details: { cause: nodeCode } };
    }

    return { code: 'INTERNAL', message: 'Internal error' };
}

/**
 * Why: Keep the existing `handleInvoke(channel, handler)` registration pattern so migrating Electron handlers to
 * Theia only requires swapping the transport adapter.
 */
export class TheiaInvokeRegistry {
    private readonly handlers = new Map<IpcChannel, TheiaInvokeHandler>();

    handleInvoke(channel: IpcChannel, handler: TheiaInvokeHandler): void {
        if (this.handlers.has(channel)) {
            throw new Error(`Duplicate IPC handler registration: ${channel}`);
        }
        this.handlers.set(channel, handler);
    }

    get(channel: IpcChannel): TheiaInvokeHandler | undefined {
        return this.handlers.get(channel);
    }
}
