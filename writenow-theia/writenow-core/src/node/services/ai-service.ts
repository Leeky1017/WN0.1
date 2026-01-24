import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';

import type {
    AiSkillCancelRequest,
    AiSkillCancelResponse,
    AiSkillRunRequest,
    AiSkillRunResponse,
    IpcError,
    IpcErrorCode,
    IpcResponse,
} from '../../common/ipc-generated';
import type { AiServiceClient, AIService as AIServiceShape, AiStreamEvent } from '../../common/writenow-protocol';
import { WritenowSqliteDb } from '../database/writenow-sqlite-db';

type RunState = {
    controller: AbortController;
    status: 'streaming' | 'canceled';
};

type AnthropicCtor = typeof import('@anthropic-ai/sdk').default;

const Anthropic = require('@anthropic-ai/sdk') as unknown as AnthropicCtor;

function ipcOk<TData>(data: TData): IpcResponse<TData> {
    return { ok: true, data };
}

function ipcErr<TData>(error: IpcError): IpcResponse<TData> {
    return { ok: false, error };
}

function coerceString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

/**
 * Ensures prompt fields are strings without mutating the content.
 * Why: The UI/ContextAssembler is the SSOT for prompt bytes; backend must not trim/normalize prompt content.
 */
function requirePromptString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
        throw { ipcError: { code: 'INVALID_ARGUMENT', message: `Invalid ${fieldName}`, details: { fieldName } } };
    }
    if (!value.trim()) {
        throw { ipcError: { code: 'INVALID_ARGUMENT', message: `${fieldName} is empty`, details: { fieldName } } };
    }
    return value;
}

function fnv1a32Hex(text: string): string {
    const raw = typeof text === 'string' ? text : '';
    let hash = 0x811c9dc5;
    for (let i = 0; i < raw.length; i += 1) {
        hash ^= raw.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

function nowIso(): string {
    return new Date().toISOString();
}

function generateRunId(): string {
    const rand = Math.random().toString(16).slice(2, 10);
    return `ai_${Date.now()}_${rand}`;
}

function resolveNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function resolveMaxTokens(): number {
    const env = resolveNumber(process.env.WN_AI_MAX_TOKENS);
    if (env && env > 0) return Math.floor(env);
    return 1024;
}

function resolveTemperature(): number {
    const env = resolveNumber(process.env.WN_AI_TEMPERATURE);
    if (env !== null) return Math.min(2, Math.max(0, env));
    return 0.4;
}

function resolveTimeoutMs(): number {
    const env = resolveNumber(process.env.WN_AI_TIMEOUT_MS);
    if (env && env > 0) return Math.floor(env);
    return 10 * 60 * 1000;
}

function resolveBaseUrl(): string {
    const env = coerceString(process.env.WN_AI_BASE_URL) || coerceString(process.env.ANTHROPIC_BASE_URL);
    return env || 'https://api.anthropic.com';
}

function resolveApiKey(): string | null {
    const env = coerceString(process.env.WN_AI_API_KEY) || coerceString(process.env.ANTHROPIC_API_KEY);
    return env || null;
}

function resolveModel(fallback: string | null): string {
    const env = coerceString(process.env.WN_AI_MODEL);
    return env || fallback || 'claude-3-5-sonnet-latest';
}

function toStreamError(error: unknown): IpcError {
    if (!error || typeof error !== 'object') return { code: 'INTERNAL', message: 'Internal error' };

    const name = typeof (error as { name?: unknown }).name === 'string' ? ((error as { name?: unknown }).name as string) : '';
    const rawMessage = typeof (error as { message?: unknown }).message === 'string' ? coerceString((error as { message?: unknown }).message) : '';
    const code = typeof (error as { code?: unknown }).code === 'string' ? coerceString((error as { code?: unknown }).code) : '';
    const status = typeof (error as { status?: unknown }).status === 'number' ? ((error as { status?: unknown }).status as number) : null;

    // Why: AbortController cancellation may surface as either Anthropic's wrapper error or the underlying fetch abort.
    // We normalize all abort signals to the stable `CANCELED` IPC error code so the UI can clear pending state.
    if (
        name === 'APIUserAbortError' ||
        name === 'AbortError' ||
        code === 'ABORT_ERR' ||
        rawMessage.toLowerCase().includes('aborted')
    ) {
        return { code: 'CANCELED', message: 'Canceled', details: { at: nowIso() } };
    }
    if (name === 'RateLimitError') return { code: 'RATE_LIMITED', message: 'Rate limited', details: { at: nowIso() } };
    if (name === 'APIConnectionTimeoutError') return { code: 'TIMEOUT', message: 'Request timed out', details: { at: nowIso() } };
    if (name === 'AuthenticationError' || name === 'PermissionDeniedError') {
        return { code: 'PERMISSION_DENIED', message: 'Authentication failed', details: { at: nowIso() } };
    }

    // Why: Some SDK errors do not expose stable `name`s, but still include HTTP status.
    if (status === 401 || status === 403) {
        return { code: 'PERMISSION_DENIED', message: 'Authentication failed', details: { status, at: nowIso() } };
    }
    if (status === 429) {
        return { code: 'RATE_LIMITED', message: 'Rate limited', details: { status, at: nowIso() } };
    }

    return { code: 'UPSTREAM_ERROR', message: rawMessage || 'Upstream error', ...(status ? { details: { status } } : {}) };
}

function safeSkillRow(value: unknown): {
    id: string;
    enabled: boolean;
    valid: boolean;
    errorCode: string | null;
    errorMessage: string | null;
    systemPrompt: string;
    userTemplate: string;
    model: string | null;
} | null {
    const record = value as {
        id?: unknown;
        enabled?: unknown;
        is_valid?: unknown;
        error_code?: unknown;
        error_message?: unknown;
        system_prompt?: unknown;
        user_prompt_template?: unknown;
        model?: unknown;
    };

    const id = coerceString(record.id);
    if (!id) return null;

    return {
        id,
        enabled: record.enabled === 0 ? false : true,
        valid: record.is_valid === 0 ? false : true,
        errorCode: coerceString(record.error_code) || null,
        errorMessage: coerceString(record.error_message) || null,
        systemPrompt: typeof record.system_prompt === 'string' ? record.system_prompt : '',
        userTemplate: typeof record.user_prompt_template === 'string' ? record.user_prompt_template : '',
        model: coerceString(record.model) || null,
    };
}

@injectable()
export class AiService implements AIServiceShape {
    private client: AiServiceClient | undefined;
    private readonly runs = new Map<string, RunState>();

    constructor(
        @inject(ILogger) private readonly logger: ILogger,
        @inject(WritenowSqliteDb) private readonly sqliteDb: WritenowSqliteDb,
    ) {}

    setClient(client: AiServiceClient | undefined): void {
        this.client = client;
    }

    async executeSkill(request: AiSkillRunRequest): Promise<IpcResponse<AiSkillRunResponse>> {
        return this.runSkill(request, { stream: false });
    }

    async streamResponse(request: AiSkillRunRequest): Promise<IpcResponse<AiSkillRunResponse>> {
        return this.runSkill(request, { stream: true });
    }

    async cancel(request: AiSkillCancelRequest): Promise<IpcResponse<AiSkillCancelResponse>> {
        try {
            const runId = coerceString(request?.runId);
            if (!runId) return ipcErr({ code: 'INVALID_ARGUMENT', message: 'Invalid runId', details: { runId: request?.runId } });

            const run = this.runs.get(runId);
            if (!run) return ipcErr({ code: 'NOT_FOUND', message: 'Run not found', details: { runId } });
            if (run.status !== 'streaming') return ipcErr({ code: 'CONFLICT', message: 'Run is not cancelable', details: { runId, status: run.status } });

            run.status = 'canceled';
            run.controller.abort();
            this.logger.info(`[ai] run canceled: ${runId}`);

            return ipcOk({ canceled: true });
        } catch (error) {
            this.logger.error(`[ai] cancel failed: ${error instanceof Error ? error.message : String(error)}`);
            return ipcErr({ code: 'INTERNAL', message: 'Failed to cancel run' });
        }
    }

    private async runSkill(request: AiSkillRunRequest, options: { stream: boolean }): Promise<IpcResponse<AiSkillRunResponse>> {
        if (!this.client) {
            return ipcErr({ code: 'CONFLICT', message: 'AI client is not connected' });
        }

        const skillId = coerceString(request?.skillId);
        if (!skillId) return ipcErr({ code: 'INVALID_ARGUMENT', message: 'Invalid skillId', details: { skillId: request?.skillId } });

        const inputText = typeof request?.input?.text === 'string' ? request.input.text : '';
        if (!inputText.trim()) return ipcErr({ code: 'INVALID_ARGUMENT', message: 'Input text is empty' });

        let systemPrompt: string;
        let userContent: string;
        try {
            systemPrompt = requirePromptString(request?.prompt?.systemPrompt, 'prompt.systemPrompt');
            userContent = requirePromptString(request?.prompt?.userContent, 'prompt.userContent');
        } catch (error) {
            const ipcError = error && typeof error === 'object' ? (error as { ipcError?: unknown }).ipcError : null;
            if (ipcError && typeof ipcError === 'object') {
                const record = ipcError as { code?: unknown; message?: unknown; details?: unknown };
                const code = typeof record.code === 'string' ? (record.code as IpcErrorCode) : 'INVALID_ARGUMENT';
                const message = typeof record.message === 'string' ? record.message : 'Invalid prompt';
                return ipcErr({ code, message, ...(typeof record.details === 'undefined' ? {} : { details: record.details }) });
            }
            return ipcErr({ code: 'INVALID_ARGUMENT', message: 'Invalid prompt' });
        }

        const db = this.sqliteDb.db;
        const row = db
            .prepare(
                `SELECT id, enabled, is_valid, error_code, error_message, system_prompt, user_prompt_template, model
                 FROM skills
                 WHERE id = ?`,
            )
            .get(skillId);
        const skillRow = safeSkillRow(row);
        if (!skillRow) return ipcErr({ code: 'NOT_FOUND', message: 'Skill not found', details: { skillId } });
        if (!skillRow.enabled) return ipcErr({ code: 'CONFLICT', message: 'Skill is disabled', details: { skillId } });
        if (!skillRow.valid) {
            return ipcErr({
                code: 'INVALID_ARGUMENT',
                message: 'Skill is invalid',
                details: {
                    skillId,
                    error: { code: skillRow.errorCode || 'INVALID_ARGUMENT', message: skillRow.errorMessage || 'Invalid skill' },
                },
            });
        }

        const apiKey = resolveApiKey();
        if (!apiKey) return ipcErr({ code: 'INVALID_ARGUMENT', message: 'AI API key is not configured', details: { provider: 'anthropic' } });

        const runId = generateRunId();
        const controller = new AbortController();
        this.runs.set(runId, { controller, status: 'streaming' });

        const prefixHash = fnv1a32Hex(systemPrompt);
        const promptHash = fnv1a32Hex(`${systemPrompt}\n\n---\n\n${userContent}`);

        const injectedMemory = Array.isArray(request?.injected?.memory) ? request.injected.memory : [];
        const model = resolveModel(skillRow.model);
        const temperature = resolveTemperature();
        const maxTokens = resolveMaxTokens();
        const timeoutMs = resolveTimeoutMs();
        const baseUrl = resolveBaseUrl();

        // Fire-and-forget streaming work; the RPC response only acknowledges start.
        void this.runAnthropic({
            runId,
            controller,
            stream: options.stream,
            systemPrompt,
            userContent,
            model,
            maxTokens,
            temperature,
            timeoutMs,
            baseUrl,
            apiKey,
        });

        return ipcOk({ runId, stream: options.stream, injected: { memory: injectedMemory }, prompt: { prefixHash, promptHash } });
    }

    private async runAnthropic(args: {
        runId: string;
        controller: AbortController;
        stream: boolean;
        systemPrompt: string;
        userContent: string;
        model: string;
        maxTokens: number;
        temperature: number;
        timeoutMs: number;
        baseUrl: string;
        apiKey: string;
    }): Promise<void> {
        const { runId, controller } = args;

        try {
            const client = new Anthropic({
                apiKey: args.apiKey,
                baseURL: args.baseUrl,
                timeout: args.timeoutMs,
            });
            const user = args.userContent;

            if (args.stream) {
                const runner = client.messages.stream(
                    {
                        model: args.model,
                        max_tokens: args.maxTokens,
                        temperature: args.temperature,
                        system: args.systemPrompt,
                        messages: [{ role: 'user', content: user }],
                    },
                    { signal: controller.signal },
                );

                let assembled = '';
                runner.on('text', (delta: unknown) => {
                    if (typeof delta !== 'string' || !delta) return;
                    assembled += delta;
                    this.emit({ type: 'delta', runId, text: delta });
                });

                await runner.done();
                const finalText = coerceString(assembled) || coerceString(await runner.finalText().catch(() => ''));

                this.emit({
                    type: 'done',
                    runId,
                    result: { text: finalText, meta: { provider: 'anthropic', model: args.model } },
                });
            } else {
                const resp = await client.messages.create(
                    {
                        model: args.model,
                        max_tokens: args.maxTokens,
                        temperature: args.temperature,
                        system: args.systemPrompt,
                        messages: [{ role: 'user', content: user }],
                    },
                    { signal: controller.signal },
                );

                const blocks = Array.isArray(resp?.content) ? resp.content : [];
                const text = blocks
                    .filter(
                        (b: unknown) =>
                            Boolean(b) &&
                            (b as { type?: unknown }).type === 'text' &&
                            typeof (b as { text?: unknown }).text === 'string',
                    )
                    .map((b: unknown) => (b as { text: string }).text)
                    .join('')
                    .trim();

                this.emit({
                    type: 'done',
                    runId,
                    result: { text, meta: { provider: 'anthropic', model: args.model } },
                });
            }
        } catch (error) {
            const streamError = toStreamError(error);
            this.logger.error(`[ai] run error: ${runId} (${streamError.code}) ${streamError.message}`);
            this.emit({ type: 'error', runId, error: streamError });
        } finally {
            this.runs.delete(runId);
        }
    }

    private emit(event: AiStreamEvent): void {
        try {
            this.client?.onStreamEvent(event);
        } catch (error) {
            this.logger.debug?.(`[ai] stream event send failed: ${event.type} (${event.runId}) ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Note: Context assembly / RAG injection is handled by the frontend ContextAssembler (ported from the legacy app),
    // so the backend only enforces stable validation + streaming semantics.
}
