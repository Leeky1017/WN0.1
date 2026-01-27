# 任务 005: Zustand 状态管理（编辑器状态、文件列表）

## 目标

在渲染进程接入 Zustand 作为单一状态源，统一管理文件列表与编辑器状态：打开文件、编辑内容、脏状态、保存状态、最后保存时间、编辑模式（Markdown/富文本）等，确保 UI 与持久化逻辑可解耦、可验证。

## 依赖

- 任务 003：文件操作 IPC（文件列表/打开/保存需要 IPC 能力）
- （可并行）任务 001：TipTap 编辑器基础集成（通过 store 获取/提交内容）

## 实现步骤

1. 定义 store 边界（建议拆分为两个 store）：
   - `filesStore`：文件列表、加载状态、创建/删除、刷新
   - `editorStore`：当前打开文档、内容、脏状态、保存状态、编辑模式、打开/保存/关闭动作
2. 约定 store 的最小状态字段：
   - `files: DocumentFile[]`, `isLoading`, `error`
   - `currentPath`, `content`, `isDirty`, `saveStatus`, `lastSavedAt`, `editorMode`
3. 处理并发与竞态：
   - “切换文件时自动保存上一个文件”的行为需可控（保存失败不阻塞切换但要可感知）
   - 打开/保存请求用序列号或 Abort 机制避免旧请求覆盖新状态
4. 提供可复用的 IPC 调用封装：
   - `getFilesApi()` 等方法集中处理 `window.writenow` 不可用的错误
5. UI 接入：
   - 侧边栏文件列表组件读取 `filesStore`
   - 编辑器组件读取 `editorStore`（内容、保存状态、模式）
6. 错误呈现：
   - 文件操作/保存失败时在 UI 有可见提示，并保留重试路径

## 新增/修改文件

- `src/stores/filesStore.ts` - 文件列表 store
- `src/stores/editorStore.ts` - 编辑器 store
- `src/writenow.d.ts` - IPC API 类型（若需补充）
- `src/components/sidebar-views/FilesView.tsx` - 接入文件列表与创建/删除
- `src/components/Editor/index.tsx`（或 `src/components/Editor.tsx`）- 接入编辑器状态与动作

## 验收标准

- [ ] 文件列表可通过 store 加载、刷新、创建、删除，并在 UI 正确反映
- [ ] 打开文件后 `currentPath/content` 正确更新；切换文件不产生状态串扰
- [ ] 编辑内容后 `isDirty=true`，保存后 `isDirty=false` 且 `lastSavedAt` 更新
- [ ] `saveStatus` 可观测（`saving/saved/error`），并能驱动状态栏展示
- [ ] `editorMode` 在 store 中可控，并可供双模式任务使用

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 588 行（状态管理：Zustand）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 663-668 行（stores 目录结构：editorStore/filesStore/settingsStore 等）
