# WriteNow Code Standards

> 本文档定义 WriteNow 的代码级规范（目录结构、命名、组件设计、错误处理、状态管理、IPC 调用）。所有实现必须与 `AGENTS.md` 的“宪法级约束”一致；如有冲突，以 `AGENTS.md` 为准。

## 3.1 目录结构规范

### 顶层目录职责

- `electron/`：Electron 主进程与预加载脚本（IPC 处理、窗口生命周期、系统能力）
- `src/`：渲染进程（React + TS）源码（UI、状态、业务逻辑）
- `openspec/`：权威规格与交付日志（规范优先、可审计）
- `docs/`：项目文档与工程规范（本文档、测试规范等）
- `models/`：本地模型文件（如 embedding 模型）

### `src/` 目录放置规则（建议）

- `src/components/`：可复用 UI 组件与页面级组件
  - `src/components/ui/`：shadcn/ui 基础组件（保持与生成器一致）
- `src/stores/`：Zustand stores（应用级状态单一事实来源）
- `src/types/`：跨模块共享的核心类型（IPC、模型、编辑器、AI 等）
- `src/lib/`：纯工具/客户端封装（无 React 依赖，便于测试）
- `src/hooks/`：可复用的 React hooks（依赖 React 生命周期）
- `src/styles/`：全局样式与主题（Tailwind v4 + 主题变量）

### 新增文件规则

- 新文件必须先归类到正确目录；禁止“先塞进随便一个文件再说”
- 任何跨目录共享的类型必须进入 `src/types/`
- 任何可测试的纯逻辑优先放在 `src/lib/`（便于单元测试）

## 3.2 命名规范

### 文件命名

- 通用规则：`kebab-case`
- React 组件文件：`PascalCase.tsx`（与现有 `src/components/*.tsx` 保持一致）
- shadcn/ui：保持现状（多为 `kebab-case.tsx`）

### 代码命名

- 变量/函数：`camelCase`
- 常量：`UPPER_SNAKE_CASE`
- 类型/接口/枚举：`PascalCase`
- 接口前缀：本项目统一 **不使用** `I` 前缀（例如 `IUser`），直接使用 `User`（例如 `User`, `UserConfig`）

### 契约命名（IPC）

- IPC 通道：`domain:action`（必要时多段：`ai:skill:run`）
- 通道对应类型：`<Domain><Action>Request / <Domain><Action>Response`（见 `openspec/specs/api-contract/spec.md`）

## 3.3 组件设计规范

### 组件文件结构

- 组件文件中只导出一个主组件（必要时可导出 `type Props` / 辅助子组件）
- Props 类型定义放在组件同文件顶部，命名为 `<ComponentName>Props`
- 复杂组件拆分：优先拆出“纯展示子组件”与“有状态容器组件”

### Props 与状态

- Props 必须类型完备，禁止 `any`
- 局部状态（UI 交互）用 React state；跨组件/跨视图共享状态用 Zustand store
- 组件渲染路径不得包含副作用；副作用必须进入 `useEffect` 并可清理

### 样式规范（Tailwind）

- 样式优先使用 Tailwind class；组合 class 使用 `cn`（`src/components/ui/utils.ts`）
- 避免超长 class 串：可抽取为小组件或使用语义化变量（主题变量、CSS 变量）
- 暗色/亮色/自定义主题：仅通过主题变量驱动，禁止硬编码颜色散落在组件里

## 3.4 错误处理规范

### 原则

- 错误必须“可观测、可定位、可恢复（如适用）”
- 禁止 silent failure：吞掉异常但不记录/不反馈
- 错误信息必须面向用户与开发者分层：用户可读、开发者可诊断

### 错误类型

- IPC 错误：使用统一错误码与结构（见 `openspec/specs/api-contract/spec.md` 与 `src/types/ipc.ts`）
- 业务错误：使用稳定错误码（字符串 union），避免 `throw "xxx"` 这种不稳定形态

### 日志

- 主进程：写入 `userData/logs/main.log`（现有机制）
- 渲染进程：关键错误通过 IPC 上报（如 `app:renderer-error`），并在 UI 给出明确提示/重试入口（如适用）

## 3.5 状态管理规范（Zustand）

### Store 结构

- 单一 store 文件只负责一个领域（如 `filesStore`、`editorStore`）
- 统一字段：`isLoading` / `error` / `hasLoaded`（如适用），便于全局一致的加载/错误体验
- Actions 必须返回 `Promise`（异步）或同步返回值，并保证异常被捕获为可展示错误

### Selector 与性能

- 组件中优先使用 selector 选择最小必要状态，避免全量订阅导致重渲染
- 复杂派生数据使用 memo/selectors，不要在 render 中做重计算

## 3.6 IPC 调用规范

### 调用方式

- 渲染进程不得直接访问 Node API；必须通过 preload 暴露的 `window.writenow` 调用
- IPC 通道与类型必须先在 `openspec/specs/api-contract/spec.md` 与 `src/types/ipc.ts` 定义

### 错误处理

- IPC 返回值必须走统一 Envelope（`ok/data` 或 `ok/error`），并映射为 UI 可消费的错误信息
- 对用户可恢复的错误必须提供重试入口（如保存失败、网络超时）

### Loading 状态

- 发起 IPC 调用前设置 `isLoading=true`；完成后恢复
- 并发场景必须定义策略：覆盖、排队、或忽略（在 store 中明确实现）

### 类型安全

- 通道名必须使用 string union（而不是裸字符串散落各处）
- IPC payload/response 必须使用共享类型，禁止手写重复接口造成漂移

## 3.7 路径与存储规范

### 应用数据根目录

应用数据根目录 MUST 使用 `app.getPath('userData')`（由 Electron 提供、跨平台一致）：

- Windows: `%APPDATA%/WriteNow/`
- macOS: `~/Library/Application Support/WriteNow/`
- Linux: `~/.config/WriteNow/`

### 子目录结构

在 `userData/` 下 MUST 使用如下稳定子目录（不存在时由主进程创建）：

- `documents/`：用户文档（`.md` 文件）
- `data/`：数据库文件
- `snapshots/`：崩溃恢复快照
- `logs/`：日志文件
- `models/`：本地 AI 模型（如 embedding / GGUF）
- `cache/`：临时缓存

### 数据与配置

- 数据库文件 MUST 为：`data/writenow.db`
- 配置 MUST 存储于数据库 `settings` 表（禁止使用独立 JSON 配置文件，避免漂移与不可审计）
- API Key MUST 使用 Electron `safeStorage` 加密后再入库（见 `electron/lib/config.cjs`）

## 3.8 日志规范

### 日志级别

日志级别 MUST 为：`debug | info | warn | error`

### 日志格式

主进程日志格式 MUST 为：

`[ISO时间戳] [级别] [模块名] 消息 {可选JSON细节}`

示例：

`[2024-01-20T10:30:00.000Z] [INFO] [database] 初始化完成 {"schemaVersion":1}`

### 主进程日志

- 文件：`logs/main.log`（位于 `userData/logs/main.log`）
- 轮转：单文件 10MB、保留 5 个历史文件

### 渲染进程日志

- 开发模式：输出到 console
- 生产模式：关键错误 MUST 通过 IPC 上报到主进程，由主进程落盘（禁止仅 console）

### 日志模块接口

```ts
interface Logger {
  debug(module: string, message: string, details?: object): void
  info(module: string, message: string, details?: object): void
  warn(module: string, message: string, details?: object): void
  error(module: string, message: string, details?: object): void
}
```
