# API Contract：IPC 契约规范

## Purpose

本规范定义 WriteNow **渲染进程（Renderer）** 与 **主进程（Main）** 之间的 IPC（Electron `ipcRenderer.invoke` / `ipcMain.handle`）契约：
- IPC 通道命名规则（`domain:action`）
- 请求参数与响应数据的 TypeScript 类型
- 统一的成功/错误响应格式（Envelope）
- 统一的错误码（Error Codes）
- 分页响应结构（如适用）

本规范是 **“代码与测试必须遵循的单一事实来源（SSOT）”**。任何新增/变更 IPC 通道必须先更新本规范与 `src/types/ipc.ts`，再实现代码。

## Requirements

### Requirement: IPC 通道命名 MUST 遵循 `domain:action`

IPC 通道命名 MUST 稳定、可读、可扩展；并 MUST 使用小写 `:` 分段格式（如 `file:read`、`ai:skill:run`）。

#### Scenario: 新增通道遵循命名规则
- **WHEN** 任何新增 IPC 通道被引入
- **THEN** 通道名 MUST 为 `domain:action`（允许多段）且全小写
- **AND THEN** `domain` MUST 属于既定领域：`file | ai | search | embedding | version | update | export | clipboard`

### Requirement: `ipcRenderer.invoke` 返回值 MUST 使用统一 Envelope

所有 invoke 通道的返回值 MUST 使用 `ok/data` 与 `ok/error` 的统一 Envelope；并 MUST 禁止随意返回数组/字符串导致协议漂移。

#### Scenario: 成功响应结构一致
- **WHEN** 主进程成功处理任意 invoke 请求
- **THEN** 返回值 MUST 为 `{ ok: true, data: <typed-data> }`

#### Scenario: 错误响应结构一致且可诊断
- **WHEN** 主进程处理任意 invoke 请求发生可预期或不可预期错误
- **THEN** 返回值 MUST 为 `{ ok: false, error: { code, message, details? } }`
- **AND THEN** `details` MUST 为可序列化 JSON 值且不得包含敏感信息

### Requirement: 错误码 MUST 稳定且集中定义

错误码 MUST 为稳定字符串（UPPER_SNAKE_CASE）。新增错误码 MUST 先更新本规范与 `src/types/ipc.ts`。

#### Scenario: 参数校验失败映射为 `INVALID_ARGUMENT`
- **WHEN** 渲染进程传入 payload 不满足参数约束（缺字段/类型错误/非法值）
- **THEN** MUST 返回 `error.code = "INVALID_ARGUMENT"`

### Requirement: 本规范 MUST 覆盖指定通道并定义类型

本规范 MUST 覆盖以下通道并给出请求/响应类型：
- `file:list/read/write/create/delete`
- `ai:skill:run/cancel`
- `search:fulltext/semantic`
- `embedding:encode/index`
- `version:list/create/restore/diff`
- `update:check/download/install/getState/skipVersion/clearSkipped`
- `export:markdown/docx/pdf`
- `clipboard:writeText/writeHtml`

#### Scenario: 覆盖范围完整
- **WHEN** 规范被校验或实现准备接入 IPC
- **THEN** 上述所有通道 MUST 在本规范中存在可引用的 TypeScript 类型定义

## Naming

- 通道命名 MUST 使用 `domain:action`，必要时允许多段：`ai:skill:run`
- 全部小写；段之间以 `:` 分隔；不得包含空格
- `domain` MUST 为稳定领域名之一：`file | ai | search | embedding | version | update | export | clipboard`
- 同一通道的请求/响应类型命名 MUST 与通道保持一致（见下文）

## Transport & Envelope

### Transport

渲染进程调用方式：

```ts
const res = await window.writenow.invoke('file:read', { path: 'xxx.md' })
```

### Envelope（通用响应格式）

所有 `ipcRenderer.invoke` 的返回值 MUST 统一为如下 Envelope。禁止“有的通道返回数组/字符串、有的通道返回对象”的漂移。

```ts
export type IpcResponse<TData> = IpcOk<TData> | IpcErr

export type IpcOk<TData> = {
  ok: true
  data: TData
  meta?: IpcMeta
}

export type IpcErr = {
  ok: false
  error: IpcError
  meta?: IpcMeta
}

export type IpcMeta = {
  requestId: string
  ts: number // epoch ms
}

export type IpcError = {
  code: IpcErrorCode
  message: string
  details?: unknown
  retryable?: boolean
}
```

### Error model（错误响应格式）

- 主进程 MUST 捕获内部异常并映射为 `IpcErr`，不得将不稳定的 `Error.stack` 作为协议字段。
- 渲染进程 MUST 以 `ok` 分支处理成功/失败；不得依赖异常字符串做逻辑分支。
- `details` 仅用于调试与诊断，必须为可序列化的 JSON 值（`unknown`），且不得包含敏感信息（token、path 全路径等）。

## Pagination（分页响应结构）

对可能产生大量结果的通道（如 `search:*`、`version:list`）建议使用统一分页结构：

```ts
export type PageInfo = {
  limit: number
  cursor?: string
  nextCursor?: string
  total?: number
}

export type Paginated<TItem> = {
  items: TItem[]
  page: PageInfo
}
```

## Error Codes（统一错误码）

错误码 MUST 为稳定字符串（UPPER_SNAKE_CASE）。新增错误码必须先更新本节。

```ts
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
  | 'INTERNAL'
```

建议映射策略：
- 参数校验失败 → `INVALID_ARGUMENT`
- 资源不存在 → `NOT_FOUND`
- 重复创建/命名冲突 → `ALREADY_EXISTS | CONFLICT`
- 文件/网络/系统 I/O 异常 → `IO_ERROR`
- SQLite/FTS5/sqlite-vec 异常 → `DB_ERROR`
- Embedding 模型未加载/不可用 → `MODEL_NOT_READY`
- AI 服务商错误/中转站错误 → `UPSTREAM_ERROR`
- 用户取消 → `CANCELED`
- 未分类异常 → `INTERNAL`

---

## Channels（通道定义）

> 说明：以下均定义 **Envelope 内的 `data`** 结构，即 `IpcResponse<...>` 的 `TData`。

### File（文件）

#### `file:list`

获取文档目录内的文件列表。

```ts
export type FileListRequest = {
  // 预留：未来支持子目录/项目空间
  scope?: 'documents'
}

export type DocumentFileListItem = {
  name: string
  path: string
  createdAt: number // epoch ms
  wordCount: number
}

export type FileListResponse = {
  items: DocumentFileListItem[]
}
```

Errors:
- `IO_ERROR`

#### `file:read`

读取单个文档内容。

```ts
export type FileReadRequest = {
  path: string
}

export type FileReadResponse = {
  content: string
  encoding: 'utf8'
}
```

Errors:
- `INVALID_ARGUMENT`（path 非法）
- `NOT_FOUND`
- `IO_ERROR`

#### `file:write`

写入文档内容（用于手动保存/自动保存）。

```ts
export type FileWriteRequest = {
  path: string
  content: string
  encoding?: 'utf8'
}

export type FileWriteResponse = {
  written: true
}
```

Errors:
- `INVALID_ARGUMENT`
- `NOT_FOUND`
- `IO_ERROR`

#### `file:create`

创建一个新文档。

```ts
export type FileCreateRequest = {
  name: string
  template?: 'default' | 'blank'
}

export type FileCreateResponse = {
  name: string
  path: string
}
```

Errors:
- `INVALID_ARGUMENT`
- `ALREADY_EXISTS | CONFLICT`
- `IO_ERROR`

#### `file:delete`

删除一个文档。

```ts
export type FileDeleteRequest = {
  path: string
}

export type FileDeleteResponse = {
  deleted: true
}
```

Errors:
- `INVALID_ARGUMENT`
- `NOT_FOUND`
- `IO_ERROR`

#### `file:session:status`

获取上一次会话是否为非正常退出（用于崩溃恢复提示）。

```ts
export type FileSessionStatusRequest = {}

export type FileSessionStatusResponse = {
  uncleanExitDetected: boolean
}
```

Errors:
- `IO_ERROR`

#### `file:snapshot:write`

为指定文档写入一份快照（用于崩溃恢复）。

```ts
export type SnapshotReason = 'auto' | 'manual'

export type FileSnapshotWriteRequest = {
  path: string
  content: string
  reason?: SnapshotReason
}

export type FileSnapshotWriteResponse = {
  snapshotId: string
}
```

Errors:
- `INVALID_ARGUMENT`
- `IO_ERROR`

#### `file:snapshot:latest`

读取最近的一份快照；当 `path` 省略时返回所有文档中的“最近一份”。

```ts
export type DocumentSnapshot = {
  id: string
  path: string
  createdAt: number // epoch ms
  reason: SnapshotReason
  content: string
}

export type FileSnapshotLatestRequest = {
  path?: string
}

export type FileSnapshotLatestResponse = {
  snapshot: DocumentSnapshot | null
}
```

Errors:
- `INVALID_ARGUMENT`
- `IO_ERROR`

---

### AI（技能）

#### `ai:skill:run`

执行一个 SKILL。支持流式输出：当 `stream=true` 时，主进程应以事件方式推送增量（事件通道与结构见 `src/types/ai.ts`）。

```ts
export type AiSkillRunRequest = {
  skillId: string
  input: {
    text: string
    language?: 'zh-CN' | 'en'
  }
  context?: {
    projectId?: string
    articleId?: string
  }
  stream?: boolean
}

export type AiSkillRunResponse = {
  runId: string
  stream: boolean
}
```

Errors:
- `INVALID_ARGUMENT`
- `NOT_FOUND`（skillId 不存在）
- `RATE_LIMITED | TIMEOUT | UPSTREAM_ERROR`
- `CANCELED`

#### `ai:skill:cancel`

取消一个 SKILL 执行。

```ts
export type AiSkillCancelRequest = {
  runId: string
}

export type AiSkillCancelResponse = {
  canceled: true
}
```

Errors:
- `INVALID_ARGUMENT`
- `NOT_FOUND`
- `CONFLICT`（无法取消：已完成/已取消）

---

### Search（搜索）

#### `search:fulltext`

基于 SQLite FTS5 的全文搜索。

```ts
export type SearchFulltextRequest = {
  query: string
  projectId?: string
  limit?: number
  cursor?: string
}

export type SearchHit = {
  id: string
  title: string
  snippet: string
  score?: number
}

export type SearchFulltextResponse = Paginated<SearchHit>
```

Errors:
- `INVALID_ARGUMENT`
- `DB_ERROR`

#### `search:semantic`

基于 embedding + sqlite-vec 的语义搜索。

```ts
export type SearchSemanticRequest = {
  query: string
  projectId?: string
  limit?: number
  cursor?: string
  threshold?: number // 0~1, 越高越严格
}

export type SearchSemanticHit = {
  id: string
  title: string
  snippet: string
  score: number
}

export type SearchSemanticResponse = Paginated<SearchSemanticHit>
```

Errors:
- `INVALID_ARGUMENT`
- `MODEL_NOT_READY | DB_ERROR`

---

### Embedding（向量）

#### `embedding:encode`

文本转向量。

```ts
export type EmbeddingEncodeRequest = {
  texts: string[]
  model?: 'text2vec-base-chinese'
}

export type EmbeddingEncodeResponse = {
  model: 'text2vec-base-chinese'
  dimension: number
  vectors: number[][]
}
```

Errors:
- `INVALID_ARGUMENT`
- `MODEL_NOT_READY`
- `INTERNAL`

#### `embedding:index`

建立/更新向量索引。

```ts
export type EmbeddingIndexItem = {
  id: string
  text: string
}

export type EmbeddingIndexRequest = {
  namespace: 'articles'
  items: EmbeddingIndexItem[]
  model?: 'text2vec-base-chinese'
}

export type EmbeddingIndexResponse = {
  indexedCount: number
  dimension: number
}
```

Errors:
- `INVALID_ARGUMENT`
- `MODEL_NOT_READY | DB_ERROR`

---

### Version（版本历史）

#### `version:list`

获取文章版本列表。

```ts
export type VersionListRequest = {
  articleId: string
  limit?: number
  cursor?: string
}

export type ArticleSnapshot = {
  id: string
  articleId: string
  content: string
  name?: string
  reason?: string
  actor: 'user' | 'ai' | 'auto'
  createdAt: string // ISO
}

export type VersionListResponse = Paginated<Omit<ArticleSnapshot, 'content'>>
```

Errors:
- `INVALID_ARGUMENT`
- `NOT_FOUND`
- `DB_ERROR`

#### `version:create`

为文章创建一个快照。

```ts
export type VersionCreateRequest = {
  articleId: string
  content?: string // 可选：用渲染进程当前编辑器内容创建快照
  name?: string
  reason?: string
  actor?: 'user' | 'ai' | 'auto'
}

export type VersionCreateResponse = {
  snapshotId: string
}
```

Errors:
- `INVALID_ARGUMENT`
- `NOT_FOUND`
- `DB_ERROR`

#### `version:restore`

将文章恢复到某个快照。

```ts
export type VersionRestoreRequest = {
  snapshotId: string
}

export type VersionRestoreResponse = {
  articleId: string
  content: string
}
```

Errors:
- `INVALID_ARGUMENT`
- `NOT_FOUND`
- `DB_ERROR`

#### `version:diff`

获取两个快照之间的差异（统一 diff 文本）。

```ts
export type VersionDiffRequest = {
  fromSnapshotId: string
  toSnapshotId: string
}

export type VersionDiffResponse = {
  format: 'unified'
  diff: string
}
```

Errors:
- `INVALID_ARGUMENT`
- `NOT_FOUND`
- `DB_ERROR`

---

### Update（更新）

#### `update:check`

检查是否有可用更新。

```ts
export type UpdateCheckRequest = {
  channel?: 'stable' | 'beta'
  allowPrerelease?: boolean
}

export type UpdateInfo = {
  version: string
  notes?: string
  publishedAt: string // ISO
}

export type UpdateCheckResponse = {
  currentVersion: string
  available: boolean
  latest?: UpdateInfo
}
```

Errors:
- `INVALID_ARGUMENT`
- `UPSTREAM_ERROR | TIMEOUT`

#### `update:download`

下载更新包（异步；进度事件见实现约定）。

```ts
export type UpdateDownloadRequest = {
  version: string
}

export type UpdateDownloadResponse = {
  downloadId: string
}
```

Errors:
- `INVALID_ARGUMENT`
- `UPSTREAM_ERROR | IO_ERROR | TIMEOUT`

#### `update:install`

安装更新包（可能触发重启）。

```ts
export type UpdateInstallRequest = {
  downloadId: string
}

export type UpdateInstallResponse = {
  willRestart: boolean
}
```

Errors:
- `INVALID_ARGUMENT`
- `NOT_FOUND`
- `CONFLICT`
- `IO_ERROR | UPSTREAM_ERROR`

#### `update:getState`

获取当前更新状态（供 UI 订阅/展示）。

```ts
export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not_available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export type UpdateProgress = {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

export type UpdateStateError = {
  code: IpcErrorCode
  message: string
  details?: unknown
  retryable?: boolean
}

export type UpdateState = {
  status: UpdateStatus
  currentVersion: string
  lastCheckedAt?: string // ISO
  latest?: UpdateInfo
  skippedVersion?: string | null
  downloadId?: string
  progress?: UpdateProgress
  error?: UpdateStateError
}

export type UpdateGetStateRequest = {}

export type UpdateGetStateResponse = UpdateState
```

Errors:
- `INTERNAL`

#### `update:skipVersion`

跳过指定版本（该版本范围内不再提示；可通过 `update:clearSkipped` 清除）。

```ts
export type UpdateSkipVersionRequest = {
  version: string
}

export type UpdateSkipVersionResponse = {
  skippedVersion: string
}
```

Errors:
- `INVALID_ARGUMENT`

#### `update:clearSkipped`

清除“跳过版本”状态。

```ts
export type UpdateClearSkippedRequest = {}

export type UpdateClearSkippedResponse = {
  cleared: true
}
```

Errors:
- `INTERNAL`

---

### Export（导出）

#### `export:markdown`

导出当前文档为 Markdown（`.md`）。

```ts
export type ExportMarkdownRequest = {
  title: string
  content: string
}

export type ExportMarkdownResponse = {
  path: string
}
```

Errors:
- `INVALID_ARGUMENT`
- `CANCELED`
- `PERMISSION_DENIED | IO_ERROR`

#### `export:docx`

导出当前文档为 Word（`.docx`）。

```ts
export type ExportDocxRequest = {
  title: string
  content: string
}

export type ExportDocxResponse = {
  path: string
}
```

Errors:
- `INVALID_ARGUMENT`
- `CANCELED`
- `PERMISSION_DENIED | IO_ERROR`
- `INTERNAL`

#### `export:pdf`

导出当前文档为 PDF（`.pdf`）。

```ts
export type ExportPdfRequest = {
  title: string
  content: string
}

export type ExportPdfResponse = {
  path: string
}
```

Errors:
- `INVALID_ARGUMENT`
- `CANCELED`
- `PERMISSION_DENIED | IO_ERROR`
- `INTERNAL`

---

### Clipboard（剪贴板）

#### `clipboard:writeText`

写入剪贴板纯文本。

```ts
export type ClipboardWriteTextRequest = {
  text: string
}

export type ClipboardWriteTextResponse = {
  written: true
}
```

Errors:
- `INVALID_ARGUMENT`
- `INTERNAL`

#### `clipboard:writeHtml`

写入剪贴板 HTML（可附带纯文本 fallback）。

```ts
export type ClipboardWriteHtmlRequest = {
  html: string
  text?: string
}

export type ClipboardWriteHtmlResponse = {
  written: true
}
```

Errors:
- `INVALID_ARGUMENT`
- `INTERNAL`

---

## References

- IPC 通道列表来源：`openspec/specs/writenow-spec/spec.md` 第 715-750 行
