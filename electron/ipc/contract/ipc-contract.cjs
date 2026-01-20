const BASE_TYPES = `
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
`;

const IPC_CHANNEL_TYPES = `
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
  sourceArticleId?: string | null;
  updatedAt?: string | null;
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

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type Project = {
  id: string;
  name: string;
  description?: string;
  styleGuide?: string;
  createdAt: string;
  updatedAt: string;
};

export type Character = {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  traits?: JsonValue;
  relationships?: JsonValue;
  createdAt: string;
  updatedAt: string;
};

export type OutlineNode = {
  id: string;
  title: string;
  level: number;
  summary?: string;
  status?: string;
};

export type KnowledgeGraphEntity = {
  id: string;
  projectId: string;
  type: string;
  name: string;
  description?: string;
  metadata?: JsonValue;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeGraphRelation = {
  id: string;
  projectId: string;
  fromEntityId: string;
  toEntityId: string;
  type: string;
  metadata?: JsonValue;
  createdAt: string;
  updatedAt: string;
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

export type OutlineGetRequest = {
  projectId: string;
  articleId: string;
};

export type OutlineGetResponse = {
  outline: OutlineNode[] | null;
  updatedAt?: string;
};

export type OutlineSaveRequest = {
  projectId: string;
  articleId: string;
  outline: OutlineNode[];
};

export type OutlineSaveResponse = {
  saved: true;
  updatedAt: string;
};

export type KgGraphGetRequest = {
  projectId: string;
};

export type KgGraphGetResponse = {
  entities: KnowledgeGraphEntity[];
  relations: KnowledgeGraphRelation[];
};

export type KgEntityListRequest = {
  projectId: string;
};

export type KgEntityListResponse = {
  entities: KnowledgeGraphEntity[];
};

export type KgEntityCreateRequest = {
  projectId: string;
  type: string;
  name: string;
  description?: string;
  metadata?: JsonValue;
};

export type KgEntityCreateResponse = {
  entity: KnowledgeGraphEntity;
};

export type KgEntityUpdateRequest = {
  projectId: string;
  id: string;
  type?: string;
  name?: string;
  description?: string;
  metadata?: JsonValue;
};

export type KgEntityUpdateResponse = {
  entity: KnowledgeGraphEntity;
};

export type KgEntityDeleteRequest = {
  projectId: string;
  id: string;
};

export type KgEntityDeleteResponse = {
  deleted: true;
};

export type KgRelationListRequest = {
  projectId: string;
  entityId?: string;
};

export type KgRelationListResponse = {
  relations: KnowledgeGraphRelation[];
};

export type KgRelationCreateRequest = {
  projectId: string;
  fromEntityId: string;
  toEntityId: string;
  type: string;
  metadata?: JsonValue;
};

export type KgRelationCreateResponse = {
  relation: KnowledgeGraphRelation;
};

export type KgRelationDeleteRequest = {
  projectId: string;
  id: string;
};

export type KgRelationDeleteResponse = {
  deleted: true;
};

export type VersionListItem = {
  id: string;
  articleId: string;
  name?: string;
  reason?: string;
  actor: 'user' | 'ai' | 'auto';
  createdAt: string;
};

export type VersionListRequest = {
  articleId: string;
  limit?: number;
  cursor?: string;
};

export type VersionListResponse = Paginated<VersionListItem>;

export type VersionCreateRequest = {
  articleId: string;
  content?: string;
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

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not_available'
  | 'downloading'
  | 'downloaded'
  | 'error';

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
`;

module.exports = {
  BASE_TYPES,
  IPC_CHANNEL_TYPES,
};
