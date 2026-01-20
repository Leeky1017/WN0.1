# Proposal: issue-21-phase-0-5-infra

## Why
Phase 0.5 交付的是 Sprint 共享的“底座能力”（目录/日志/数据库/配置/IPC/测试）。目前主进程 IPC 返回值、文件通道实现、日志与配置缺少统一契约与可审计落盘证据，导致后续 Sprint 容易出现协议漂移、silent failure 与不可复现问题。

## What Changes
- 建立主进程侧基础设施：日志模块（含轮转）、数据库初始化（含 schema 版本号）、配置模块（settings 表 + safeStorage 加密）。
- 统一 IPC invoke 返回 Envelope，并在 preload 层对 invoke/send 通道做 allowlist。
- 渲染进程提供类型安全 IPC 客户端封装与错误工具，并为核心模块补齐 Vitest + Playwright E2E 测试底座。

## Impact
- Affected specs: `openspec/specs/api-contract/spec.md`, `openspec/specs/writenow-spec/spec.md`
- Affected code: `electron/main.cjs`, `electron/preload.cjs`, `electron/ipc/files.cjs`, `electron/database/*`, `electron/lib/*`, `src/lib/*`, `src/types/window.d.ts`
- Breaking change: YES（IPC `file:*` invoke 统一 Envelope；渲染侧改为 `window.writenow.invoke` 类型安全封装）
- User benefit: IPC/错误/日志/配置与存储路径统一，E2E 可证明“启动→创建→保存→落盘→数据库/日志初始化”真实用户路径可用。
