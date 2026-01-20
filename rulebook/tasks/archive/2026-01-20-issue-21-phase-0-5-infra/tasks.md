## 1. Implementation
- [ ] 1.1 Window API 类型声明（`src/types/window.d.ts` + tsconfig）
- [ ] 1.2 路径与存储规范更新（`docs/code-standards.md` 3.7）
- [ ] 1.3 日志规范更新（`docs/code-standards.md` 3.8）
- [ ] 1.4 数据库初始化（`electron/database/schema.sql` + `electron/database/init.cjs`）
- [ ] 1.5 主进程日志模块（`electron/lib/logger.cjs`，含轮转）
- [ ] 1.6 配置管理（`electron/lib/config.cjs`，settings 表 + safeStorage 加密）
- [ ] 1.7 IPC invoke Envelope 统一封装（主进程 handle wrapper）
- [ ] 1.8 Preload allowlist + `window.writenow` 暴露（`electron/preload.cjs`）
- [ ] 1.9 IPC 客户端封装（`src/lib/ipc.ts`）
- [ ] 1.10 错误工具（`src/lib/errors.ts`）
- [ ] 1.11 渲染进程日志（`src/lib/logger.ts`，生产仅上报 error）
- [ ] 1.12 模型下载配置（`electron/lib/model-config.cjs`）
- [ ] 1.13 数据库扩展：约束/术语/禁用词表（schema + core spec 对齐）

## 2. Testing
- [ ] 2.1 Vitest 配置 + 单元测试（errors/ipc/logger）
- [ ] 2.2 Playwright 配置 + Electron E2E（启动→创建→保存→落盘→验证 db/log）
- [ ] 2.3 边界覆盖：非法 path / 非法模板 / 非法 scope 需返回稳定错误码（通过单测或 E2E 证明）

## 3. Documentation
- [ ] 3.1 更新工程规范文档（路径/日志）
- [ ] 3.2 记录运行证据（`openspec/_ops/task_runs/ISSUE-21.md`）
