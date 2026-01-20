# Codex Sprint 3 启动指南 (可与 Sprint 1 并行)

## 任务来源

- 规范: `openspec/specs/sprint-3-rag/spec.md`
- 任务卡: `openspec/specs/sprint-3-rag/tasks/`

请先阅读上述规范和任务卡, 按任务卡顺序执行。

---

## 依赖与前置条件

- Phase 0.5 基础设施已完成
- 不依赖 Sprint 1 编辑器, 可并行执行

---

## P0.5 已提供的能力

| 能力 | 模块 | 说明 |
|------|------|------|
| 数据库 | `electron/database/init.cjs` | articles_fts 表已创建 |
| 日志 | `electron/lib/logger.cjs` | 用于记录模型加载/搜索日志 |
| 配置 | `electron/lib/config.cjs` | 可存储 Embedding 模型配置 |
| IPC 框架 | `electron/main.cjs` | createInvokeHandler 已就绪 |

---

## 必读文档

- `AGENTS.md` - 宪法级约束
- `openspec/specs/api-contract/spec.md` 第 335-440 行 (search:*, embedding:*)
- `openspec/specs/writenow-spec/spec.md` 第 172-248 行 (语义搜索 + RAG)

---

## 关键提示

1. Embedding 模型目录: `userData/models/`
2. 使用 transformers.js (@xenova/transformers) 或 onnxruntime-node
3. sqlite-vec 需要加载为 SQLite 扩展
4. 搜索结果使用 Paginated 结构

---

## 验收标准

见 `openspec/specs/sprint-3-rag/spec.md` 中的 Requirements/Scenario
