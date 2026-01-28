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
  | 'ENCODING_FAILED'
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

export type WritingStatsRow = {
  date: string; // YYYY-MM-DD
  wordCount: number;
  writingMinutes: number;
  articlesCreated: number;
  skillsUsed: number;
};

export type WritingStatsSummary = {
  wordCount: number;
  writingMinutes: number;
  articlesCreated: number;
  skillsUsed: number;
};

export type StatsGetTodayRequest = Record<string, never>;

export type StatsGetTodayResponse = {
  stats: WritingStatsRow;
};

export type StatsGetRangeRequest = {
  startDate: string;
  endDate: string;
};

export type StatsGetRangeResponse = {
  items: WritingStatsRow[];
  summary: WritingStatsSummary;
};

export type StatsIncrementRequest = {
  date?: string;
  increments: {
    wordCount?: number;
    writingMinutes?: number;
    articlesCreated?: number;
    skillsUsed?: number;
  };
};

export type StatsIncrementResponse = {
  stats: WritingStatsRow;
};

export type SkillScope = 'builtin' | 'global' | 'project';

export type SkillListItem = {
  id: string;
  name: string;
  description?: string;
  version?: string;
  scope: SkillScope;
  packageId?: string;
  enabled: boolean;
  valid: boolean;
  error?: { code: IpcErrorCode; message: string };
};

export type SkillListRequest = {
  includeDisabled?: boolean;
};

export type SkillListResponse = {
  skills: SkillListItem[];
};

export type SkillReadRequest = {
  id: string;
};

export type SkillFileDefinition = {
  frontmatter: Record<string, unknown>;
  markdown: string;
};

export type SkillParseError = {
  code: IpcErrorCode;
  message: string;
  details?: unknown;
};

export type SkillReadResponse = {
  skill: SkillListItem & {
    sourceUri: string;
    sourceHash?: string;
    definition?: SkillFileDefinition;
    parseError?: SkillParseError;
    rawText: string;
  };
};

export type SkillToggleRequest = {
  id: string;
  enabled: boolean;
};

export type SkillToggleResponse = {
  id: string;
  enabled: boolean;
};

export type SkillWriteRequest = {
  scope: SkillScope;
  projectId?: string;
  packageId: string;
  packageVersion: string;
  skillSlug: string;
  content: string;
  overwrite?: boolean;
};

export type SkillWriteResponse = {
  written: true;
  sourceUri: string;
};

export type AiPromptPayload = {
  systemPrompt: string;
  userContent: string;
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
  prompt: AiPromptPayload;
  injected?: {
    memory: UserMemory[];
    refs?: string[];
    contextRules?: Record<string, unknown>;
  };
};

export type AiSkillRunResponse = {
  runId: string;
  stream: boolean;
  injected?: {
    memory: UserMemory[];
    refs?: string[];
    contextRules?: Record<string, unknown>;
  };
  prompt?: {
    prefixHash: string;
    stablePrefixHash: string;
    promptHash: string;
  };
};

export type AiSkillCancelRequest = {
  runId: string;
};

export type AiSkillCancelResponse = {
  canceled: true;
};

export type AiSkillFeedbackRequest = {
  runId: string;
  action: 'accept' | 'reject' | 'partial';
  projectId?: string;
  evidenceRef?: JsonValue;
};

export type AiSkillFeedbackResponse = {
  recorded: true;
  feedbackId: string;
  learned: UserMemory[];
  ignored: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// AI Proxy Settings (optional LiteLLM integration)
// ─────────────────────────────────────────────────────────────────────────────

export type AiProxySettings = {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  hasApiKey: boolean;
};

export type AiProxySettingsGetRequest = Record<string, never>;

export type AiProxySettingsGetResponse = {
  settings: AiProxySettings;
};

export type AiProxySettingsUpdateRequest = {
  enabled?: boolean;
  baseUrl?: string;
  apiKey?: string;
};

export type AiProxySettingsUpdateResponse = {
  settings: AiProxySettings;
};

export type AiProxyTestRequest = {
  baseUrl: string;
  apiKey?: string;
};

export type AiProxyTestResponse = {
  success: boolean;
  message: string;
  models?: string[];
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

export type UserMemoryType = 'preference' | 'feedback' | 'style';

export type UserMemoryOrigin = 'manual' | 'learned';

export type UserMemoryEvidence = {
  kind: 'run' | 'file' | 'paragraph' | 'feedback' | 'custom';
  ref: string;
  meta?: JsonValue;
};

export type UserMemory = {
  id: string;
  type: UserMemoryType;
  content: string;
  projectId: string | null;
  origin: UserMemoryOrigin;
  confidence: number;
  evidence: UserMemoryEvidence[];
  metadata: JsonValue;
  revision: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MemoryListRequest = {
  projectId?: string;
  type?: UserMemoryType;
  scope?: 'all' | 'global' | 'project';
  includeGlobal?: boolean;
  includeLearned?: boolean;
  limit?: number;
};

export type MemoryListResponse = {
  items: UserMemory[];
};

export type MemoryCreateRequest = {
  type: UserMemoryType;
  content: string;
  projectId?: string | null;
};

export type MemoryCreateResponse = {
  item: UserMemory;
};

export type MemoryUpdateRequest = {
  id: string;
  type?: UserMemoryType;
  content?: string;
  projectId?: string | null;
};

export type MemoryUpdateResponse = {
  item: UserMemory;
};

export type MemoryDeleteRequest = {
  id: string;
};

export type MemoryDeleteResponse = {
  deleted: true;
};

export type MemorySettings = {
  injectionEnabled: boolean;
  preferenceLearningEnabled: boolean;
  privacyModeEnabled: boolean;
  preferenceLearningThreshold: number;
};

export type MemorySettingsGetRequest = Record<string, never>;

export type MemorySettingsGetResponse = {
  settings: MemorySettings;
};

export type MemorySettingsUpdateRequest = {
  injectionEnabled?: boolean;
  preferenceLearningEnabled?: boolean;
  privacyModeEnabled?: boolean;
  preferenceLearningThreshold?: number;
};

export type MemorySettingsUpdateResponse = {
  settings: MemorySettings;
};

export type MemoryPreferencesIngestRequest = {
  projectId: string;
  signals: {
    accepted: string[];
    rejected: string[];
  };
};

export type MemoryPreferencesIngestResponse = {
  learned: UserMemory[];
  ignored: number;
  settings: MemorySettings;
};

export type MemoryPreferencesClearRequest = {
  scope?: 'learned' | 'all';
};

export type MemoryPreferencesClearResponse = {
  deletedCount: number;
};

export type MemoryInjectionPreviewRequest = {
  projectId?: string;
  queryText?: string;
};

export type MemoryInjectionPreviewResponse = {
  settings: MemorySettings;
  injected: {
    memory: UserMemory[];
    semanticMemory?: UserMemory[];
    recall?: {
      mode: 'deterministic' | 'semantic';
      reason?: 'EMPTY_QUERY' | 'VEC_UNAVAILABLE' | 'DIMENSION_CONFLICT' | 'ENCODING_FAILED' | 'UNKNOWN';
    };
  };
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

export type KgRelationUpdateRequest = {
  projectId: string;
  id: string;
  fromEntityId?: string;
  toEntityId?: string;
  type?: string;
  metadata?: JsonValue;
};

export type KgRelationUpdateResponse = {
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

export type JudgeModelStatus = 'idle' | 'downloading' | 'downloaded' | 'error';

export type JudgeModelProgress = {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
};

export type JudgeModelStateError = {
  code: IpcErrorCode;
  message: string;
  details?: unknown;
  retryable?: boolean;
};

export type JudgeModelState = {
  status: JudgeModelStatus;
  model: {
    name: string;
    filename: string;
    url: string;
    size?: string;
  };
  modelPath: string;
  progress?: JudgeModelProgress;
  error?: JudgeModelStateError;
};

export type JudgeModelGetStateRequest = Record<string, never>;

export type JudgeModelGetStateResponse = JudgeModelState;

export type JudgeModelEnsureRequest = Record<string, never>;

export type JudgeModelEnsureResponse = {
  modelPath: string;
};

export type JudgeL2PromptRequest = {
  prompt: string;
  modelPath?: string;
  timeoutMs?: number;
  temperature?: number;
  maxTokens?: number;
};

export type JudgeL2PromptResponse = {
  output: string;
  durationMs: number;
  modelPath: string;
};

export type ConstraintType = 'forbidden_words' | 'word_count' | 'format' | 'terminology' | 'tone' | 'coverage';

export type ConstraintLevel = 'error' | 'warning' | 'info';

export type ConstraintScope = 'global' | 'project';

export type ConstraintRule = {
  id: string;
  type: ConstraintType;
  enabled: boolean;
  config: Record<string, unknown>;
  level: ConstraintLevel;
  scope: ConstraintScope;
  projectId?: string;
};

export type ConstraintsScopeConfig = {
  l2Enabled: boolean;
  rules: ConstraintRule[];
};

export type ConstraintsConfig = {
  version: number;
  global: ConstraintsScopeConfig;
  projects: Record<string, ConstraintsScopeConfig>;
};

export type ConstraintsGetRequest = Record<string, never>;

export type ConstraintsGetResponse = {
  config: ConstraintsConfig;
};

export type ConstraintsSetRequest = {
  config: ConstraintsConfig;
};

export type ConstraintsSetResponse = {
  saved: true;
  config: ConstraintsConfig;
};

export type ContextWritenowEnsureRequest = {
  projectId: string;
};

export type ContextWritenowEnsureResponse = {
  projectId: string;
  rootPath: string;
  ensured: true;
};

export type ContextWritenowStatusRequest = {
  projectId: string;
};

export type ContextWritenowStatusResponse = {
  projectId: string;
  rootPath: string;
  exists: boolean;
  watching: boolean;
};

export type ContextWritenowWatchStartRequest = {
  projectId: string;
};

export type ContextWritenowWatchStartResponse = {
  watching: true;
};

export type ContextWritenowWatchStopRequest = {
  projectId: string;
};

export type ContextWritenowWatchStopResponse = {
  watching: false;
};

export type WritenowLoaderError = {
  path: string;
  code: IpcErrorCode;
  message: string;
  details?: unknown;
};

export type WritenowRuleFragment = {
  kind: 'style' | 'terminology' | 'constraints';
  path: string;
  content: string;
  updatedAtMs: number | null;
};

export type ContextWritenowRulesGetRequest = {
  projectId: string;
  refresh?: boolean;
};

export type ContextWritenowRulesGetResponse = {
  projectId: string;
  rootPath: string;
  loadedAtMs: number | null;
  fragments: WritenowRuleFragment[];
  errors: WritenowLoaderError[];
};

export type ContextWritenowSettingsListRequest = {
  projectId: string;
  refresh?: boolean;
};

export type ContextWritenowSettingsListResponse = {
  projectId: string;
  rootPath: string;
  loadedAtMs: number | null;
  characters: string[];
  settings: string[];
  errors: WritenowLoaderError[];
};

export type WritenowSettingsFile = {
  path: string;
  content: string;
  updatedAtMs: number | null;
};

export type ContextWritenowSettingsReadRequest = {
  projectId: string;
  characters?: string[];
  settings?: string[];
};

export type ContextWritenowSettingsReadResponse = {
  projectId: string;
  rootPath: string;
  files: WritenowSettingsFile[];
  errors: WritenowLoaderError[];
};

export type WritenowConversationSummaryQuality = 'placeholder' | 'l2' | 'heuristic';

export type WritenowConversationMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type WritenowConversationAnalysis = {
  summary: string;
  summaryQuality: WritenowConversationSummaryQuality;
  keyTopics: string[];
  skillsUsed: string[];
  userPreferences: {
    accepted: string[];
    rejected: string[];
  };
};

export type WritenowConversationRecord = {
  version: 1;
  id: string;
  articleId: string;
  createdAt: string;
  updatedAt: string;
  messages: WritenowConversationMessage[];
  analysis: WritenowConversationAnalysis;
};

export type WritenowConversationIndexItem = {
  id: string;
  articleId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  summary: string;
  summaryQuality: WritenowConversationSummaryQuality;
  keyTopics: string[];
  skillsUsed: string[];
  userPreferences: {
    accepted: string[];
    rejected: string[];
  };
  fullPath: string;
};

export type ContextWritenowConversationsSaveRequest = {
  projectId: string;
  conversation: {
    id?: string;
    articleId: string;
    createdAt?: string;
    updatedAt?: string;
    messages: WritenowConversationMessage[];
    skillsUsed?: string[];
    userPreferences?: {
      accepted?: string[];
      rejected?: string[];
    };
  };
};

export type ContextWritenowConversationsSaveResponse = {
  saved: true;
  index: WritenowConversationIndexItem;
};

export type ContextWritenowConversationsListRequest = {
  projectId: string;
  articleId?: string;
  limit?: number;
};

export type ContextWritenowConversationsListResponse = {
  projectId: string;
  rootPath: string;
  loadedAtMs: number | null;
  items: WritenowConversationIndexItem[];
  errors: WritenowLoaderError[];
};

export type ContextWritenowConversationsReadRequest = {
  projectId: string;
  conversationId: string;
};

export type ContextWritenowConversationsReadResponse = {
  projectId: string;
  rootPath: string;
  conversation: WritenowConversationRecord;
};

export type ContextWritenowConversationsAnalysisUpdateRequest = {
  projectId: string;
  conversationId: string;
  analysis: WritenowConversationAnalysis;
};

export type ContextWritenowConversationsAnalysisUpdateResponse = {
  updated: true;
  index: WritenowConversationIndexItem;
};

export type LocalLlmSettings = {
  enabled: boolean;
  modelId: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
  idleDelayMs: number;
};

export type LocalLlmModelProgress = {
  receivedBytes: number;
  totalBytes?: number;
};

export type LocalLlmModelStateStatus = 'idle' | 'downloading' | 'ready' | 'error';

export type LocalLlmModelState = {
  status: LocalLlmModelStateStatus;
  modelId?: string;
  modelPath?: string;
  progress?: LocalLlmModelProgress;
  error?: IpcError;
};

export type LocalLlmModelDescriptor = {
  id: string;
  label: string;
  filename?: string;
  url?: string;
  sizeBytes?: number;
  sha256?: string;
};

export type LocalLlmModelListRequest = Record<string, never>;

export type LocalLlmModelListResponse = {
  models: LocalLlmModelDescriptor[];
  installedModelIds: string[];
  state: LocalLlmModelState;
  settings: LocalLlmSettings;
};

export type LocalLlmModelEnsureRequest = {
  modelId: string;
  allowDownload: boolean;
};

export type LocalLlmModelEnsureResponse = {
  modelPath: string;
};

export type LocalLlmModelRemoveRequest = {
  modelId: string;
};

export type LocalLlmModelRemoveResponse = {
  removed: true;
};

export type LocalLlmSettingsGetRequest = Record<string, never>;

export type LocalLlmSettingsGetResponse = {
  settings: LocalLlmSettings;
  state: LocalLlmModelState;
};

export type LocalLlmSettingsUpdateRequest = {
  enabled?: boolean;
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  idleDelayMs?: number;
};

export type LocalLlmSettingsUpdateResponse = {
  settings: LocalLlmSettings;
};

export type LocalLlmTabCompleteRequest = {
  prefix: string;
  suffix: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
  stop?: string[];
};

export type LocalLlmTabCompleteResponse = {
  runId: string;
  startedAt: number;
};

export type LocalLlmTabCancelRequest = {
  runId: string;
  reason: 'user' | 'input' | 'timeout';
};

export type LocalLlmTabCancelResponse = {
  canceled: true;
};

export type LocalLlmTabStreamEvent =
  | { type: 'delta'; runId: string; text: string }
  | { type: 'done'; runId: string; result: string; durationMs: number }
  | { type: 'error'; runId: string; error: IpcError };
`;

module.exports = {
  BASE_TYPES,
  IPC_CHANNEL_TYPES,
};
