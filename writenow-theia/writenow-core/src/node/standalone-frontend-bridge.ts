/**
 * WebSocket bridge for standalone frontend
 * Provides vscode-ws-jsonrpc compatible endpoint for writenow-frontend
 */

import * as http from 'node:http';
import { inject, injectable } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { ILogger, LoggerFactory } from '@theia/core/lib/common/logger';
import * as WebSocket from 'ws';
import { WritenowBackendService } from './writenow-backend-service';

const STANDALONE_WS_PATH = '/standalone-rpc';

/**
 * Bridge between standalone frontend and Theia backend services
 * Why: Enable independent frontend to call backend services via standard WebSocket JSON-RPC
 */
@injectable()
export class StandaloneFrontendBridge implements BackendApplicationContribution {
    protected readonly logger: ILogger;
    protected wss: WebSocket.Server | undefined;

    constructor(
        @inject(LoggerFactory) loggerFactory: LoggerFactory,
        @inject(WritenowBackendService) protected readonly backendService: WritenowBackendService,
    ) {
        this.logger = loggerFactory('standalone-bridge');
    }

    onStart(server: http.Server): void {
        this.wss = new WebSocket.Server({
            server,
            path: STANDALONE_WS_PATH,
        });

        this.wss.on('connection', (ws: WebSocket) => {
            this.logger.info('Standalone frontend connected');

            ws.on('message', async (data: WebSocket.Data) => {
                try {
                    const message = JSON.parse(data.toString());
                    await this.handleMessage(ws, message);
                } catch (error) {
                    this.logger.error('Failed to handle message', error);
                    this.sendError(ws, null, 'INTERNAL', 'Failed to process message');
                }
            });

            ws.on('close', () => {
                this.logger.info('Standalone frontend disconnected');
            });

            ws.on('error', (error) => {
                this.logger.error('WebSocket error', error);
            });
        });

        this.logger.info(`Standalone frontend bridge listening on ${STANDALONE_WS_PATH}`);
    }

    /**
     * Handle incoming JSON-RPC message
     */
    private async handleMessage(ws: WebSocket, message: { id?: number | string; method?: string; params?: unknown[] }): Promise<void> {
        const { id, method, params } = message;

        this.logger.info(`Received message: method=${method}, params=${JSON.stringify(params)}`);

        if (method !== 'invoke') {
            this.sendError(ws, id, 'INVALID_ARGUMENT', `Expected method 'invoke', got '${method}'`);
            return;
        }

        if (!Array.isArray(params)) {
            this.sendError(ws, id, 'INVALID_ARGUMENT', `Expected params to be an array, got ${typeof params}`);
            return;
        }

        // vscode-ws-jsonrpc wraps params as [[channel, payload]], unwrap it
        let actualParams = params;
        if (params.length === 1 && Array.isArray(params[0])) {
            actualParams = params[0] as unknown[];
        }

        const channel = actualParams[0] as string;
        const payload = actualParams.length > 1 ? actualParams[1] : {};

        if (typeof channel !== 'string') {
            this.sendError(ws, id, 'INVALID_ARGUMENT', `Expected channel to be a string, got ${typeof channel}`);
            return;
        }
        
        try {
            const response = await this.invokeBackendService(channel, payload);
            this.sendResult(ws, id, response);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.sendError(ws, id, 'INTERNAL', errorMessage);
        }
    }

    /**
     * Route channel to backend service via unified invoke method
     */
    private async invokeBackendService(channel: string, payload: unknown): Promise<unknown> {
        // Use the unified invoke method that handles all channels
        return this.backendService.invoke(channel as never, payload);
    }

    private sendResult(ws: WebSocket, id: number | string | null | undefined, result: unknown): void {
        ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id,
            result,
        }));
    }

    private sendError(ws: WebSocket, id: number | string | null | undefined, code: string, message: string): void {
        ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id,
            error: {
                code: -32000,
                message,
                data: { code },
            },
        }));
    }
}
