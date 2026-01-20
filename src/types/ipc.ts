import type { ArticleSnapshot, Character, JsonValue, Project } from './models';

export type IpcChannel =
  | 'file:list'
  | 'file:read'
  | 'file:write'
  | 'file:create'
  | 'file:delete'
  | 'file:session:status'
  | 'file:snapshot:write'
  | 'file:snapshot:latest'
  | 'ai:skill:run'
  | 'ai:skill:cancel'
  | 'search:fulltext'
  | 'search:semantic'
  | 'embedding:encode'
  | 'embedding:index'
  | 'rag:retrieve'
  | 'project:bootstrap'
  | 'project:list'
  | 'project:getCurrent'
  | 'project:setCurrent'
  | 'project:create'
  | 'project:update'
  | 'project:delete'
  | 'character:list'
  | 'character:create'
  | 'character:update'
  | 'character:delete'
  | 'version:list'
  | 'version:create'
  | 'version:restore'
  | 'version:diff'
  | 'update:check'
  | 'update:download'
  | 'update:install'
  | 'update:getState'
  | 'update:skipVersion'
  | 'update:clearSkipped'
  | 'export:markdown'
  | 'export:docx'
  | 'export:pdf'
  | 'clipboard:writeText'
  | 'clipboard:writeHtml';

export type IpcErrorCode =
  | 'INVALID_ARGUMENT'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'CONFLICT'
  | 'PERMISSION_DENIED'
  | 'UNSUPPORTED'
  | 'IO_ERROR'
  | 'DB_ERROR'
  | 'MODEL_NOT_READY'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'CANCELED'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL';

export type IpcMeta = {
  requestId: string;
  ts: number;
};

export type IpcError = {
  code: IpcErrorCode;
  message: string;
  details?: unknown;
  retryable?: boolean;
};

export type IpcOk<TData> = {
  ok: true;
  data: TData;
  meta?: IpcMeta;
};

export type IpcErr = {
  ok: false;
  error: IpcError;
  meta?: IpcMeta;
};

export type IpcResponse<TData> = IpcOk<TData> | IpcErr;

export type PageInfo = {
  limit: number;
  cursor?: string;
  nextCursor?: string;
  total?: number;
};

export type Paginated<TItem> = {
  items: TItem[];
  page: PageInfo;
};

export type FileListRequest = {
  scope?: 'documents';
  projectId?: string;
};

export type DocumentFileListItem = {
  name: string;
  path: string;
  createdAt: number;
  wordCount: number;
};

export type FileListResponse = {
  items: DocumentFileListItem[];
};

export type FileReadRequest = {
  path: string;
};

export type FileReadResponse = {
  content: string;
  encoding: 'utf8';
};

export type FileWriteRequest = {
  path: string;
  content: string;
  encoding?: 'utf8';
  projectId?: string;
};

export type FileWriteResponse = {
  written: true;
};

export type FileCreateRequest = {
  name: string;
  template?: 'default' | 'blank';
  projectId?: string;
};

export type FileCreateResponse = {
  name: string;
  path: string;
};

export type FileDeleteRequest = {
  path: string;
};

export type FileDeleteResponse = {
  deleted: true;
};

export type FileSessionStatusRequest = Record<string, never>;

export type FileSessionStatusResponse = {
  uncleanExitDetected: boolean;
};

export type SnapshotReason = 'auto' | 'manual';

export type DocumentSnapshot = {
  id: string;
  path: string;
  createdAt: number;
  reason: SnapshotReason;
  content: string;
};

export type FileSnapshotWriteRequest = {
  path: string;
  content: string;
  reason?: SnapshotReason;
};

export type FileSnapshotWriteResponse = {
  snapshotId: string;
};

export type FileSnapshotLatestRequest = {
  path?: string;
};

export type FileSnapshotLatestResponse = {
  snapshot: DocumentSnapshot | null;
};

export type AiSkillRunRequest = {
  skillId: string;
  input: {
    text: string;
    language?: 'zh-CN' | 'en';
  };
  context?: {
    projectId?: string;
    articleId?: string;
  };
  stream?: boolean;
};

export type AiSkillRunResponse = {
  runId: string;
  stream: boolean;
};

export type AiSkillCancelRequest = {
  runId: string;
};

export type AiSkillCancelResponse = {
  canceled: true;
};

export type SearchHit = {
  id: string;
  title: string;
  snippet: string;
  score?: number;
};

export type SearchFulltextRequest = {
  query: string;
  projectId?: string;
  limit?: number;
  cursor?: string;
};

export type SearchFulltextResponse = Paginated<SearchHit>;

export type SearchSemanticHit = {
  id: string;
  title: string;
  snippet: string;
  score: number;
};

export type SearchSemanticRequest = {
  query: string;
  projectId?: string;
  limit?: number;
  cursor?: string;
  threshold?: number;
};

export type SearchSemanticResponse = Paginated<SearchSemanticHit>;

export type EmbeddingEncodeRequest = {
  texts: string[];
  model?: 'text2vec-base-chinese';
};

export type EmbeddingEncodeResponse = {
  model: 'text2vec-base-chinese';
  dimension: number;
  vectors: number[][];
};

export type EmbeddingIndexItem = {
  id: string;
  text: string;
};

export type EmbeddingIndexRequest = {
  namespace: 'articles';
  items: EmbeddingIndexItem[];
  model?: 'text2vec-base-chinese';
};

export type EmbeddingIndexResponse = {
  indexedCount: number;
  dimension: number;
};

export type RagBudget = {
  maxChars?: number;
  maxChunks?: number;
  maxCharacters?: number;
  maxSettings?: number;
  cursor?: string;
  threshold?: number;
};

export type RagEntityCard = {
  id: string;
  type: 'character' | 'setting';
  name: string;
  aliases: string[];
  content: string;
  sourceArticleId?: string;
  updatedAt?: string;
  score: number;
};

export type RagPassage = {
  id: string;
  articleId: string;
  title: string;
  idx: number;
  content: string;
  score: number;
  source: {
    articleId: string;
    chunkId: string;
    idx: number;
  };
};

export type RagRetrieveRequest = {
  queryText: string;
  budget?: RagBudget;
};

export type RagRetrieveResponse = {
  query: string;
  characters: RagEntityCard[];
  settings: RagEntityCard[];
  passages: RagPassage[];
  budget: {
    maxChars: number;
    usedChars: number;
    maxChunks: number;
    cursor: string;
    nextCursor?: string;
  };
};

export type VersionListRequest = {
  articleId: string;
  limit?: number;
  cursor?: string;
};

export type VersionListResponse = Paginated<Omit<ArticleSnapshot, 'content'>>;

export type VersionCreateRequest = {
  articleId: string;
  name?: string;
  reason?: string;
  actor?: 'user' | 'ai' | 'auto';
};

export type VersionCreateResponse = {
  snapshotId: string;
};

export type VersionRestoreRequest = {
  snapshotId: string;
};

export type VersionRestoreResponse = {
  articleId: string;
  content: string;
};

export type VersionDiffRequest = {
  fromSnapshotId: string;
  toSnapshotId: string;
};

export type VersionDiffResponse = {
  format: 'unified';
  diff: string;
};

export type UpdateCheckRequest = {
  channel?: 'stable' | 'beta';
  allowPrerelease?: boolean;
};

export type UpdateInfo = {
  version: string;
  notes?: string;
  publishedAt: string;
};

export type UpdateCheckResponse = {
  currentVersion: string;
  available: boolean;
  latest?: UpdateInfo;
};

export type UpdateDownloadRequest = {
  version: string;
};

export type UpdateDownloadResponse = {
  downloadId: string;
};

export type UpdateInstallRequest = {
  downloadId: string;
};

export type UpdateInstallResponse = {
  willRestart: boolean;
};

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'not_available' | 'downloading' | 'downloaded' | 'error';

export type UpdateProgress = {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
};

export type UpdateStateError = {
  code: IpcErrorCode;
  message: string;
  details?: unknown;
  retryable?: boolean;
};

export type UpdateState = {
  status: UpdateStatus;
  currentVersion: string;
  lastCheckedAt?: string;
  latest?: UpdateInfo;
  skippedVersion?: string | null;
  downloadId?: string;
  progress?: UpdateProgress;
  error?: UpdateStateError;
};

export type UpdateGetStateRequest = Record<string, never>;

export type UpdateGetStateResponse = UpdateState;

export type UpdateSkipVersionRequest = {
  version: string;
};

export type UpdateSkipVersionResponse = {
  skippedVersion: string;
};

export type UpdateClearSkippedRequest = Record<string, never>;

export type UpdateClearSkippedResponse = {
  cleared: true;
};

export type ExportMarkdownRequest = {
  title: string;
  content: string;
};

export type ExportMarkdownResponse = {
  path: string;
};

export type ExportDocxRequest = {
  title: string;
  content: string;
};

export type ExportDocxResponse = {
  path: string;
};

export type ExportPdfRequest = {
  title: string;
  content: string;
};

export type ExportPdfResponse = {
  path: string;
};

export type ClipboardWriteTextRequest = {
  text: string;
};

export type ClipboardWriteTextResponse = {
  written: true;
};

export type ClipboardWriteHtmlRequest = {
  html: string;
  text?: string;
};

export type ClipboardWriteHtmlResponse = {
  written: true;
};

export type ProjectBootstrapRequest = Record<string, never>;

export type ProjectBootstrapResponse = {
  createdDefault: boolean;
  currentProjectId: string;
  migratedArticles: number;
};

export type ProjectListRequest = Record<string, never>;

export type ProjectListResponse = {
  projects: Project[];
};

export type ProjectGetCurrentRequest = Record<string, never>;

export type ProjectGetCurrentResponse = {
  projectId: string | null;
};

export type ProjectSetCurrentRequest = {
  projectId: string;
};

export type ProjectSetCurrentResponse = {
  projectId: string;
};

export type ProjectCreateRequest = {
  name: string;
  description?: string;
  styleGuide?: string;
};

export type ProjectCreateResponse = {
  project: Project;
  currentProjectId: string;
};

export type ProjectUpdateRequest = {
  id: string;
  name?: string;
  description?: string;
  styleGuide?: string;
};

export type ProjectUpdateResponse = {
  project: Project;
};

export type ProjectDeleteRequest = {
  id: string;
  reassignProjectId?: string;
};

export type ProjectDeleteResponse = {
  deleted: true;
  currentProjectId: string;
};

export type CharacterListRequest = {
  projectId: string;
};

export type CharacterListResponse = {
  characters: Character[];
};

export type CharacterCreateRequest = {
  projectId: string;
  name: string;
  description?: string;
  traits?: JsonValue;
  relationships?: JsonValue;
};

export type CharacterCreateResponse = {
  character: Character;
};

export type CharacterUpdateRequest = {
  projectId: string;
  id: string;
  name?: string;
  description?: string;
  traits?: JsonValue;
  relationships?: JsonValue;
};

export type CharacterUpdateResponse = {
  character: Character;
};

export type CharacterDeleteRequest = {
  projectId: string;
  id: string;
};

export type CharacterDeleteResponse = {
  deleted: true;
};

export type IpcInvokePayloadMap = {
  'file:list': FileListRequest;
  'file:read': FileReadRequest;
  'file:write': FileWriteRequest;
  'file:create': FileCreateRequest;
  'file:delete': FileDeleteRequest;
  'file:session:status': FileSessionStatusRequest;
  'file:snapshot:write': FileSnapshotWriteRequest;
  'file:snapshot:latest': FileSnapshotLatestRequest;
  'ai:skill:run': AiSkillRunRequest;
  'ai:skill:cancel': AiSkillCancelRequest;
  'search:fulltext': SearchFulltextRequest;
  'search:semantic': SearchSemanticRequest;
  'embedding:encode': EmbeddingEncodeRequest;
  'embedding:index': EmbeddingIndexRequest;
  'rag:retrieve': RagRetrieveRequest;
  'project:bootstrap': ProjectBootstrapRequest;
  'project:list': ProjectListRequest;
  'project:getCurrent': ProjectGetCurrentRequest;
  'project:setCurrent': ProjectSetCurrentRequest;
  'project:create': ProjectCreateRequest;
  'project:update': ProjectUpdateRequest;
  'project:delete': ProjectDeleteRequest;
  'character:list': CharacterListRequest;
  'character:create': CharacterCreateRequest;
  'character:update': CharacterUpdateRequest;
  'character:delete': CharacterDeleteRequest;
  'version:list': VersionListRequest;
  'version:create': VersionCreateRequest;
  'version:restore': VersionRestoreRequest;
  'version:diff': VersionDiffRequest;
  'update:check': UpdateCheckRequest;
  'update:download': UpdateDownloadRequest;
  'update:install': UpdateInstallRequest;
  'update:getState': UpdateGetStateRequest;
  'update:skipVersion': UpdateSkipVersionRequest;
  'update:clearSkipped': UpdateClearSkippedRequest;
  'export:markdown': ExportMarkdownRequest;
  'export:docx': ExportDocxRequest;
  'export:pdf': ExportPdfRequest;
  'clipboard:writeText': ClipboardWriteTextRequest;
  'clipboard:writeHtml': ClipboardWriteHtmlRequest;
};

export type IpcInvokeDataMap = {
  'file:list': FileListResponse;
  'file:read': FileReadResponse;
  'file:write': FileWriteResponse;
  'file:create': FileCreateResponse;
  'file:delete': FileDeleteResponse;
  'file:session:status': FileSessionStatusResponse;
  'file:snapshot:write': FileSnapshotWriteResponse;
  'file:snapshot:latest': FileSnapshotLatestResponse;
  'ai:skill:run': AiSkillRunResponse;
  'ai:skill:cancel': AiSkillCancelResponse;
  'search:fulltext': SearchFulltextResponse;
  'search:semantic': SearchSemanticResponse;
  'embedding:encode': EmbeddingEncodeResponse;
  'embedding:index': EmbeddingIndexResponse;
  'rag:retrieve': RagRetrieveResponse;
  'project:bootstrap': ProjectBootstrapResponse;
  'project:list': ProjectListResponse;
  'project:getCurrent': ProjectGetCurrentResponse;
  'project:setCurrent': ProjectSetCurrentResponse;
  'project:create': ProjectCreateResponse;
  'project:update': ProjectUpdateResponse;
  'project:delete': ProjectDeleteResponse;
  'character:list': CharacterListResponse;
  'character:create': CharacterCreateResponse;
  'character:update': CharacterUpdateResponse;
  'character:delete': CharacterDeleteResponse;
  'version:list': VersionListResponse;
  'version:create': VersionCreateResponse;
  'version:restore': VersionRestoreResponse;
  'version:diff': VersionDiffResponse;
  'update:check': UpdateCheckResponse;
  'update:download': UpdateDownloadResponse;
  'update:install': UpdateInstallResponse;
  'update:getState': UpdateGetStateResponse;
  'update:skipVersion': UpdateSkipVersionResponse;
  'update:clearSkipped': UpdateClearSkippedResponse;
  'export:markdown': ExportMarkdownResponse;
  'export:docx': ExportDocxResponse;
  'export:pdf': ExportPdfResponse;
  'clipboard:writeText': ClipboardWriteTextResponse;
  'clipboard:writeHtml': ClipboardWriteHtmlResponse;
};

export type IpcInvokeResponseMap = {
  [K in IpcChannel]: IpcResponse<IpcInvokeDataMap[K]>;
};
