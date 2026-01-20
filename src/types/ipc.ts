import type { ArticleSnapshot } from './models';

export type IpcChannel =
  | 'file:list'
  | 'file:read'
  | 'file:write'
  | 'file:create'
  | 'file:delete'
  | 'ai:skill:run'
  | 'ai:skill:cancel'
  | 'search:fulltext'
  | 'search:semantic'
  | 'embedding:encode'
  | 'embedding:index'
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
};

export type FileWriteResponse = {
  written: true;
};

export type FileCreateRequest = {
  name: string;
  template?: 'default' | 'blank';
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

export type IpcInvokePayloadMap = {
  'file:list': FileListRequest;
  'file:read': FileReadRequest;
  'file:write': FileWriteRequest;
  'file:create': FileCreateRequest;
  'file:delete': FileDeleteRequest;
  'ai:skill:run': AiSkillRunRequest;
  'ai:skill:cancel': AiSkillCancelRequest;
  'search:fulltext': SearchFulltextRequest;
  'search:semantic': SearchSemanticRequest;
  'embedding:encode': EmbeddingEncodeRequest;
  'embedding:index': EmbeddingIndexRequest;
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
  'ai:skill:run': AiSkillRunResponse;
  'ai:skill:cancel': AiSkillCancelResponse;
  'search:fulltext': SearchFulltextResponse;
  'search:semantic': SearchSemanticResponse;
  'embedding:encode': EmbeddingEncodeResponse;
  'embedding:index': EmbeddingIndexResponse;
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
