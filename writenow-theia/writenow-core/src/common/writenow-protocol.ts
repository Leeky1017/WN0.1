import type {
    AiSkillCancelRequest,
    AiSkillCancelResponse,
    AiSkillRunRequest,
    AiSkillRunResponse,
    FileCreateRequest,
    FileCreateResponse,
    FileDeleteRequest,
    FileDeleteResponse,
    FileListRequest,
    FileListResponse,
    FileReadRequest,
    FileReadResponse,
    FileSessionStatusResponse,
    FileWriteRequest,
    FileWriteResponse,
    IpcChannel,
    IpcError,
    IpcResponse,
    ProjectBootstrapResponse,
    ProjectCreateRequest,
    ProjectCreateResponse,
    ProjectDeleteRequest,
    ProjectDeleteResponse,
    ProjectGetCurrentResponse,
    ProjectListResponse,
    ProjectSetCurrentRequest,
    ProjectSetCurrentResponse,
    ProjectUpdateRequest,
    ProjectUpdateResponse,
    RagEntityCard,
    RagRetrieveRequest,
    RagRetrieveResponse,
    SkillListRequest,
    SkillListResponse,
    SkillReadRequest,
    SkillReadResponse,
    VersionCreateRequest,
    VersionCreateResponse,
    VersionDiffRequest,
    VersionDiffResponse,
    VersionListRequest,
    VersionListResponse,
    VersionRestoreRequest,
    VersionRestoreResponse,
} from './ipc-generated';

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

export const WRITENOW_AI_RPC_PATH = '/services/writenow/ai';
export const AIService = Symbol('AIService');

export type AiStreamEvent =
    | { type: 'delta'; runId: string; text: string }
    | { type: 'done'; runId: string; result: { text: string; meta?: unknown } }
    | { type: 'error'; runId: string; error: IpcError };

export interface AiServiceClient {
    /**
     * Why: Theia JSON-RPC calls are request/response; streaming requires backend->frontend notifications.
     * Failure semantics: MUST NOT throw; callers should treat missing events as a recoverable transport issue.
     */
    onStreamEvent(event: AiStreamEvent): void;
}

export interface AIService {
    /**
     * Why: Allow the backend to push streaming deltas over the existing Theia WebSocket messaging layer.
     */
    setClient(client: AiServiceClient | undefined): void;

    /**
     * Why: Execute a SKILL request without incremental deltas (backend will still emit a single `done` event).
     * Failure semantics: MUST return `IpcResponse` and MUST NOT throw across the RPC boundary.
     */
    executeSkill(request: AiSkillRunRequest): Promise<IpcResponse<AiSkillRunResponse>>;

    /**
     * Why: Execute a SKILL request with streaming deltas (`delta` events) followed by a terminal `done`/`error`.
     * Failure semantics: MUST return `IpcResponse` and MUST NOT throw across the RPC boundary.
     */
    streamResponse(request: AiSkillRunRequest): Promise<IpcResponse<AiSkillRunResponse>>;

    /**
     * Why: Users must be able to stop generation; cancellation must clear pending state deterministically.
     * Failure semantics: MUST return `IpcResponse` and MUST NOT throw across the RPC boundary.
     */
    cancel(request: AiSkillCancelRequest): Promise<IpcResponse<AiSkillCancelResponse>>;
}

export const WRITENOW_SKILLS_RPC_PATH = '/services/writenow/skills';
export const SkillsService = Symbol('SkillsService');

export interface SkillsService {
    /**
     * Why: The AI Panel needs a stable, typed entrypoint to list available skills.
     * Failure semantics: MUST return `IpcResponse` and MUST NOT throw across the RPC boundary.
     */
    listSkills(request: SkillListRequest): Promise<IpcResponse<SkillListResponse>>;

    /**
     * Why: The AI Panel needs access to a single skill definition (for debugging / future prompt viewers).
     * Failure semantics: MUST return `IpcResponse` and MUST NOT throw across the RPC boundary.
     */
    getSkill(request: SkillReadRequest): Promise<IpcResponse<SkillReadResponse>>;
}

export const EmbeddingService = Symbol('EmbeddingService');

export interface EmbeddingService {
    /**
     * Why: Semantic search and RAG require a stable, local embedding primitive in the Theia backend.
     *
     * Failure semantics: MUST throw `ipcError`-shaped errors so `WritenowBackendService` can map them to
     * `IpcResponse` without leaking stacks across the RPC boundary.
     */
    encode(texts: readonly string[]): Promise<{ vectors: number[][]; dimension: number }>;
}

export interface ProjectsServiceContract {
    bootstrap(): Promise<ProjectBootstrapResponse>;
    list(): Promise<ProjectListResponse>;
    getCurrent(): Promise<ProjectGetCurrentResponse>;
    setCurrent(request: ProjectSetCurrentRequest): Promise<ProjectSetCurrentResponse>;
    create(request: ProjectCreateRequest): Promise<ProjectCreateResponse>;
    update(request: ProjectUpdateRequest): Promise<ProjectUpdateResponse>;
    delete(request: ProjectDeleteRequest): Promise<ProjectDeleteResponse>;
}

export interface FilesServiceContract {
    sessionStatus(): Promise<FileSessionStatusResponse>;
    list(request: FileListRequest): Promise<FileListResponse>;
    read(request: FileReadRequest): Promise<FileReadResponse>;
    write(request: FileWriteRequest): Promise<FileWriteResponse>;
    create(request: FileCreateRequest): Promise<FileCreateResponse>;
    delete(request: FileDeleteRequest): Promise<FileDeleteResponse>;
}

export interface VersionServiceContract {
    list(request: VersionListRequest): Promise<VersionListResponse>;
    create(request: VersionCreateRequest): Promise<VersionCreateResponse>;
    restore(request: VersionRestoreRequest): Promise<VersionRestoreResponse>;
    diff(request: VersionDiffRequest): Promise<VersionDiffResponse>;
}

export interface IndexServiceContract {
    /**
     * Why: Provide explicit indexing entrypoints so the frontend can force a refresh
     * (e.g. after bulk imports or when recovering from failures).
     */
    indexArticle(articleId: string): Promise<{ queued: true }>;

    /**
     * Why: Project-level indexing is the minimal closure for Theia workspace integration; it can be wired
     * to watcher start/ensure flows later without changing the contract shape.
     */
    indexProject(projectId: string): Promise<{ queued: number }>;
}

export interface RetrievalServiceContract {
    retrieveContext(request: RagRetrieveRequest): Promise<RagRetrieveResponse>;

    /**
     * Why: Some UI flows only need entity cards (e.g. autocomplete). When semantic embeddings are unavailable,
     * implementations should fall back to exact/FTS recall and return stable `MODEL_NOT_READY` for semantic-only calls.
     */
    searchEntities(queryText: string): Promise<{ characters: RagEntityCard[]; settings: RagEntityCard[] }>;
}
