/**
 * WebSocket bridge for standalone frontend
 * Provides vscode-ws-jsonrpc compatible endpoint for writenow-frontend
 */

import * as http from 'node:http';
import { inject, injectable } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { ILogger, LoggerFactory } from '@theia/core/lib/common/logger';
import * as WebSocket from 'ws';

import type { IpcResponse } from '../common/ipc-generated';
import {
    AIService as AIServiceToken,
    SkillsService as SkillsServiceToken,
    type AIService,
    type AiServiceClient,
    type AiStreamEvent,
    type SkillsService,
} from '../common/writenow-protocol';
import { WritenowBackendService } from './writenow-backend-service';

const STANDALONE_WS_PATH = '/standalone-rpc';

type JsonRpcId = number | string | null;

/**
 * Bridge between standalone frontend and Theia backend services
 * Why: Enable independent frontend to call backend services via standard WebSocket JSON-RPC
 */
@injectable()
export class StandaloneFrontendBridge implements BackendApplicationContribution {
    protected readonly logger: ILogger;
    protected wss: WebSocket.Server | undefined;

    private readonly connections = new Set<WebSocket>();
    private aiClientAttached = false;

    private readonly aiClient: AiServiceClient = {
        onStreamEvent: (event) => this.broadcastAiStreamEvent(event),
    };

    constructor(
        @inject(LoggerFactory) loggerFactory: LoggerFactory,
        @inject(WritenowBackendService) protected readonly backendService: WritenowBackendService,
        @inject(AIServiceToken) protected readonly aiService: AIService,
        @inject(SkillsServiceToken) protected readonly skillsService: SkillsService,
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
            this.connections.add(ws);
            this.ensureAiClientAttached();

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
                this.connections.delete(ws);
                this.maybeDetachAiClient();
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
    private async handleMessage(ws: WebSocket, message: unknown): Promise<void> {
        if (!message || typeof message !== 'object') return;

        const record = message as { id?: unknown; method?: unknown; params?: unknown };
        const id = this.getJsonRpcId(record.id);
        const method = typeof record.method === 'string' ? record.method : '';
        const params = record.params;

        this.logger.info(`Received message: method=${method}`);

        if (method === 'invoke') {
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
            return;
        }

        if (method === 'listSkills') {
            const result = await this.skillsService.listSkills(params as never);
            this.sendIpcResult(ws, id, result);
            return;
        }

        if (method === 'getSkill') {
            const result = await this.skillsService.getSkill(params as never);
            this.sendIpcResult(ws, id, result);
            return;
        }

        if (method === 'streamResponse') {
            const result = await this.aiService.streamResponse(params as never);
            this.sendIpcResult(ws, id, result);
            return;
        }

        if (method === 'executeSkill') {
            const result = await this.aiService.executeSkill(params as never);
            this.sendIpcResult(ws, id, result);
            return;
        }

        if (method === 'cancel') {
            const result = await this.aiService.cancel(params as never);
            this.sendIpcResult(ws, id, result);
            return;
        }

        this.sendIpcResult(ws, id, { ok: false, error: { code: 'INVALID_ARGUMENT', message: `Unknown method: ${method}` } });
    }

    /**
     * Route channel to backend service via unified invoke method
     */
    private async invokeBackendService(channel: string, payload: unknown): Promise<unknown> {
        // Use the unified invoke method that handles all channels
        return this.backendService.invoke(channel as never, payload);
    }

    private ensureAiClientAttached(): void {
        if (this.aiClientAttached) return;
        this.aiClientAttached = true;
        try {
            this.aiService.setClient(this.aiClient);
        } catch (error) {
            this.aiClientAttached = false;
            this.logger.error('Failed to attach AI client', error);
        }
    }

    private maybeDetachAiClient(): void {
        if (this.connections.size > 0) return;
        if (!this.aiClientAttached) return;
        this.aiClientAttached = false;
        try {
            this.aiService.setClient(undefined);
        } catch (error) {
            this.logger.error('Failed to detach AI client', error);
        }
    }

    private broadcastAiStreamEvent(event: AiStreamEvent): void {
        const payload = JSON.stringify({ jsonrpc: '2.0', method: 'onStreamEvent', params: event });
        for (const ws of this.connections) {
            if (ws.readyState !== WebSocket.OPEN) continue;
            try {
                ws.send(payload);
            } catch (error) {
                this.logger.debug?.(
                    `[standalone-ai] failed to send stream event (${event.type}:${event.runId}): ${error instanceof Error ? error.message : String(error)}`,
                );
            }
        }
    }

    private getJsonRpcId(value: unknown): JsonRpcId | null {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string') return value;
        if (value === null) return null;
        return null;
    }

    private sendIpcResult(ws: WebSocket, id: JsonRpcId | null, result: IpcResponse<unknown>): void {
        if (id === null) return;
        this.sendResult(ws, id, result);
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
