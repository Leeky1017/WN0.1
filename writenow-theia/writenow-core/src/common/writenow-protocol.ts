import type {
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
