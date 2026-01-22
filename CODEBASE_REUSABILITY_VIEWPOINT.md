# WriteNow 代码复用评估：严谨复核后的观点（基于代码实情）

> 目标：对 `codebase-reusability-assessment.md.resolved` 的结论做 **代码层面交叉验证**，并给出更可落地的复用/适配判断与风险清单。  
> 代码基线：`main` 分支 `2df022a`（2026-01-22）。  
> 注：本文不“跑分式拍脑袋”，关键判断尽量给出 **代码证据点（文件/行号）**，并明确“哪些结论需要 PoC 才能定案”。

---

## 0) 总结结论（更严谨版本）

我对原报告的总体判断是：**方向对，但“复用率”与“工期”略偏乐观**；最大的偏差来自“真实耦合点”没有被展开量化：

1. **IPC 层复用比报告更强**：当前 IPC handlers 已经支持 `handleInvoke` 注入（不是死绑 `ipcMain.handle`），且 IPC 合约/allowlist 有自动生成与漂移检测，这对迁移到 Theia 的 RPC 机制极其友好。关键参考：`scripts/ipc-contract-sync.js`、`electron/preload.cjs`、`electron/main.cjs`、各 `electron/ipc/*.cjs`。
2. **存储模型是迁移“真正的根问题”**：WN 不是 workspace-first，而是 **Electron userData 下的单一 documents 目录 + DB 中按 projectId 过滤**，并且 `.writenow` 结构落在 `userData/projects/<projectId>/.writenow`。这与 Theia 的 workspace/file explorer 语义存在结构性差异，影响的不只是 `files.cjs`，而是 UI、项目概念、索引器、watcher、E2E 测试。关键参考：`electron/ipc/files.cjs`、`electron/ipc/projects.cjs`、`electron/ipc/context.cjs`、相关 E2E。
3. **本地向量与本地 LLM 的 native 风险被低估**：`better-sqlite3`、`sqlite-vec`、`node-llama-cpp` 都是跨平台分发的硬骨头；即使业务逻辑复用率高，**打包/分发/兼容性验证**也可能吞掉大量时间。

因此：我仍然同意“后端可复用、前端需重写”为主的结论，但更建议把迁移拆成 **（1）存储语义对齐 PoC（2）native 依赖可用性 PoC（3）TipTap 集成 PoC** 三条主线先定生死。

### 0.1 证据索引（高频引用，便于快速核对）

- IPC 统一错误边界与 `IpcResponse`：`electron/main.cjs:98`、`electron/main.cjs:117`
- IPC contract 生成/漂移检测：`scripts/ipc-contract-sync.js:73`、`scripts/ipc-contract-sync.js:152`
- preload invoke allowlist：`electron/preload.cjs:3`、`electron/preload.cjs:104`
- documents 存储位置与 `handleInvoke` 注入：`electron/ipc/files.cjs:10`、`electron/ipc/files.cjs:111`
- 项目 bootstrap + 文章 project_id 迁移：`electron/ipc/projects.cjs:88`
- `.writenow` 项目结构与 watch：`electron/ipc/context.cjs:37`、`electron/ipc/context.cjs:618`
- sqlite-vec 扩展加载 + vec0 建表：`electron/lib/vector-store.cjs:46`、`electron/lib/vector-store.cjs:79`
- Embedding 超时语义：`electron/lib/embedding-service.cjs:78`、`electron/lib/embedding-service.cjs:87`
- Embedding 资产选择（AVX512/VNNI）：`electron/lib/embedding-worker.cjs:156`、`electron/lib/embedding-worker.cjs:170`
- 本地 LLM 依赖（node-llama-cpp）：`electron/lib/llm-runtime.cjs:13`
- renderer 类型化 invoke 与 `IpcError`：`src/lib/ipc.ts:24`、`src/lib/ipc.ts:32`
- editor snapshot 定时落盘：`src/components/Editor/index.tsx:379`、`src/components/Editor/index.tsx:399`
- E2E debug API（`__WN_E2E__`）：`src/main.tsx:23`、`src/main.tsx:56`
- E2E 真实持久化验收（文件+DB）：`tests/e2e/app-launch.spec.ts:12`、`tests/e2e/app-launch.spec.ts:35`

---

## 1) 代码量与结构：对报告数据的复核

原报告给出（electron 约 10.5k 行，src 约 26.8k 行）。以 git tracked 文件 `wc -l` 粗算（含空行/注释）：

- `electron/**`：约 **10,874 行**
- `src/**`：约 **30,714 行**

差异原因通常来自：统计口径不同（是否含空行/注释/测试、是否 cloc）。数量级一致，但 `src` 实际略大于报告。

报告提到的“105 个组件 / 16 个 store / IPC 18 个文件”在当前代码基线是准确的：

- `src/components/**`：105 个文件
- `src/stores/**`：16 个文件
- `electron/ipc/*.cjs`：18 个（另有 `electron/ipc/contract/ipc-contract.cjs`）

---

## 2) IPC：当前实现比报告描述“更可迁移”

### 2.1 IPC 合约与 allowlist 的工程化程度（强资产）

WN 的 IPC 有一条清晰的 contract pipeline：

- 合约定义（类型基座 + channel payload/response 类型）：`electron/ipc/contract/ipc-contract.cjs`
- 合约同步与漂移检测：`scripts/ipc-contract-sync.js`
  - 从 `electron/ipc/*.cjs` 提取 `handleInvoke('channel', ...)` 的 channel 集合
  - 生成 `src/types/ipc-generated.ts`（`IpcChannel` 联合类型 + payload/response map）
  - 同时更新 `electron/preload.cjs` 的 invoke allowlist
- 预加载层强制 allowlist：`electron/preload.cjs`
- renderer 侧类型化 invoke：`src/lib/ipc.ts`（`ok: false` → 抛 `IpcError(code/details/retryable)`）

我在当前代码基线执行了 `npm run contract:check`，结果为 **exit 0**（说明 contract、preload allowlist、`ipc-generated.ts` 无漂移）。

迁移含义：这条 pipeline 在 Theia 上完全可复用（“transport”换成 JSON-RPC/贡献点即可），反而能作为迁移期“稳定契约”帮助前后端联调。

### 2.2 IPC handlers 已经支持“注入式注册”（迁移成本下降）

多数 handler 不是硬写 `ipcMain.handle`，而是允许从外部传入 `options.handleInvoke`，默认才落到 `ipcMain.handle`。

迁移含义：这相当于提前做了“传输层抽象”，Theia 只要提供一个 `handleInvoke` 适配器就能把大多数 handler 平移过去，而不需要在每个文件里重写注册逻辑。

### 2.3 主进程错误边界与错误码（总体正确，但存在可改进点）

`electron/main.cjs` 的 `createInvokeHandler()` 把 handler 的返回值包装为 `{ ok: true, data }`，并 catch 异常映射到稳定错误码（`toIpcError`）。

优点：
- renderer 永远收到可判定的 `IpcResponse`（不会把堆栈穿透到渲染进程）
- handler 内通过 `error.ipcError = { code, message, details }` 抛出稳定错误码（多个 handler 都有 `createIpcError`）

需要注意：
- `electron/main.cjs` 与部分 handler 存在不少 `catch { /* ignore */ }` 的静默路径（例如 broadcast/cleanup）。严格按仓库治理要求这属于“可观测性不足”，迁移到 Theia 后问题会放大（排障更难）。

---

## 3) 后端数据层：schema/RAG/Embedding 复用高，但 native 风险是真风险

### 3.1 SQLite schema 与迁移机制（可复用度很高）

- schema：`electron/database/schema.sql`
- 初始化与迁移：`electron/database/init.cjs`（`SCHEMA_VERSION = 7`，WAL，外键开启，含 FTS rebuild）

迁移含义：schema 基本可以原样复用（Theia backend 仍然是 Node），最大变量来自 **better-sqlite3 的打包/二进制兼容**。

### 3.2 VectorStore（sqlite-vec）：逻辑复用，但“扩展加载/分发”是硬门槛

`electron/lib/vector-store.cjs`：
- 通过 `sqlite-vec` 扩展 `sqliteVec.load(db)` 动态加载
- vec 表（`articles_vec/article_chunks_vec/entity_vec`）不是 `schema.sql` 里建，而是在运行时 `CREATE VIRTUAL TABLE ... USING vec0(...)`
- 维度存储在 `settings['embedding.dimension']`，维度不一致直接 `CONFLICT`（并给出 recovery 提示）

迁移含义：代码复用没问题，但必须提前验证 Theia 的目标运行形态是否允许本地加载 sqlite 扩展，以及跨平台发布时 `sqlite-vec` 的二进制能否稳定随包分发。

### 3.3 EmbeddingService：工程化不错，但存在“CPU/模型文件”隐含风险

`electron/lib/embedding-service.cjs` + `electron/lib/embedding-worker.cjs`：
- `worker_threads` 隔离模型加载与推理
- transformers.js（`@xenova/transformers`）作为 runtime
- 支持离线/在线：`WN_EMBEDDING_ALLOW_REMOTE` 控制是否允许下载
- TIMEOUT 有明确错误码：`WN_EMBEDDING_TIMEOUT_MS`

关键风险点（原报告未展开）：
- worker 端为 text2vec 下载的 ONNX 文件固定为 `model_qint8_avx512_vnni.onnx`（`ensureText2VecAssets()`），这对没有 AVX512/VNNI 的 CPU 可能不兼容；也就是说，不只是“能否下载”，还包括“下载后是否能跑”。

### 3.4 RAG 管线：实现完整，可复用度高

关键模块：
- `electron/lib/rag/indexer.cjs`：拆段、写 `article_chunks`、写 vec、解析 entity cards
- `electron/lib/rag/retrieval.cjs`：entity（显式/包含/语义兜底）+ passages（语义 + FTS keyword recall）+ budget 控制

迁移含义：如果 sqlite-vec + embedding 可用，RAG 这块几乎可以原样搬。

### 3.5 L2 Judge（node-llama-cpp）：复用取决于 native 能否落地

`electron/lib/llm-runtime.cjs` 动态 import `node-llama-cpp` 并用 JSON grammar 输出约束结果。  
迁移风险不在“代码怎么改”，而在 **目标平台能否稳定安装/打包/执行**。

---

## 4) 前端：UI 需要重写，但“逻辑资产”比报告写的更可复用

### 4.1 编辑器现状：Markdown 是 SSOT，RichText 是视图

`src/components/Editor/index.tsx` 的核心事实：
- SSOT 是 markdown 字符串（Zustand store `editorStore` 存 `content`）
- richtext 模式用 TipTap，但 `onUpdate` 会 `editor.getMarkdown()` 回写 store
- autosave：`useDebouncedSave`（2s）→ `editorStore.save()` → `fileOps.write(path, content, { projectId })`
- snapshot：定时 `fileOps.snapshotWrite(path, content, 'auto')`，默认 5min，可通过 preload 暴露的 `window.writenow.snapshotIntervalMs` 覆盖

迁移含义：TipTap 集成风险仍成立，但 SSOT 已经是 markdown，这让迁移时“内容一致性”更容易保证。

### 4.2 Zustand 与 Theia DI：确实需要重构

例如 `src/stores/editorStore.ts`：
- 保存时会读取 `useProjectsStore.getState().currentProjectId`（store 间耦合）
- save coalescing（`saveInFlightByTabId/queuedSaveByTabId`）是可复用的业务逻辑，但实现依赖 Zustand 结构

迁移含义：UI 与 store 层要重写，但其中一些不变量（例如防并发写、保存合并）值得保留。

### 4.3 AI 面板：事件流与 ContextAssembler 是主要可复用资产

`src/components/AIPanel.tsx`：
- 监听 `window.writenow.on('ai:skill:stream', ...)` 处理 streaming delta/done/error
- prompt 组装与 debug 主要在 `src/stores/aiStore.ts` 与 `src/lib/context/**`

迁移含义：Theia 需要一个等价的 event/stream 通道，但 ContextAssembler、budget、conversation 持久化逻辑可直接复用。

### 4.4 UI 组件复用：需要按 Theia UI 体系重新接线

- `src/components/ui/**`（shadcn 风格）在 Theia 环境不一定能直接用
- `ActivityBar/TitleBar/StatusBar/SidebarPanel` 等 Electron-自绘窗口控件在 Theia 中大概率由框架接管或重做

---

## 5) E2E：现有测试“是真 E2E”，对迁移是加分项

WN 的 E2E 测试（`tests/e2e/**`）具备几个关键特征：

- Playwright `_electron` 启动真实应用（`WN_E2E=1` + 隔离 `WN_USER_DATA_DIR`）
- 验证真实文件与真实 DB（例如 `tests/e2e/app-launch.spec.ts`）
- 部分测试从 renderer 侧 `window.writenow.invoke(...)` 调 IPC（例如 `tests/e2e/sprint-3-rag.spec.ts`），但依旧走真实 main 进程与真实持久化
- E2E debug API：`WN_E2E=1` 时 renderer 暴露 `window.__WN_E2E__`（`src/main.tsx`）用于观测 ContextAssembler/summary 等内部行为（不是 stub）

迁移含义：迁移到 Theia 后，这套“黑盒驱动 + 持久化验收”的思路值得保留；但如果存储语义改变（workspace-first），相当比例 E2E 需要同步重写，这本身就是迁移成本的一部分。

---

## 6) 对原报告的“校正/补充清单”（必须算进排期）

### 6.1 原报告遗漏但影响巨大的事实

1. IPC 是可注入注册的（`handleInvoke` pattern），迁移成本更低。
2. IPC 合约与 preload allowlist 是自动同步的（contract pipeline），可作为迁移期稳定契约层。
3. Skill 系统核心不只在 `ipc/skills.cjs`，还有 `electron/services/skills/SkillIndexService.cjs`（watch + index + override 优先级）。
4. Embedding 选用的 ONNX 资产存在 CPU 特性假设（AVX512/VNNI），需要兼容性策略。

### 6.2 更合理的“复用率”表达（避免用单一百分比误导）

更建议按维度拆解：

- 业务逻辑复用：高（DB CRUD/RAG/ContextAssembler/Skill parsing 等）
- 框架耦合复用：中（IPC transport、watcher、window event stream 需要适配）
- 分发/运行时复用：不确定（native 模块、模型资产、跨平台二进制）
- UI 复用：低到中（React 组件可搬，但要重接 Theia widget/layout/commands）

---

## 7) 我建议的 PoC 顺序（用最短路径验证最大风险）

按“是否会推翻整体方案”的优先级：

1. Theia + TipTap 的输入/焦点/快捷键 PoC（决定前端路线是否可行）
2. Theia backend 中 better-sqlite3 + sqlite-vec 的加载与查询 PoC（决定 RAG/语义搜索是否可落地）
3. Embedding 模型资产在目标 CPU/OS 上的可用性 PoC（决定本地 embedding 的产品可用性）
4. node-llama-cpp 在目标环境的可用性 PoC（决定 judge 是否能保留为本地推理）
5. 存储语义对齐 PoC：把当前 userData 模型映射到 workspace-first（或明确继续 userData-first，并接受与 Theia file explorer 的张力）

---

## 8) 最终结论

原报告“后端高复用、前端重写”的大方向正确，但要把迁移成败点从“代码搬运”升级到“三个硬门槛”：

1) 存储语义（userData-first vs workspace-first）  
2) native 依赖/模型资产的分发与兼容（sqlite-vec / transformers / llama）  
3) 编辑器集成体验（TipTap 与 Theia 的焦点/快捷键/性能）

只要这三件事通过 PoC，后端与核心业务逻辑的复用会非常顺畅；否则，任何“85% 复用率/9-13 周”的乐观估算都会在真实环境落地时被反复打脸。
