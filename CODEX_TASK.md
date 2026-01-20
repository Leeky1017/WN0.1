# Codex Sprint 1 启动指南

## 任务来源

- 规范: `openspec/specs/sprint-1-editor/spec.md`
- 任务卡: `openspec/specs/sprint-1-editor/tasks/`

请先阅读上述规范和任务卡, 按任务卡顺序执行。

---

## 依赖与前置条件

- Phase 0.5 基础设施已完成 (PR #25)
- 数据库、日志、配置、IPC 客户端已就绪

---

## P0.5 已提供的能力 (直接使用, 不要重复创建)

| 能力 | 模块 | 用法 |
|------|------|------|
| IPC 客户端 | `src/lib/ipc.ts` | `import { invoke, fileOps } from '../lib/ipc'` |
| 错误处理 | `src/lib/errors.ts` | `import { toUserMessage } from '../lib/errors'` |
| 日志 | `src/lib/logger.ts` | `import { logger } from '../lib/logger'` |
| 配置 | `electron/lib/config.cjs` | `const config = require('./lib/config.cjs')` |
| 数据库 | `electron/database/init.cjs` | 已在 main.cjs 初始化 |
| Preload | `electron/preload.cjs` | 已配置通道白名单 |

---

## 必读文档

- `AGENTS.md` - 宪法级约束
- `openspec/specs/api-contract/spec.md` - IPC 契约
- `docs/code-standards.md` - 代码规范 (含 3.7 路径, 3.8 日志)
- `docs/testing-standards.md` - 测试规范

---

## 关键提示

1. `file:*` IPC 处理器在 `electron/ipc/files.cjs`, 需要补充完整实现
2. 文档目录: `userData/documents/`
3. 快照目录: `userData/snapshots/`
4. 使用 `fileOps.list()` 等便捷方法, 不要直接调用 `window.writenow.invoke`

---

## 验收标准

见 `openspec/specs/sprint-1-editor/spec.md` 中的 Requirements/Scenario

额外要求:
- 使用 P0.5 提供的模块
- 所有测试通过
- 无 any 类型
