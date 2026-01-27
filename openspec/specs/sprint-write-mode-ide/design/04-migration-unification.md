# 04 - 单链路迁移与统一（删旧保新，不向后兼容）

> 本文把“不要向后兼容”变成可执行规则：哪些地方现在存在双路径/假实现/重复实现，以及如何统一。

---

## 1. 单链路原则（可执行定义）

一个用户能力只能有：
- 1 个入口（UI / command / hotkey）
- 1 个状态机（store / reducer）
- 1 个持久化来源（DB/file）

出现双栈时必须做 3 件事：
1) 选定“更优实现”作为唯一入口
2) 把旧入口移除（或显式降级为 dev-only）
3) 在同一个 PR 内完成清理，或写明 remove-by

---

## 2. WN 当前最重要的“统一点”（具体到文件）

### 2.1 编辑器：`Editor.tsx` demo vs `TipTapEditor.tsx` 真实编辑器

- 现状：
  - `writenow-frontend/src/components/editor/Editor.tsx` 为 contentEditable demo（含假内容、假保存状态）
  - `writenow-frontend/src/components/editor/TipTapEditor.tsx` 已具备可用 TipTap + Markdown 序列化
- 决策：Write Mode MUST 使用 TipTapEditor；demo Editor MUST 删除或迁移到 storybook/visual test（不能在主路径）

**统一动作**
- AppShell 中央画布从 `<Editor />` 替换为 `<TipTapEditor ... />`
- 写作主路径的 testid 统一使用 `data-testid="tiptap-editor"`（现有 TipTapEditor 已提供）

### 2.2 AI Panel：`components/ai-panel/AIPanel.tsx` demo vs `features/ai-panel/useAISkill.ts` 真实逻辑

- 现状：
  - `components/ai-panel/AIPanel.tsx` 是视觉 demo（静态对话、复制按钮）
  - `features/ai-panel/useAISkill.ts` 已实现技能列表、streaming、cancel、diff 计算
- 决策：AI Panel UI MUST 由真实 store + hook 驱动；demo AIPanel MUST 删除

**统一动作**
- 新建 `writenow-frontend/src/features/ai-panel/AIPanel.tsx`（presentational + connects hooks）
- 删除旧 `components/ai-panel/AIPanel.tsx`
- AppShell 引用切换到 features AIPanel

### 2.3 文件树/命令面板：AppShell stub vs `features/*` 真实数据

- 现状：
  - `components/layout/AppShell.tsx` 文件树/搜索/历史为静态数据（`FileItem` 数组 hardcode）
  - 真实文件树逻辑已存在：`features/file-tree/useFileTree.ts`（`file:list/create/delete/rename`）
  - 命令面板 store + 数据已存在：`stores/commandPaletteStore.ts` + `features/command-palette/useCommands.ts`
- 决策：Write Mode 的 Explorer / Command Palette MUST 使用真实数据；stub 仅允许存在于 dev-only 演示页

**统一动作**
- AppShell 的 Explorer 区域改为渲染基于 `useFileTree()` 的 tree（或抽到 `features/file-tree/FileTreePanel.tsx`）
- 新增 `features/command-palette/CommandPalette.tsx`（UI）并接入 `useCommandPaletteStore` + `useCommands`

### 2.4 连接层统一：保留多 endpoint，但统一“连接基类/状态语义”

- 现状：
  - `writenow-frontend/src/lib/rpc/client.ts`：连接 `/standalone-rpc`，用于 `invoke('file:*', ...)`（返回 `IpcResponse<T>`）
  - `writenow-frontend/src/lib/rpc/jsonrpc-client.ts`：连接 `/services/writenow/*`，用于 AI/Skills 等服务（streaming/notifications）
- 事实：两个 endpoint 的存在在当前架构下是合理的（能力暴露方式不同）
- 风险：**重连策略、状态枚举、错误处理** 两套逻辑会逐步漂移，导致诊断与 UI 状态不一致
- 决策：必须统一到 **同一套连接基类/退避策略/状态枚举**，并在 UI 只暴露一种“连接状态语义”

**统一动作**
- 抽出 `WebSocketBackoffConnection`（或等价）作为 shared base（支持：指数退避、max attempts、status listeners）
- `rpcClient` 与 `JsonRpcWebSocketClient` 都基于该 base（保留各自的 API：`invoke` vs `sendRequest/onNotification`）
- UI（status bar）只认一种 `connected/disconnected/error` 语义，并附带可诊断信息（例如 endpoint 名称）

### 2.5 Layout 状态：`AppShell` local state vs `stores/layoutStore.ts`

- 现状：AppShell 自己维护 `isAiPanelOpen/isSidebarOpen`；同时存在 `useLayoutStore`
- 决策：布局状态必须由 store 统一管理（可持久化、可 E2E 稳定）

**统一动作**
- AppShell 改用 `useLayoutStore` 作为唯一来源
- 删除重复 state，避免“看起来同一个按钮，实际两套状态机”

### 2.6 Save/Dirty 状态贯穿：store 已存在，但 UI 仍是 stub

- 现状：
  - `stores/statusBarStore.ts` / `stores/editorFilesStore.ts` 已定义 `saveStatus`/dirty
  - 但 `Header` 仍由 `AppShell` 写死 `isSaved={true}`（见 `components/layout/AppShell.tsx`）
- 决策：保存状态必须贯穿 UI（Header/StatusBar/FileTree modified dot），并写入 E2E

**统一动作**
- 删除 `Header` 的 `isSaved` stub prop，改为直接读取 store（或由上层容器注入真实状态）
- 文件树 `FileItem` 的 modified dot 必须绑定 `editorFilesStore.getDirty(path)`

### 2.7 IPC 契约生成存在“第三份副本”（漂移风险）

- 现状：
  - 契约 SSOT：`electron/ipc/contract/ipc-contract.cjs` + `electron/ipc/*.cjs`
  - 生成目标（已在脚本中强制校验）：`src/types/ipc-generated.ts`、`writenow-theia/writenow-core/src/common/ipc-generated.ts`（见 `scripts/ipc-contract-sync.js`）
  - 但 `writenow-frontend/` 另有一份：`writenow-frontend/src/types/ipc-generated.ts`
- 风险：前端类型与 SSOT 漂移会直接导致：
  - RPC payload/data 类型不一致（运行时错但 TS 不报）
  - 错误码/通道列表不一致（排障困难）

**统一动作（必须二选一）**
1) 删除 `writenow-frontend/src/types/ipc-generated.ts`，改为从根目录 `src/types/ipc-generated.ts` 导入（推荐：单一 SSOT）
2) 或扩展 `scripts/ipc-contract-sync.js`，将同一份生成结果同步到 `writenow-frontend/src/types/ipc-generated.ts`（仍需保证只有一个生成源）

原则：**任何时候只能有一份生成源**，其余都是产物（CI 必须能检测漂移）。

### 2.8 AI Provider 配置：UI 声称 OpenAI/Claude，但后端可能只支持 Anthropic

- 风险：用户选择 OpenAI 后不可用，会损害信任
- 决策：UI 暴露的 provider MUST 与实际可用实现一致

**统一动作（策略）**
- 若 OpenAI 未实现：UI 不显示或标注“未启用”且有明确提示
- 若要实现：以 `sprint-open-source-opt` 的 Prompt Caching 与统一策略为准，落地后再开放

---

## 3. 迁移策略（低成本版本）

### 3.1 先接通真实数据，再做 UI polish

- Day 1：把 demo UI 接上真实 store/hook，保证主路径可用
- Day 2：补齐 E2E
- Day 3：做性能与体验优化

### 3.2 删除策略（防止“以后再删”）

- 任何替换必须在同一个 PR 删除旧入口
- 如果确需过渡：必须在 task card 写 remove-by PR/日期，并在 CI 加 guard（例如禁止引用旧组件路径）

### 3.3 Guard（防止 stub 回流）

最小成本的 guard：

- 在 CI 中增加一个 `rg` 检查（或 eslint rule）：
  - 禁止主路径 import：
    - `components/editor/Editor.tsx`
    - `components/ai-panel/AIPanel.tsx`
  - 禁止 `AppShell` 渲染硬编码的 `FileItem` 列表（必须来自 `useFileTree()`）

Why：这能把“以后又不小心用回 demo”的风险变成 CI 失败，而不是上线事故。

---

## 4. 契约与数据一致性（必须）

- IPC/JSON-RPC 的返回必须是 `IpcResponse<T>`（ok/data vs ok/error）
- 错误码必须使用稳定枚举（`TIMEOUT`/`CANCELED`/`UPSTREAM_ERROR`/`IO_ERROR` 等）
- 任何新通道必须先更新契约源并生成 `ipc-generated.ts`

---

## 5. 统一完成的验收

- demo/stub 文件不再被主路径 import（可通过 lint/rg guard）
- E2E 只依赖真实 UI 与真实持久化
- 所有关键入口只有一条路径（命令/快捷键/按钮）
