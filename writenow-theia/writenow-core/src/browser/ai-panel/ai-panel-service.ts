import { inject, injectable } from '@theia/core/shared/inversify';
import { Emitter, Event } from '@theia/core/lib/common/event';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging/ws-connection-provider';

import type { AiSkillCancelRequest, AiSkillCancelResponse, AiSkillRunRequest, AiSkillRunResponse, IpcResponse, SkillListRequest, SkillListResponse, SkillReadRequest, SkillReadResponse } from '../../common/ipc-generated';
import {
    WRITENOW_AI_RPC_PATH,
    WRITENOW_SKILLS_RPC_PATH,
    type AiServiceClient,
    type AiStreamEvent,
    type AIService,
    type SkillsService,
} from '../../common/writenow-protocol';

/**
 * Backend facade for the AI Panel.
 *
 * Why: The widget needs (1) request/response calls and (2) streaming event notifications. We wrap Theia's JSON-RPC
 * proxy creation here so the widget only deals with typed methods + a local `Event`.
 */
@injectable()
export class AiPanelService {
    private readonly ai: AIService;
    private readonly skills: SkillsService;

    private readonly onDidReceiveStreamEventEmitter = new Emitter<AiStreamEvent>();
    readonly onDidReceiveStreamEvent: Event<AiStreamEvent> = this.onDidReceiveStreamEventEmitter.event;

    constructor(@inject(WebSocketConnectionProvider) connectionProvider: WebSocketConnectionProvider) {
        const client: AiServiceClient = {
            onStreamEvent: (event) => this.onDidReceiveStreamEventEmitter.fire(event),
        };

        // Why: Pass a client object so the backend can push stream notifications over the same WebSocket channel.
        this.ai = connectionProvider.createProxy<AIService>(WRITENOW_AI_RPC_PATH, client);
        this.skills = connectionProvider.createProxy<SkillsService>(WRITENOW_SKILLS_RPC_PATH);
    }

    listSkills(request: SkillListRequest): Promise<IpcResponse<SkillListResponse>> {
        return this.skills.listSkills(request);
    }

    getSkill(request: SkillReadRequest): Promise<IpcResponse<SkillReadResponse>> {
        return this.skills.getSkill(request);
    }

    executeSkill(request: AiSkillRunRequest): Promise<IpcResponse<AiSkillRunResponse>> {
        return this.ai.executeSkill(request);
    }

    streamResponse(request: AiSkillRunRequest): Promise<IpcResponse<AiSkillRunResponse>> {
        return this.ai.streamResponse(request);
    }

    cancel(request: AiSkillCancelRequest): Promise<IpcResponse<AiSkillCancelResponse>> {
        return this.ai.cancel(request);
    }
}

