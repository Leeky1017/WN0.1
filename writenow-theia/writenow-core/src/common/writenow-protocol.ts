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
