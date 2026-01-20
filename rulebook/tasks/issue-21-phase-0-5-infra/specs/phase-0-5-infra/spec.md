# Phase 0.5 Infra (Delta Spec)

## Purpose

在 Sprint 功能开发前完成主进程基础设施（目录/日志/数据库/配置/IPC 安全封装）与测试底座，保证后续迭代在统一契约与可审计证据下推进，避免“边写功能边补底座”导致的漂移与不可复现。

## Requirements

### Requirement: Main MUST create stable userData subdirs on boot

应用启动时 MUST 在 `app.getPath('userData')` 下创建固定子目录：`documents/ data/ snapshots/ logs/ models/ cache/`，以保证文件保存、数据库、崩溃恢复与日志落盘具备稳定位置。

#### Scenario: First boot creates directories
- **WHEN** 应用首次启动且 `userData` 目录不存在子目录
- **THEN** 主进程 MUST 创建上述全部子目录
- **AND THEN** 后续模块（文件/数据库/日志）不得自行选择其他根路径

### Requirement: Database MUST be initialized and schema versioned

主进程 MUST 使用 SQLite（better-sqlite3）在 `userData/data/writenow.db` 初始化数据库并创建 schema；并 MUST 在 `settings` 表维护 `schema_version` 以便审计与后续迁移。

#### Scenario: Schema tables exist after init
- **WHEN** 主进程初始化数据库
- **THEN** 必要表 MUST 存在（至少：`articles/articles_fts/article_snapshots/projects/characters/skills/user_memory/writing_stats/settings`）
- **AND THEN** Phase 0.5 扩展表 MUST 存在（`writing_constraints/terminology/forbidden_words`）

### Requirement: IPC invoke MUST use unified Envelope and typed channels

所有 `ipcMain.handle` invoke 通道 MUST 返回 Envelope：`{ ok: true, data }` 或 `{ ok: false, error }`，并遵循 `openspec/specs/api-contract/spec.md` 与 `src/types/ipc.ts` 的类型定义。

#### Scenario: Invoke failure is observable and diagnosable
- **WHEN** 任一 invoke 处理器抛出异常（参数非法/找不到/权限不足/IO）
- **THEN** 返回 MUST 为 `ok:false` 且 `error.code/message` 稳定可用
- **AND THEN** 主进程 MUST 记录结构化日志（含 channel + error code）

### Requirement: Preload MUST allowlist IPC channels

预加载脚本 MUST 只允许调用 allowlist 中的 invoke/send 通道，其他通道 MUST 被拒绝，以减少渲染进程可用攻击面并避免协议漂移。

#### Scenario: Non-allowlisted invoke is rejected
- **WHEN** 渲染进程尝试 `window.writenow.invoke` 调用不在 allowlist 的通道
- **THEN** preload MUST 抛出错误并拒绝透传到主进程

### Requirement: Logging MUST write to file with rotation

主进程日志 MUST 写入 `userData/logs/main.log`，并实现单文件 10MB、保留 5 个的轮转策略；开发模式允许同时输出到 console。

#### Scenario: Log file exists after launch
- **WHEN** 应用启动
- **THEN** `userData/logs/main.log` MUST 存在且可写入

### Requirement: Config MUST support secure API key storage

配置 MUST 存储于数据库 `settings` 表；敏感配置（如 `ai.apiKey`） MUST 使用 Electron `safeStorage` 加密后再入库。

#### Scenario: Non-secure config roundtrip
- **WHEN** 设置任意普通配置项（如 `theme`）
- **THEN** 读取 SHOULD 返回同值且类型稳定（JSON 序列化）

