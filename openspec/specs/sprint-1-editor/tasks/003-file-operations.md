# 任务 003: 文件操作 IPC（创建/读取/保存/删除）

## 目标

在 Electron 主进程实现稳定、安全的文件操作 IPC：提供文件列表、创建、读取、写入保存、删除等能力；渲染进程通过 preload 暴露的 API 访问；保证 Windows 优先、离线可用、路径安全。

## 依赖

- Electron 主进程基础框架已可运行（`electron/main.cjs` + `electron/preload.cjs`）
- （可并行）任务 005：Zustand 文件列表与编辑器状态接入

## 实现步骤

1. 定义 IPC 通道与数据结构（与核心规范一致）：
   - `file:list` → 返回 `{name, path, createdAt, wordCount}[]`
   - `file:read` → 入参 `{path}`，返回 `{content}`
   - `file:write` → 入参 `{path, content}`，返回 `{ok:true}`
   - `file:create` → 入参 `{name}`，返回 `{name, path}`
   - `file:delete` → 入参 `{path}`，返回 `{ok:true}`
2. 主进程实现（建议拆分到 `electron/ipc/files.cjs`）：
   - 文档根目录：`app.getPath('userData')/documents`（或等价位置），启动时确保目录存在
   - 文件名清洗：去除 Windows 不合法字符、强制 `.md`、避免空名
   - 路径限制：仅允许文档目录内文件；拒绝 `..`、绝对路径、路径分隔符注入（防路径穿越）
3. 预加载脚本暴露安全 API（`contextBridge.exposeInMainWorld`）：
   - `window.writenow.files.*` 仅暴露上述白名单方法
4. 渲染进程类型声明：
   - 在 `src/writenow.d.ts`（或 `src/types/ipc.ts`）补齐 IPC API 类型
5. 在 UI/Store 层消费：
   - 文件列表：首次加载与刷新
   - 打开文件：读取内容并进入编辑器
   - 保存/删除/创建：成功后刷新列表并同步选中状态
6. 错误处理：
   - 对所有 IPC handler 做 try/catch，返回明确错误信息（渲染层展示可重试/提示）

## 新增/修改文件

- `electron/ipc/files.cjs` - IPC handlers（list/read/write/create/delete）
- `electron/main.cjs` - 注册 IPC handlers
- `electron/preload.cjs` - 暴露 `window.writenow.files` 安全 API
- `src/writenow.d.ts` - IPC 类型定义（或新增 `src/types/ipc.ts`）
- `src/stores/filesStore.ts` - 文件列表/创建/删除动作（调用 IPC）
- `src/stores/editorStore.ts` - 打开文件/保存动作（调用 IPC）

## 验收标准

- [ ] 文件列表可加载并展示（至少按时间排序）
- [ ] 创建文件可用：自动处理重名，生成合法 `.md` 文件并返回可读写的 `path`
- [ ] 读取/写入可用：内容真实落盘，重启应用后内容不丢失
- [ ] 删除可用：删除后列表更新，打开中的文件被删除时 UI 有明确反馈
- [ ] 路径安全：拒绝路径穿越与非 `.md` 文件访问

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 630-641 行（目录结构：`electron/ipc/files.cjs`）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 701-712 行（IPC 通道：file:list/read/write/create/delete）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 394-396 行（离线能力：编辑/保存/本地搜索）
