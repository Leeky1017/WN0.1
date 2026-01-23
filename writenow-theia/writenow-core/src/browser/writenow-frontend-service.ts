import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging/ws-connection-provider';
import { inject, injectable } from '@theia/core/shared/inversify';

import type {
    IpcChannel,
    IpcError as IpcErrorShape,
    IpcErrorCode,
    IpcInvokeDataMap,
    IpcInvokePayloadMap,
    IpcInvokeResponseMap,
} from '../common/ipc-generated';
import { WRITENOW_RPC_PATH, type WritenowRpcService } from '../common/writenow-protocol';

export class IpcError extends Error {
    readonly code: IpcErrorCode;
    readonly details?: unknown;
    readonly retryable?: boolean;

    constructor(error: IpcErrorShape) {
        super(error.message);
        this.name = 'IpcError';
        this.code = error.code;
        this.details = error.details;
        this.retryable = error.retryable;
    }
}

@injectable()
export class WritenowFrontendService {
    private readonly rpc: WritenowRpcService;

    constructor(@inject(WebSocketConnectionProvider) connectionProvider: WebSocketConnectionProvider) {
        this.rpc = connectionProvider.createProxy<WritenowRpcService>(WRITENOW_RPC_PATH);
    }

    /**
     * Why: Keep the raw `IpcResponse<T>` available so UI/state machines can distinguish failure/timeout/cancel and
     * always clear pending state.
     */
    async invokeResponse<T extends IpcChannel>(
        channel: T,
        payload: IpcInvokePayloadMap[T],
    ): Promise<IpcInvokeResponseMap[T]> {
        return (await this.rpc.invoke(channel, payload)) as IpcInvokeResponseMap[T];
    }

    /**
     * Why: Match the existing renderer helper semantics (`src/lib/ipc.ts`) for callers that prefer exceptions.
     */
    async invoke<T extends IpcChannel>(channel: T, payload: IpcInvokePayloadMap[T]): Promise<IpcInvokeDataMap[T]> {
        const response = await this.invokeResponse(channel, payload);
        if (!response.ok) {
            throw new IpcError(response.error);
        }
        return response.data;
    }
}
