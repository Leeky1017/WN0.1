import type { IpcChannel, IpcResponse } from './ipc-generated';

export const WRITENOW_RPC_PATH = '/services/writenow';
export const WritenowRpcService = Symbol('WritenowRpcService');

export interface WritenowRpcService {
    /**
     * Why: Preserve WriteNow's transport-agnostic `invoke(channel, payload)` contract while swapping the underlying
     * transport from Electron IPC to Theia JSON-RPC.
     *
     * Failure semantics: MUST return `{ ok: false, error: { code, message, details? } }` and MUST NOT throw across the
     * RPC boundary (avoid leaking stacks to the frontend).
     */
    invoke(channel: IpcChannel, payload: unknown): Promise<IpcResponse<unknown>>;
}
