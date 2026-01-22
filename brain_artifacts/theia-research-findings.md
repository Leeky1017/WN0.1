# Theia Research Findings（brain artifacts）

> 本文为调研记录（非 OpenSpec 权威规范），用于支撑 `openspec/specs/sprint-theia-migration/` 的决策与任务拆解。

## 1) Theia 是什么（对 WriteNow 有用的点）

- **定位**：Eclipse Theia 是用于构建定制 IDE 的框架（可组装模块、可扩展、可裁剪），适合“精简但可靠”的产品路线。
- **运行形态**：典型形态为 frontend（Browser/Electron）+ backend（Node）双进程/双端，通过 JSON-RPC 通信；天然适合把“编辑器 UI”与“本地数据/索引/模型”分层。
- **扩展机制**：通过 extension（frontend contribution / backend contribution）注入命令、快捷键、widget、服务等能力；比从零自建 UI 框架更可控。

## 2) Theia 核心架构（迁移要对齐的概念）

- **Shell / Widget**：应用布局由 shell 承载，功能面板以 widget 形式挂载（适合迁移 AI 面板、版本历史、知识图谱等）。
- **Command / Keybinding**：全局命令与快捷键注册体系；迁移 TipTap 时需要建立“分层路由”避免冲突。
- **Workspace / FileSystem**：Theia 默认以 workspace 为核心语义（file explorer、watcher、fs API 都围绕 workspace root），与 WriteNow 现状（userData-first）存在结构性差异 → 必须 PoC 决策。
- **JSON-RPC**：frontend ↔ backend 的主通信机制，可承载 request/response，也可用于通知与流式事件（适配现有 IPC + streaming）。

## 3) 推荐的最小落地方案（面向 Sprint）

### 3.1 Scaffold

- 使用 `generator-theia-extension` 初始化最小可运行壳体（frontend + backend）。
- 迁移期只保留必要模块：shell/layout、filesystem/workspace、commands/keybindings、preferences/storage。
- 目标：最快达到 “启动 → 打开 `.md` → 编辑 → 保存” 的闭环，再逐步接 AI/RAG/历史版本。

### 3.2 TipTap 集成（custom editor widget）

- 在 Theia 中实现自定义 editor widget 打开 `.md` 文件。
- 关键验证点：IME、焦点切换、Save/Dirty 生命周期、快捷键冲突（Save/Undo/Redo/Cmd+K）。
- 设计原则：Markdown 作为 SSOT，TipTap 作为视图层，禁止双源内容。

### 3.3 Backend native（SQLite/vec/Embedding）

Theia backend 仍是 Node，因此理论上可复用现有 `better-sqlite3` / `sqlite-vec` / embedding worker 逻辑；真正风险在：

- native 模块能否在目标平台（Windows 首要）稳定安装与打包；
- sqlite 扩展加载路径与发布产物的可控性；
- embedding 的 ONNX 资产与 CPU 特性兼容性（需要明确“可用边界 + 降级策略”）。

## 4) 迁移风险清单（按优先级）

1) **存储语义**：userData-first vs workspace-first（影响 file explorer / watcher / E2E / 概念模型）。
2) **快捷键与焦点**：Theia 全局 keybinding 与 ProseMirror keymap 的冲突治理。
3) **native 分发**：better-sqlite3 / sqlite-vec /（潜在）node-llama-cpp。
4) **流式事件**：现有 streaming 事件流迁移到 Theia JSON-RPC notifications 的工程化设计。

## 5) 调研结论（供决策）

- Theia 更像“可裁剪的 IDE 框架”而不是 “UI 库”：迁移收益来自工程与架构基座，而非单纯重写界面。
- 对 WriteNow 而言，先把 **编辑器 + 本地数据层 + RPC 契约** 三件事跑通，就能建立可持续迭代的框架；其他能力可以 widget 化迁移。

