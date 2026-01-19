# Codex Sprint 1 任务: 可用的编辑器

---

## 任务背景

Sprint 1 是 WriteNow 的第一个功能实现阶段,目标是交付一个可日常使用的本地编辑器。这是所有后续功能 (AI、RAG、云服务) 的基础,必须高质量完成。

阶段 0 已完成以下基础设施:
- IPC 契约规范 (所有通道的请求/响应类型已定义)
- 代码规范文档
- 测试规范文档
- 核心类型定义 (src/types/)

本任务基于这些规范进行实现。

---

## 必读文档 (执行前必须阅读)

### 规范文档
- `openspec/specs/sprint-1-editor/spec.md` - Sprint 1 详细规范 (Purpose/Requirements/Scenario)
- `openspec/specs/api-contract/spec.md` - IPC 契约规范 (通道定义、Envelope、错误码)
- `docs/code-standards.md` - 代码规范
- `docs/testing-standards.md` - 测试规范
- `AGENTS.md` - 宪法级约束

### 类型定义
- `src/types/ipc.ts` - IPC 类型
- `src/types/editor.ts` - 编辑器类型
- `src/types/models.ts` - 数据模型类型

### 核心规范参考
- `openspec/specs/writenow-spec/spec.md` 第 405-434 行 (TipTap + 双模式)
- `openspec/specs/writenow-spec/spec.md` 第 496-513 行 (自动保存)
- `openspec/specs/writenow-spec/spec.md` 第 630-713 行 (目录结构 + IPC)

---

## 宪法级约束 (必须遵守)

1. 代码必须同时"正确"和"好" (可读、可维护、可测试、风格一致)
2. 禁止 any 类型
3. 全项目命名/结构/错误处理统一
4. 所有功能必须有 E2E 测试
5. 用户路径优先, 100% 功能覆盖
6. 每个节点做极限/边界测试
7. 禁止使用假数据测试
8. 禁止"假装"测试

---

## 任务分解

### 任务 1: 实现文件操作 IPC (主进程)

**目标**: 实现 file:list/read/write/create/delete 五个 IPC 通道

**创建/修改文件**:
- `electron/ipc/files.cjs` (新建)

**实现要求**:
- 请求/响应必须符合 api-contract 定义的 Envelope 格式
- 错误必须映射为标准错误码 (INVALID_ARGUMENT, NOT_FOUND, IO_ERROR 等)
- 路径必须限制在文档目录内, 禁止路径穿越
- 文件名必须清洗 Windows 不合法字符

**参考 api-contract 通道定义**:
- FileListRequest/Response (第 178-193 行)
- FileReadRequest/Response (第 203-217 行)
- FileWriteRequest/Response (第 223-238 行)
- FileCreateRequest/Response (第 244-259 行)
- FileDeleteRequest/Response (第 265-278 行)

**测试要求**:
- 正常路径: 创建/读取/写入/删除成功
- 边界条件: 空文件名、超长文件名、特殊字符、emoji
- 错误路径: 文件不存在、路径穿越尝试、磁盘权限不足

---

### 任务 2: 实现 Zustand 状态管理

**目标**: 创建 filesStore 和 editorStore

**创建/修改文件**:
- `src/stores/filesStore.ts` (新建)
- `src/stores/editorStore.ts` (新建)

**filesStore 职责**:
- 文件列表加载状态 (isLoading, error, hasLoaded)
- 文件列表数据 (items: DocumentFileListItem[])
- Actions: loadFiles, createFile, deleteFile, refreshFiles

**editorStore 职责**:
- 当前打开文档 (currentFile: { path, content, name })
- 编辑状态 (isDirty, isSaving, lastSavedAt)
- 编辑模式 (mode: 'markdown' | 'richtext')
- Actions: openFile, saveFile, updateContent, switchMode

**参考类型定义**:
- `src/types/ipc.ts` - DocumentFileListItem, FileReadResponse
- `src/types/editor.ts` - EditorState, EditorMode

**测试要求**:
- Store actions 正确调用 IPC
- 状态在成功/失败时正确更新
- 并发操作处理 (快速切换文件)

---

### 任务 3: 集成 TipTap 编辑器

**目标**: 用 TipTap 替换当前占位编辑器

**创建/修改文件**:
- `src/components/Editor/index.tsx` (新建/重写)
- `src/components/Editor/extensions/` (新建目录)
- `src/components/Editor/Toolbar.tsx` (新建)

**实现要求**:
- 安装 TipTap 依赖: @tiptap/react, @tiptap/pm, @tiptap/starter-kit
- 支持基础富文本: 标题(1-3级)、加粗、斜体、无序/有序列表
- 编辑器内容与 editorStore.currentFile.content 双向同步
- 内容变化时设置 isDirty = true

**参考规范**:
- Sprint 1 spec 第 11-22 行 (TipTap 要求)
- 代码规范 3.3 节 (组件设计规范)

**测试要求**:
- 编辑器加载并可输入
- 富文本功能正常 (加粗、标题等)
- 内容变化触发状态更新

---

### 任务 4: 实现双模式编辑

**目标**: 支持 Markdown 与富文本模式切换

**创建/修改文件**:
- `src/components/Editor/index.tsx` (扩展)
- `src/lib/markdown-converter.ts` (新建, 如需要)

**实现要求**:
- 切换按钮在工具栏
- 切换时内容保持一致 (同一底层数据)
- 默认模式可配置 (代码层支持, 本 Sprint 可硬编码默认值)

**参考规范**:
- Sprint 1 spec 第 25-36 行 (双模式要求)

**测试要求**:
- 模式切换功能可用
- 切换后内容不丢失
- 边界: 复杂格式切换

---

### 任务 5: 实现自动保存 + 崩溃恢复

**目标**: 2秒防抖自动保存, 快捷键手动保存, 崩溃恢复

**创建/修改文件**:
- `src/hooks/useAutoSave.ts` (新建)
- `src/stores/editorStore.ts` (扩展)
- `electron/ipc/recovery.cjs` (新建, 如需要)

**自动保存要求**:
- 用户停止输入 >= 2秒后触发保存
- 保存状态实时展示: "已保存"(绿点), "保存中..."(转圈), "未保存"(黄点)
- Ctrl/Cmd+S 立即保存 (忽略防抖)

**崩溃恢复要求**:
- 定时快照 (每 5 分钟)
- 启动时检测"未正常关闭"标志
- 提示用户恢复最近快照

**参考规范**:
- Sprint 1 spec 第 63-80 行 (自动保存 + 崩溃恢复)
- 核心规范第 497-512 行

**测试要求**:
- 2秒防抖正常触发
- 快捷键立即保存
- 保存成功/失败状态正确
- 崩溃恢复流程完整

---

### 任务 6: 更新 preload 暴露 IPC 接口

**目标**: 更新 preload.cjs 暴露 window.writenow.invoke

**创建/修改文件**:
- `electron/preload.cjs` (更新)

**实现要求**:
- 暴露 invoke 方法: `window.writenow.invoke(channel, payload)`
- 类型安全 (渲染进程通过 src/lib/ipc.ts 调用)

---

### 任务 7: 创建 IPC 客户端封装

**目标**: 提供类型安全的 IPC 调用封装

**创建/修改文件**:
- `src/lib/ipc.ts` (新建)

**实现要求**:
- 封装 window.writenow.invoke
- 返回类型与 IpcInvokeResponseMap 对齐
- 统一处理 Envelope (ok 分支与 error 分支)

---

## E2E 测试要求

### 必须覆盖的用户路径

1. 创建新文档 -> 输入内容 -> 自动保存 -> 关闭 -> 重新打开 -> 内容保留
2. 打开已有文档 -> 编辑 -> 手动保存 (Ctrl+S) -> 内容更新
3. 删除文档 -> 文件列表刷新 -> 文档不存在
4. Markdown 模式 -> 切换到富文本 -> 内容一致 -> 切换回 Markdown
5. 编辑中强制关闭 -> 重启 -> 崩溃恢复提示 -> 恢复内容

### 边界测试

- 空文件名创建
- 超长文件名 (255字符)
- 文件名含特殊字符: `<>:"/\|?*`
- 超大文件内容 (1MB+)
- 快速连续保存 (测试防抖)
- 网络断开时保存 (本地操作应正常)

---

## 输出清单

完成后应存在以下文件:

```
electron/ipc/files.cjs              (新建)
electron/preload.cjs                (更新)
src/stores/filesStore.ts            (新建)
src/stores/editorStore.ts           (新建)
src/components/Editor/index.tsx     (新建/重写)
src/components/Editor/Toolbar.tsx   (新建)
src/components/Editor/extensions/   (新建目录)
src/hooks/useAutoSave.ts            (新建)
src/lib/ipc.ts                      (新建)
tests/e2e/editor.spec.ts            (新建, E2E 测试)
tests/e2e/file-operations.spec.ts   (新建, E2E 测试)
```

---

## 验收标准

- [ ] file:list/read/write/create/delete IPC 通道实现且符合契约
- [ ] Envelope 格式正确 (ok/data 或 ok/error)
- [ ] 错误码映射正确
- [ ] filesStore 和 editorStore 功能完整
- [ ] TipTap 编辑器可用且支持基础富文本
- [ ] 双模式切换可用且内容一致
- [ ] 自动保存 (2秒防抖) 功能正常
- [ ] 手动保存 (Ctrl/Cmd+S) 功能正常
- [ ] 保存状态展示正确
- [ ] 崩溃恢复流程完整
- [ ] 所有 E2E 测试通过
- [ ] 边界测试覆盖完整
- [ ] 无 any 类型
- [ ] 代码风格符合规范

---

## 执行顺序建议

1. 先完成任务 6, 7 (preload + IPC 客户端) - 基础通信
2. 再完成任务 1 (文件操作 IPC) - 后端能力
3. 然后任务 2 (Zustand stores) - 前端状态
4. 接着任务 3, 4 (TipTap + 双模式) - UI 交互
5. 最后任务 5 (自动保存 + 崩溃恢复) - 增强功能
6. 全程编写对应测试, 最后补齐 E2E 测试
